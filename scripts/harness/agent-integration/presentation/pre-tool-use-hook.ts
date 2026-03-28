/**
 * @layer presentation
 * @unit agent-integration
 *
 * PreToolUse Hook Adapter
 * Claude Code の PreToolUse Hook エントリポイント
 * stdin からJSON を読み取り、HandlePreToolUseUseCase を呼び出す
 */

import { HandlePreToolUseUseCase } from '../application/usecases/handle-pre-tool-use-usecase.js';
import { HarnessConfigConfigQueryAdapter } from '../infrastructure/adapters/harness-config-config-query-adapter.js';
import { PhaseGateQueryAdapter } from '../infrastructure/adapters/phase-gate-query-adapter.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

interface PreToolUseHookInput {
  cwd?: string;
  tool_name?: string;
  tool_input?: {
    path?: string;
    file_path?: string;
    paths?: string[];
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
    const candidate = path.join(dir, 'harness.config.json');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return path.join(process.cwd(), 'harness.config.json');
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

  try {
    const configPath = await findConfigPath();
    const configQueryPort = new HarnessConfigConfigQueryAdapter(configPath);
    const phaseGateQueryPort = new PhaseGateQueryAdapter();
    const useCase = new HandlePreToolUseUseCase({ configQueryPort, phaseGateQueryPort });

    const output = await useCase.execute({ toolName, targetFilePaths });

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
