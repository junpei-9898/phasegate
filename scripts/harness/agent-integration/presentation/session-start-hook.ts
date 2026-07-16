// @unit agent-integration
// @layer presentation
// @work-item-id WI-304

import { buildCiGovernance } from "../../ci-governance/composition-root.js";
import { createConfigFoundationModule, toWorldModelConfig } from "../../config-foundation/index.js";
import { GetOpenWorldObligationsContextUseCase } from "../application/usecases/get-open-world-obligations-context-usecase.js";
import { WorldModelOpenObligationsQueryAdapter } from "../infrastructure/adapters/world-model-open-obligations-query-adapter.js";
import {
  buildIntegrityUnverifiableWarning,
  buildIntegrityWarning,
  buildSessionStartContext,
  collectPhasegateStatus,
} from "./phasegate-status-context.js";
import { buildWorldObligationsSessionContext } from "./world-obligations-session-context.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * 指示搭載ファイルの整合性を in-process で照合し、drift 時のみ警告文字列を返す。
 * warn-only・fail-open（ADR-030 §Decision.3.① / §Decision.1）: verify 例外時は
 * 「検証不能」警告に fail-open し、hook は決してブロックしない。
 * drift なし・警告なしのときは null を返す。
 */
async function buildIntegrityContext(cwd: string): Promise<string | null> {
  try {
    const mod = buildCiGovernance(cwd);
    const result = await mod.integrityHandler.verify({ format: "json" });
    const parsed = JSON.parse(result.output) as {
      drifts: Array<{ path: string; kind: "mismatch" | "added" | "missing" | "manifest-absent" }>;
    };
    return buildIntegrityWarning(parsed.drifts);
  } catch (error) {
    return buildIntegrityUnverifiableWarning(String(error));
  }
}

/**
 * World の保存済み report は読まず、公開 facade の pure derive から現在の open obligation を要約する。
 * config/derive の失敗は固定 warning へ縮退し、repository 由来のエラー文字列は中継しない。
 */
async function buildWorldContext(cwd: string): Promise<string | null> {
  try {
    const configModule = createConfigFoundationModule();
    const resolved = await configModule.usecases.loadResolvedConfigUseCase.execute();
    const worldConfig = toWorldModelConfig(resolved.config);
    if (worldConfig === undefined) return null;

    const contextUseCase = new GetOpenWorldObligationsContextUseCase({
      worldObligationsQueryPort: new WorldModelOpenObligationsQueryAdapter({
        rootDir: cwd,
        resolvedConfig: worldConfig,
      }),
    });
    const context = await contextUseCase.execute({
      enabled: worldConfig.enabled && worldConfig.sessionStart.enabled,
    });
    return buildWorldObligationsSessionContext(context, {
      maxItems: worldConfig.sessionStart.maxItems,
      maxChars: worldConfig.sessionStart.maxChars,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ConfigNotFoundError") return null;
    return buildWorldObligationsSessionContext({ status: "unavailable" }, { maxItems: 5, maxChars: 2000 });
  }
}

async function main(): Promise<void> {
  try {
    await readStdin();
  } catch {
    // stdin が無くても続行
  }

  const status = await collectPhasegateStatus(process.cwd());
  const baseContext = buildSessionStartContext(status);
  const integrityContext = await buildIntegrityContext(process.cwd());
  const worldContext = await buildWorldContext(process.cwd());
  const additionalContext = [integrityContext, worldContext, baseContext].filter((item) => item !== null).join("\n\n");

  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext,
    },
  };

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`SessionStart hook error: ${String(error)}\n`);
  // SessionStart で失敗してもセッション継続できるよう exit 0
  process.exit(0);
});
