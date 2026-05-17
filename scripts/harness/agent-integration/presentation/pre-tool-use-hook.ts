/**
 * @layer presentation
 * @unit agent-integration
 *
 * PreToolUse Hook Adapter
 * Claude Code の PreToolUse Hook エントリポイント
 * stdin からJSON を読み取り、HandlePreToolUseUseCase を呼び出す
 */

import { HandlePreToolUseUseCase } from '../application/usecases/handle-pre-tool-use-usecase.js';
import { BashWriteTargetExtractor } from '../domain/services/bash-write-target-extractor.js';
import { HarnessConfigConfigQueryAdapter } from '../infrastructure/adapters/harness-config-config-query-adapter.js';
import { PhaseGateQueryAdapter } from '../infrastructure/adapters/phase-gate-query-adapter.js';
import { FileSystemStoryReflectionQueryAdapter } from '../infrastructure/adapters/file-system-story-reflection-query-adapter.js';
import { QuickModeFullModeRequirementAdapter } from '../infrastructure/adapters/quick-mode-full-mode-requirement-adapter.js';
import { CiGovernanceBaselineGrandfatherAdapter } from '../infrastructure/adapters/ci-governance-baseline-grandfather-adapter.js';
import { HarnessErrorGuidanceAdapter } from '../infrastructure/adapters/harness-error-guidance-adapter.js';
import { createQuickModeCompositionRoot } from '../../quick-mode/composition-root.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

interface PreToolUseHookInput {
  cwd?: string;
  tool_name?: string;
  caller_skill?: string;
  tool_input?: {
    path?: string;
    file_path?: string;
    paths?: string[];
    command?: string;
    content?: string;
    old_string?: string;
    new_string?: string;
    old_str?: string;
    new_str?: string;
    [key: string]: unknown;
  };
}

interface TargetChange {
  filePath: string;
  beforeContent?: string | null;
  afterContent?: string | null;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function findConfigPath(startDir: string): Promise<string> {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'phasegate.config.json');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return path.join(startDir, 'phasegate.config.json');
}

function isProjectExternalAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await readStdin();
  } catch {
    process.stderr.write('stdin読み取りエラー\n');
    process.exit(2);
  }

  let input: PreToolUseHookInput;
  try {
    input = JSON.parse(raw) as PreToolUseHookInput;
  } catch {
    process.stderr.write(`不正なJSONです: ${raw}\n`);
    process.exit(2);
  }

  const toolName = input.tool_name;
  if (!toolName) {
    process.stderr.write('tool_nameフィールドが必要です\n');
    process.exit(2);
  }

  const cwd = path.resolve(input.cwd ?? process.cwd());
  const toRelative = (p: string): string => {
    if (path.isAbsolute(p)) {
      const rel = path.relative(cwd, p);
      return rel.startsWith('..') ? p : rel;
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
  if (toolName === 'Bash' && typeof input.tool_input?.command === 'string') {
    const extractor = new BashWriteTargetExtractor();
    const bashTargets = extractor.extract(input.tool_input.command);
    if (bashTargets.length > 0) {
      targetFilePaths.push(...bashTargets.map(toRelative));
      effectiveToolName = 'Write';
    }
  }

  try {
    const configPath = await findConfigPath(cwd);
    const projectTargetFilePaths = targetFilePaths.filter((filePath) => !isProjectExternalAbsolutePath(filePath));
    const projectTargetChanges = targetChanges.filter((change) => !isProjectExternalAbsolutePath(change.filePath));
    const configQueryPort = new HarnessConfigConfigQueryAdapter(configPath);
    const phaseGateQueryPort = new PhaseGateQueryAdapter();
    const storyReflectionQueryPort = new FileSystemStoryReflectionQueryAdapter({
      rootDir: path.dirname(configPath),
      configPath,
    });
    const fullModeRequirementQueryPort = new QuickModeFullModeRequirementAdapter({
      classifyUseCaseFactory: () => createQuickModeCompositionRoot().classifyUseCase,
    });
    const baselineGrandfatherQueryPort = new CiGovernanceBaselineGrandfatherAdapter({
      baseDir: path.dirname(configPath),
      configQueryPort,
    });
    const errorGuidanceQueryPort = new HarnessErrorGuidanceAdapter({
      rootDir: path.dirname(configPath),
    });
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort,
      phaseGateQueryPort,
      storyReflectionQueryPort,
      fullModeRequirementQueryPort,
      baselineGrandfatherQueryPort,
      errorGuidanceQueryPort,
    });

    const callerSkill = input.caller_skill ?? process.env.PHASEGATE_CALLER_SKILL;
    const output = await useCase.execute({
      toolName: effectiveToolName,
      targetFilePaths: projectTargetFilePaths,
      callerSkill,
      targetChanges: projectTargetChanges,
    });

    if (output.shouldBlock) {
      const msg = output.error?.message
        ?? `ファイル保護によりブロックされました: ${output.blockedFilePath ?? '不明なファイル'}`;
      process.stderr.write(`${msg}\n`);
      process.exit(2);
    }

    // Quick Mode が write を許可した場合に visibility を上げる informational notice。
    // exit 0 は維持し semantics は変えない。WI-087 finding #3。
    if (output.quickModeAllowed !== undefined) {
      const cat = output.quickModeAllowed.dominantCategory;
      const suffix = cat !== undefined && cat !== '' ? `, category=${cat}` : '';
      process.stderr.write(`phasegate: write allowed (Quick Mode${suffix})\n`);
    }

    process.exit(0);
  } catch (error) {
    process.stderr.write(`実行エラー: ${String(error)}\n`);
    process.exit(2);
  }
}

async function buildTargetChanges(
  input: PreToolUseHookInput,
  cwd: string,
  toRelative: (p: string) => string,
): Promise<TargetChange[]> {
  const toolInput = input.tool_input;
  if (toolInput === undefined) {
    return [];
  }

  const rawPath = toolInput.file_path ?? toolInput.path;
  if (rawPath === undefined) {
    return [];
  }

  const filePath = toRelative(rawPath);
  const oldString = typeof toolInput.old_string === 'string' ? toolInput.old_string : toolInput.old_str;
  const newString = typeof toolInput.new_string === 'string' ? toolInput.new_string : toolInput.new_str;
  if (typeof oldString === 'string' && typeof newString === 'string') {
    return [{ filePath, beforeContent: oldString, afterContent: newString }];
  }

  if (typeof toolInput.content === 'string') {
    return [{
      filePath,
      beforeContent: await readExistingContent(cwd, rawPath),
      afterContent: toolInput.content,
    }];
  }

  return [];
}

async function readExistingContent(cwd: string, filePath: string): Promise<string | null> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

main().catch((error) => {
  process.stderr.write(`予期しないエラー: ${String(error)}\n`);
  process.exit(2);
});
