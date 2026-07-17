/**
 * @layer presentation
 * @unit agent-integration
 * @work-item-id WI-208
 * @work-item-id WI-323
 *
 * PostToolUse Hook Adapter
 * Claude Code の PostToolUse Hook エントリポイント
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { HandlePostToolUseUseCase } from "../application/usecases/handle-post-tool-use-usecase.js";
import { ChildProcessCliExecutorAdapter } from "../infrastructure/adapters/child-process-cli-executor-adapter.js";
import { HarnessApiCliCommandRegistryAdapter } from "../infrastructure/adapters/harness-api-cli-command-registry-adapter.js";
import { HarnessConfigConfigQueryAdapter } from "../infrastructure/adapters/harness-config-config-query-adapter.js";
import { recordHookSkipEvent } from "./hook-skip-event-recorder.js";

interface PostToolUseHookInput {
  tool_name?: string;
  tool_response?: unknown;
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

  let input: PostToolUseHookInput;
  try {
    input = JSON.parse(raw) as PostToolUseHookInput;
  } catch {
    process.stderr.write(`不正なJSONです: ${raw}\n`);
    process.exit(2);
  }

  const toolName = input.tool_name;
  if (!toolName) {
    // WI-323: PostToolUse はツール実行後の lint フィードバックでありゲートではないため、
    // tool_name 欠落は fail-open でスキップする（WI-314 / github#40 方針）。
    // ※ pre-tool-use-hook の同ガードは書き込みゲートなので fail-closed (exit 2) を維持する。
    const configPath = await findConfigPath();
    await recordHookSkipEvent({
      projectRoot: projectRootForConfig(configPath),
      hookType: "post-tool-use",
      reason: "TOOL_NAME_MISSING",
      targetPaths: [],
    });
    process.stderr.write(
      "警告: stdin payload に tool_name が無いため post-tool-use hook の処理をスキップしました (fail-open)\n",
    );
    process.exit(0);
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
      await recordHookSkipEvent({
        projectRoot: projectRootForConfig(configPath),
        hookType: "post-tool-use",
        reason: output.skipReason,
        targetPaths: [],
      });
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
