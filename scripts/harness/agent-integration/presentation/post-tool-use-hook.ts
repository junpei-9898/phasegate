/**
 * @layer presentation
 * @unit agent-integration
 *
 * PostToolUse Hook Adapter
 * Claude Code の PostToolUse Hook エントリポイント
 */

import { HandlePostToolUseUseCase } from '../application/usecases/handle-post-tool-use-usecase.js';
import { HarnessConfigConfigQueryAdapter } from '../infrastructure/adapters/harness-config-config-query-adapter.js';
import { HarnessApiCliCommandRegistryAdapter } from '../infrastructure/adapters/harness-api-cli-command-registry-adapter.js';
import { ChildProcessCliExecutorAdapter } from '../infrastructure/adapters/child-process-cli-executor-adapter.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

interface PostToolUseHookInput {
  tool_name?: string;
  tool_response?: unknown;
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

  let input: PostToolUseHookInput;
  try {
    input = JSON.parse(raw) as PostToolUseHookInput;
  } catch {
    process.stderr.write(`不正なJSONです: ${raw}\n`);
    process.exit(2);
  }

  const toolName = input.tool_name;
  if (!toolName) {
    process.stderr.write('tool_nameフィールドが必要です\n');
    process.exit(2);
  }

  try {
    const configPath = await findConfigPath();
    const configQueryPort = new HarnessConfigConfigQueryAdapter(configPath);
    const cliCommandRegistryPort = new HarnessApiCliCommandRegistryAdapter();
    const cliExecutorPort = new ChildProcessCliExecutorAdapter();

    const useCase = new HandlePostToolUseUseCase({
      configQueryPort,
      cliExecutorPort,
      cliCommandRegistryPort,
    });

    const output = await useCase.execute({ toolName, affectedFilePaths: [] });

    if (output.skipReason) {
      process.stderr.write(`スキップ: ${output.skipReason}\n`);
      process.exit(0);
    }

    if (output.executed && output.cliResult) {
      if (output.cliResult.exitCode !== 0) {
        process.stderr.write(`Lint失敗 (exitCode=${output.cliResult.exitCode})\n`);
      }
      process.exit(output.cliResult.exitCode);
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
