// @unit agent-integration
// @layer presentation

import { buildCiGovernance } from "../../ci-governance/composition-root.js";
import {
  buildIntegrityUnverifiableWarning,
  buildIntegrityWarning,
  buildSessionStartContext,
  collectPhasegateStatus,
} from "./phasegate-status-context.js";

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

async function main(): Promise<void> {
  try {
    await readStdin();
  } catch {
    // stdin が無くても続行
  }

  const status = await collectPhasegateStatus(process.cwd());
  const baseContext = buildSessionStartContext(status);
  const integrityContext = await buildIntegrityContext(process.cwd());
  const additionalContext = integrityContext === null ? baseContext : `${integrityContext}\n\n${baseContext}`;

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
