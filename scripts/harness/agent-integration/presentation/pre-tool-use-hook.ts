/**
 * @layer presentation
 * @unit agent-integration
 * @work-item-id WI-202 / WI-204
 * @work-item-id WI-206
 * @work-item-id WI-208
 * @work-item-id WI-345
 * @work-item-id WI-347
 * @work-item-id WI-376
 * @work-item-id WI-384
 * @work-item-id WI-385
 * @work-item-id WI-386
 *
 * PreToolUse Hook Adapter
 * Claude Code の PreToolUse Hook エントリポイント
 * stdin からJSON を読み取り、HandlePreToolUseUseCase を呼び出す
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createQuickModeCompositionRoot } from "../../quick-mode/composition-root.js";
import type {
  CanonicalPreToolUseInput,
  HookResponseProfile,
} from "../application/dto/normalized-pre-tool-use-request.js";
import { HandlePreToolUseUseCase } from "../application/usecases/handle-pre-tool-use-usecase.js";
import { ApplyPatchWriteTargetExtractor } from "../domain/services/apply-patch-write-target-extractor.js";
import { BashWriteTargetExtractor } from "../domain/services/bash-write-target-extractor.js";
import { CiGovernanceBaselineGrandfatherAdapter } from "../infrastructure/adapters/ci-governance-baseline-grandfather-adapter.js";
import { FileSystemFullModeSessionQueryAdapter } from "../infrastructure/adapters/file-system-full-mode-session-query-adapter.js";
import { FileSystemStoryReflectionQueryAdapter } from "../infrastructure/adapters/file-system-story-reflection-query-adapter.js";
import { HarnessConfigConfigQueryAdapter } from "../infrastructure/adapters/harness-config-config-query-adapter.js";
import { HarnessErrorGuidanceAdapter } from "../infrastructure/adapters/harness-error-guidance-adapter.js";
import { PhaseGateQueryAdapter } from "../infrastructure/adapters/phase-gate-query-adapter.js";
import { QuickModeFullModeRequirementAdapter } from "../infrastructure/adapters/quick-mode-full-mode-requirement-adapter.js";
import { PreToolUsePayloadNormalizer } from "./pre-tool-use-payload-normalizer.js";
import { PreToolUseResponseRenderer } from "./pre-tool-use-response-renderer.js";

/**
 * WI-376 (ADR-039): 呼び出し元 skill 名を受け取るフィールド（caller_skill）は持たない。
 * Claude Code の PreToolUse payload に skill 情報は無く、エージェントの自己申告値は
 * authorization / guidance の入力にしない。未知キーが来ても単に無視される。
 */
interface PreToolUseHookInput {
  cwd?: string;
  tool_name: string;
  tool_input: CanonicalPreToolUseInput;
}

interface TargetChange {
  filePath: string;
  changeKind?: "CREATE" | "MODIFY" | "DELETE";
  beforeContent?: string | null;
  afterContent?: string | null;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function findConfigPath(startDir: string): Promise<string> {
  let dir = startDir;
  while (true) {
    const candidates = [
      path.join(dir, "phasegate.config.json"),
      path.join(dir, ".phasegate-local", "phasegate.config.json"),
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(startDir, "phasegate.config.json");
}

function projectRootForConfig(configPath: string): string {
  const configDir = path.dirname(configPath);
  return path.basename(configDir) === ".phasegate-local" ? path.dirname(configDir) : configDir;
}

function isProjectExternalPath(filePath: string, cwd: string, projectRoot: string): boolean {
  const resolvedPath = path.resolve(cwd, filePath);
  const relativePath = path.relative(projectRoot, resolvedPath);
  return relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath);
}

function normalizeProjectPath(filePath: string, cwd: string, projectRoot: string): string {
  return path.relative(projectRoot, path.resolve(cwd, filePath)).split(path.sep).join("/");
}

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await readStdin();
  } catch {
    process.stderr.write("stdin読み取りエラー\n");
    process.exit(2);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    process.stderr.write(`不正なJSONです: ${raw}\n`);
    process.exit(2);
  }

  const normalizer = new PreToolUsePayloadNormalizer();
  const normalized = normalizer.normalize(parsed);
  if (!normalized.ok) {
    if (normalized.responseProfile === undefined) {
      process.stderr.write(`${normalized.reason}\n`);
      process.exit(2);
    }
    exitWithRenderedResponse(new PreToolUseResponseRenderer().deny(normalized.responseProfile, normalized.reason));
  }
  const request = normalized.request;
  const responseProfile = request.responseProfile;
  const input: PreToolUseHookInput = {
    cwd: request.cwd,
    tool_name: request.toolName,
    tool_input: request.toolInput,
  };
  const toolName = input.tool_name;

  const cwd = path.resolve(input.cwd ?? process.cwd());
  const toRelative = (p: string): string => {
    if (path.isAbsolute(p)) {
      const rel = path.relative(cwd, p);
      return rel.startsWith("..") ? p : rel;
    }
    return p;
  };

  const targetFilePaths: string[] = [];
  if (input.tool_input?.file_path) {
    targetFilePaths.push(toRelative(input.tool_input.file_path));
  }
  if (input.tool_input?.path) {
    targetFilePaths.push(toRelative(input.tool_input.path));
  }
  if (input.tool_input?.paths) {
    targetFilePaths.push(...input.tool_input.paths.map(toRelative));
  }

  const targetChanges = await buildTargetChanges(input, cwd, toRelative);

  // Bash 経由書き込みのフェーズゲート対応 (A-2.5)
  // Bash command 文字列からリダイレクト・tee・sed -i・cp・mv・touch 等の
  // 書き込み先ファイルパスを抽出し、フェーズゲートチェック対象に含める。
  // Bash 書き込みを検出した場合、effectiveToolName を 'Write' に偽装して
  // translator の WRITE_TOOLS チェックを通過させる（Bash のままではフェーズゲートが
  // スキップされるため）。
  let effectiveToolName = toolName;
  if (toolName === "apply_patch") {
    const command = input.tool_input?.command;
    if (typeof command !== "string" || command.length === 0) {
      deny(responseProfile, "apply_patch の tool_input.command が必要です");
    }
    const extractor = new ApplyPatchWriteTargetExtractor();
    const patchTargets = extractor.extract(command);
    if (patchTargets.length === 0) {
      deny(responseProfile, "apply_patch command から書き込み対象を抽出できませんでした");
    }
    targetFilePaths.push(...patchTargets.map((target) => toRelative(target.filePath)));
    targetChanges.push(
      ...patchTargets.map((target) => ({
        filePath: toRelative(target.filePath),
        changeKind: target.changeKind,
      })),
    );
    effectiveToolName = "Write";
  }
  if (toolName === "Bash" && typeof input.tool_input?.command === "string") {
    const extractor = new BashWriteTargetExtractor();
    const bashTargets = extractor.extract(input.tool_input.command);
    if (bashTargets.length > 0) {
      targetFilePaths.push(...bashTargets.map(toRelative));
      const recordedTargetPaths = new Set(targetChanges.map((change) => change.filePath));
      const bashTargetChanges = await Promise.all(
        bashTargets.map((bashTarget) => buildBashTargetChange(cwd, bashTarget, toRelative)),
      );
      for (const change of bashTargetChanges) {
        if (!recordedTargetPaths.has(change.filePath)) {
          targetChanges.push(change);
          recordedTargetPaths.add(change.filePath);
        }
      }
      effectiveToolName = "Write";
    }
  }

  try {
    const configPath = await findConfigPath(cwd);
    const projectRoot = projectRootForConfig(configPath);
    const projectTargetFilePaths = targetFilePaths
      .filter((filePath) => !isProjectExternalPath(filePath, cwd, projectRoot))
      .map((filePath) => normalizeProjectPath(filePath, cwd, projectRoot));
    const projectTargetChanges = targetChanges
      .filter((change) => !isProjectExternalPath(change.filePath, cwd, projectRoot))
      .map((change) => ({
        ...change,
        filePath: normalizeProjectPath(change.filePath, cwd, projectRoot),
      }));
    const configQueryPort = new HarnessConfigConfigQueryAdapter(configPath);
    const phaseGateQueryPort = new PhaseGateQueryAdapter();
    const storyReflectionQueryPort = new FileSystemStoryReflectionQueryAdapter({
      rootDir: projectRoot,
      configPath,
    });
    const fullModeRequirementQueryPort = new QuickModeFullModeRequirementAdapter({
      classifyUseCaseFactory: () =>
        createQuickModeCompositionRoot({ configPath, rootDir: projectRoot }).classifyUseCase,
    });
    const baselineGrandfatherQueryPort = new CiGovernanceBaselineGrandfatherAdapter({
      baseDir: projectRoot,
      configQueryPort,
    });
    const errorGuidanceQueryPort = new HarnessErrorGuidanceAdapter({
      rootDir: projectRoot,
    });
    const fullModeSessionQueryPort = new FileSystemFullModeSessionQueryAdapter({
      rootDir: projectRoot,
      configQueryPort,
    });
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort,
      phaseGateQueryPort,
      storyReflectionQueryPort,
      fullModeRequirementQueryPort,
      baselineGrandfatherQueryPort,
      errorGuidanceQueryPort,
      fullModeSessionQueryPort,
    });

    const output = await useCase.execute({
      toolName: effectiveToolName,
      targetFilePaths: projectTargetFilePaths,
      targetChanges: projectTargetChanges,
    });

    if (output.shouldBlock) {
      const msg =
        output.error?.message ?? `ファイル保護によりブロックされました: ${output.blockedFilePath ?? "不明なファイル"}`;
      deny(responseProfile, msg);
    }

    // Quick Mode が write を許可した場合に visibility を上げる informational notice。
    // exit 0 は維持し semantics は変えない。WI-087 finding #3。
    if (output.quickModeAllowed !== undefined) {
      const cat = output.quickModeAllowed.dominantCategory;
      const suffix = cat !== undefined && cat !== "" ? `, category=${cat}` : "";
      process.stderr.write(`phasegate: write allowed (Quick Mode${suffix})\n`);
    }
    if (output.fullModeSessionAllowed !== undefined) {
      const session = output.fullModeSessionAllowed;
      const workItem = session.workItemId !== undefined ? `, workItem=${session.workItemId}` : "";
      const unit = session.unit !== undefined ? `, unit=${session.unit}` : "";
      process.stderr.write(`phasegate: write allowed (Full Mode session${workItem}${unit})\n`);
    }

    process.exit(0);
  } catch (error) {
    deny(responseProfile, `実行エラー: ${String(error)}`);
  }
}

function exitWithRenderedResponse(response: {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: 0 | 2;
}): never {
  if (response.stdout.length > 0) process.stdout.write(response.stdout);
  if (response.stderr.length > 0) process.stderr.write(response.stderr);
  process.exit(response.exitCode);
  throw new Error("process.exit returned unexpectedly");
}

function deny(profile: HookResponseProfile, reason: string): never {
  exitWithRenderedResponse(new PreToolUseResponseRenderer().deny(profile, reason));
}

async function buildTargetChanges(
  input: PreToolUseHookInput,
  cwd: string,
  toRelative: (p: string) => string,
): Promise<TargetChange[]> {
  const toolInput = input.tool_input;
  if (toolInput == null || typeof toolInput !== "object") {
    return [];
  }

  const rawPath = toolInput.file_path ?? toolInput.path;
  if (rawPath === undefined) {
    return [];
  }

  const filePath = toRelative(rawPath);
  const oldString = toolInput.old_string;
  const newString = toolInput.new_string;
  if (typeof oldString === "string" && typeof newString === "string") {
    return [{ filePath, beforeContent: oldString, afterContent: newString }];
  }

  if (typeof toolInput.content === "string") {
    return [
      {
        filePath,
        beforeContent: await readExistingContent(cwd, rawPath),
        afterContent: toolInput.content,
      },
    ];
  }

  return [];
}

async function readExistingContent(cwd: string, filePath: string): Promise<string | null> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  try {
    return await fs.readFile(absolutePath, "utf8");
  } catch {
    return null;
  }
}

async function buildBashTargetChange(
  cwd: string,
  rawPath: string,
  toRelative: (p: string) => string,
): Promise<TargetChange> {
  const filePath = toRelative(rawPath);
  if (rawPath.includes("$") || rawPath.includes("`") || rawPath.startsWith("~")) {
    // hook ではシェル展開後の実パスを解決できないため、存在チェックを避けて MODIFY 既定にする。
    return { filePath };
  }
  const absolutePath = path.isAbsolute(rawPath) ? rawPath : path.join(cwd, rawPath);
  try {
    await fs.stat(absolutePath);
    return { filePath };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      // Bash では afterContent を取得できないため、空文字を CREATE 判定用の
      // 「変更後内容あり」sentinel として渡す。実ファイルへの書き込みは行わない。
      return { filePath, beforeContent: null, afterContent: "" };
    }
    // 権限エラー等で存在を確認できない場合は従来どおり MODIFY 既定（安全側）。
    return { filePath };
  }
}

main().catch((error) => {
  process.stderr.write(`予期しないエラー: ${String(error)}\n`);
  process.exit(2);
});
