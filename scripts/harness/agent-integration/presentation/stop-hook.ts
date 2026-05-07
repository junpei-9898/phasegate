/**
 * @layer presentation
 * @unit agent-integration
 *
 * Stop Hook Adapter
 * Claude Code の Stop Hook エントリポイント
 */

import { HandleStopUseCase } from '../application/usecases/handle-stop-usecase.js';
import { EnvFileReentryGuardStateAdapter } from '../infrastructure/adapters/env-file-reentry-guard-state-adapter.js';
import { HarnessConfigConfigQueryAdapter } from '../infrastructure/adapters/harness-config-config-query-adapter.js';
import { HarnessApiCliCommandRegistryAdapter } from '../infrastructure/adapters/harness-api-cli-command-registry-adapter.js';
import { ChildProcessCliExecutorAdapter } from '../infrastructure/adapters/child-process-cli-executor-adapter.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

interface StopHookInput {
  session_id?: string;
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

  let input: StopHookInput;
  try {
    input = JSON.parse(raw) as StopHookInput;
  } catch {
    process.stderr.write(`不正なJSONです: ${raw}\n`);
    process.exit(2);
  }

  const sessionId = input.session_id;
  if (!sessionId) {
    process.stderr.write('session_idフィールドが必要です\n');
    process.exit(2);
  }

  try {
    const configPath = await findConfigPath();
    const reentryGuardStatePort = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
    const configQueryPort = new HarnessConfigConfigQueryAdapter(configPath);
    const cliCommandRegistryPort = new HarnessApiCliCommandRegistryAdapter();
    const cliExecutorPort = new ChildProcessCliExecutorAdapter();

    const useCase = new HandleStopUseCase({
      reentryGuardStatePort,
      cliExecutorPort,
      configQueryPort,
      cliCommandRegistryPort,
    });

    const output = await useCase.execute({ sessionId });

    if (output.skipReason === 'REENTRY_DETECTED') {
      process.stderr.write('ReentryGuard: 再入検出によりスキップ\n');
      process.exit(0);
    }

    if (output.executed && output.cliResult) {
      if (output.cliResult.exitCode !== 0) {
        // WI-087 finding #4: enforce=true なら exit 2 + decision JSON で turn block
        if (output.shouldEnforceFailure === true) {
          const reason = `Complete Check failed (exitCode=${output.cliResult.exitCode})`;
          process.stdout.write(`${JSON.stringify({ decision: 'block', reason })}\n`);
          process.stderr.write(
            `Complete Check失敗 (exitCode=${output.cliResult.exitCode}) — strict mode により turn を block します\n`,
          );
          process.exit(2);
        }
        process.stderr.write(`Complete Check失敗 (exitCode=${output.cliResult.exitCode})\n`);
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
