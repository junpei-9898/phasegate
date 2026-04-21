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
import { createQuickModeCompositionRoot } from '../../quick-mode/composition-root.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

interface PreToolUseHookInput {
  cwd?: string;
  tool_name?: string;
  tool_input?: {
    path?: string;
    file_path?: string;
    paths?: string[];
    command?: string;
    [key: string]: unknown;
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function findConfigPath(): Promise<string> {
  let dir = process.cwd();
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
  return path.join(process.cwd(), 'phasegate.config.json');
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

  const cwd = input.cwd ?? process.cwd();
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
    const configPath = await findConfigPath();
    const configQueryPort = new HarnessConfigConfigQueryAdapter(configPath);
    const phaseGateQueryPort = new PhaseGateQueryAdapter();
    const storyReflectionQueryPort = new FileSystemStoryReflectionQueryAdapter({
      rootDir: path.dirname(configPath),
      configPath,
    });
    const fullModeRequirementQueryPort = new QuickModeFullModeRequirementAdapter({
      classifyUseCaseFactory: () => createQuickModeCompositionRoot().classifyUseCase,
    });
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort,
      phaseGateQueryPort,
      storyReflectionQueryPort,
      fullModeRequirementQueryPort,
    });

    const output = await useCase.execute({ toolName: effectiveToolName, targetFilePaths });

    if (output.shouldBlock) {
      const msg = output.error?.message
        ?? `ファイル保護によりブロックされました: ${output.blockedFilePath ?? '不明なファイル'}`;
      process.stderr.write(`${msg}\n`);
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    process.stderr.write(`実行エラー: ${String(error)}\n`);
    process.exit(2);
  }
}

main().catch((error) => {
  process.stderr.write(`予期しないエラー: ${String(error)}\n`);
  process.exit(2);
});
