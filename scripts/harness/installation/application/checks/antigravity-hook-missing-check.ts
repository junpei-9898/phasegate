// @unit installation
// @layer application
// @work-item-id WI-385

import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import { createFinding, projectPath } from "./check-utils.js";

const REQUIRED_TOOLS = ["write_to_file", "replace_file_content", "multi_replace_file_content", "run_command"] as const;
const REPAIR_HINT =
  "Run npx phasegate reconcile --apply. Antigravity hard blocking is supported for the agy CLI surface; IDE/desktop must rely on the L2 pre-commit backstop.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matches(matcher: unknown, tool: string): boolean {
  if (typeof matcher !== "string") return false;
  try {
    return new RegExp(matcher).test(tool);
  } catch {
    return false;
  }
}

function phasegateCommands(entry: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(entry.hooks)) return [];
  return entry.hooks.filter(
    (hook): hook is Record<string, unknown> =>
      isRecord(hook) && typeof hook.command === "string" && hook.command.includes("phasegate hook pre-tool-use"),
  );
}

export class AntigravityHookMissingCheck implements HeuristicCheck {
  readonly checkId = "antigravity-hook-missing" as const;
  private readonly target = ".agents/hooks.json";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const absolutePath = projectPath(projectRoot, this.target);
    if (!(await inspector.exists(absolutePath))) return this.finding("named definition missing", "mechanical");
    const json = await inspector.readJson(absolutePath);
    if (json === null) return this.finding("JSON parse failed", "manual");
    const named = isRecord(json) && isRecord(json["phasegate-gate"]) ? json["phasegate-gate"] : undefined;
    const entries = named !== undefined && Array.isArray(named.PreToolUse) ? named.PreToolUse : [];
    const phasegateEntries = entries.filter(
      (entry): entry is Record<string, unknown> => isRecord(entry) && phasegateCommands(entry).length > 0,
    );
    const missing = REQUIRED_TOOLS.filter(
      (tool) => !phasegateEntries.some((entry) => matches(entry.matcher, tool)),
    );
    const invalidType = phasegateEntries.some((entry) =>
      phasegateCommands(entry).some((hook) => hook.type !== "command"),
    );
    const invalidTimeout = phasegateEntries.some((entry) =>
      phasegateCommands(entry).some((hook) => hook.timeout !== 30),
    );
    if (missing.length === 0 && phasegateEntries.length > 0 && !invalidType && !invalidTimeout) return null;
    const details = [
      ...missing.map((tool) => `matcher:${tool}`),
      ...(phasegateEntries.length === 0 ? ["command"] : []),
      ...(invalidType ? ["type=command"] : []),
      ...(invalidTimeout ? ["timeout=30"] : []),
    ];
    const hasUserDefinitions = isRecord(json) && Object.keys(json).some((key) => key !== "phasegate-gate");
    return this.finding(details.join(", "), hasUserDefinitions ? "ai-assisted" : "mechanical");
  }

  private finding(detail: string, repairMode: "mechanical" | "manual" | "ai-assisted"): DiagnosticFinding {
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: `.agents/hooks.json の Antigravity hook wiring が古いか不足しています: ${detail}`,
      repairMode,
      repairHint: REPAIR_HINT,
    });
  }
}
