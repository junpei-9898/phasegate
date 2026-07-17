/**
 * @layer presentation
 * @unit agent-integration
 * @work-item-id WI-203
 * @work-item-id WI-208
 * @work-item-id WI-323
 *
 * Stop Hook Adapter
 * Claude Code の Stop Hook エントリポイント
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { HandleStopUseCase } from "../application/usecases/handle-stop-usecase.js";
import { ChildProcessCliExecutorAdapter } from "../infrastructure/adapters/child-process-cli-executor-adapter.js";
import { EnvFileReentryGuardStateAdapter } from "../infrastructure/adapters/env-file-reentry-guard-state-adapter.js";
import { HarnessApiCliCommandRegistryAdapter } from "../infrastructure/adapters/harness-api-cli-command-registry-adapter.js";
import { HarnessConfigConfigQueryAdapter } from "../infrastructure/adapters/harness-config-config-query-adapter.js";
import { recordHookSkipEvent } from "./hook-skip-event-recorder.js";

interface StopHookInput {
  session_id?: string;
}

function isCompleteCheckExecutionWiringFailure(stderr: string): boolean {
  return (
    /scripts\/harness\/cli\/complete-check\.ts/.test(stderr) || /ERR_MODULE_NOT_FOUND|Cannot find module/i.test(stderr)
  );
}

function formatCompleteCheckFailureReason(exitCode: number, stderr: string): string {
  if (isCompleteCheckExecutionWiringFailure(stderr)) {
    return `Complete Check execution failed (exitCode=${exitCode})`;
  }
  return `Complete Check failed (exitCode=${exitCode})`;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function findConfigPath(): Promise<string> {
  let dir = process.cwd();
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
  return path.join(process.cwd(), "phasegate.config.json");
}

function projectRootForConfig(configPath: string): string {
  const configDir = path.dirname(configPath);
  return path.basename(configDir) === ".phasegate-local" ? path.dirname(configDir) : configDir;
}

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await readStdin();
  } catch {
    process.stderr.write("stdin読み取りエラー\n");
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
    // WI-323: session_id 欠落は呼び出し側環境の不備であり、stop hook はゲートではないため
    // fail-open でスキップする（WI-314 / github#40 の「hook は開発フローを止めない」方針）。
    const configPath = await findConfigPath();
    await recordHookSkipEvent({
      projectRoot: projectRootForConfig(configPath),
      hookType: "stop",
      reason: "SESSION_ID_MISSING",
      targetPaths: [],
    });
    process.stderr.write(
      "警告: stdin payload に session_id が無いため stop hook の処理をスキップしました (fail-open)\n",
    );
    process.exit(0);
  }

  try {
    const configPath = await findConfigPath();
    const reentryGuardStatePort = new EnvFileReentryGuardStateAdapter({ strategy: "env" });
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

    if (output.skipReason === "REENTRY_DETECTED") {
      await recordHookSkipEvent({
        projectRoot: projectRootForConfig(configPath),
        hookType: "stop",
        reason: output.skipReason,
        targetPaths: [],
      });
      process.stderr.write("ReentryGuard: 再入検出によりスキップ\n");
      process.exit(0);
    }

    if (output.executed && output.cliResult) {
      if (output.cliResult.exitCode !== 0) {
        // WI-087 finding #4: enforce=true なら exit 2 + decision JSON で turn block
        if (output.shouldEnforceFailure === true) {
          const reason = formatCompleteCheckFailureReason(output.cliResult.exitCode, output.cliResult.stderr);
          process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
          process.stderr.write(`${reason} — strict mode により turn を block します\n`);
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
