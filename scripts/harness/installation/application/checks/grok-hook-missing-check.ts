// @unit installation
// @layer application
// @work-item-id WI-385

import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import { containsPhasegateHook, createFinding, projectPath } from "./check-utils.js";

const REQUIRED_TOOLS = ["Bash", "Write", "Edit", "apply_patch"] as const;
const REPAIR_HINT =
  "Run npx phasegate reconcile --apply, confirm every phasegate PreToolUse command has timeout 30, then use grok inspect and /hooks to verify trust (--trust or /hooks-trust).";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matcherMatches(entry: Record<string, unknown>, tool: string): boolean {
  if (typeof entry.matcher !== "string") return false;
  try {
    return new RegExp(`^(?:${entry.matcher})$`).test(tool);
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

function hasUserHook(entries: readonly unknown[]): boolean {
  return entries.some((entry) => !containsPhasegateHook(entry));
}

export class GrokHookMissingCheck implements HeuristicCheck {
  readonly checkId = "grok-hook-missing" as const;
  private readonly target = ".claude/settings.json";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const absolutePath = projectPath(projectRoot, this.target);
    if (!(await inspector.exists(absolutePath))) return this.finding("compatible settings missing", "mechanical");
    const json = await inspector.readJson(absolutePath);
    if (json === null) return this.finding("JSON parse failed", "manual");
    const hooks = isRecord(json) && isRecord(json.hooks) ? json.hooks : undefined;
    const entries = hooks !== undefined && Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse : [];
    const phasegateEntries = entries.filter(
      (entry): entry is Record<string, unknown> => isRecord(entry) && phasegateCommands(entry).length > 0,
    );
    const missing = REQUIRED_TOOLS.filter((tool) => !phasegateEntries.some((entry) => matcherMatches(entry, tool)));
    const invalidType = phasegateEntries.some((entry) =>
      phasegateCommands(entry).some((hook) => hook.type !== "command"),
    );
    const invalidTimeout = phasegateEntries.some((entry) =>
      phasegateCommands(entry).some((hook) => hook.timeout !== 30),
    );
    if (missing.length === 0 && !invalidType && !invalidTimeout) return null;
    const details = [
      ...missing.map((tool) => `matcher:${tool}`),
      ...(invalidType ? ["type=command"] : []),
      ...(invalidTimeout ? ["timeout=30"] : []),
    ];
    return this.finding(details.join(", "), hasUserHook(entries) ? "ai-assisted" : "mechanical");
  }

  private finding(detail: string, repairMode: "mechanical" | "manual" | "ai-assisted"): DiagnosticFinding {
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: `.claude/settings.json の Grok-compatible hook wiring が古いか不足しています: ${detail}`,
      repairMode,
      repairHint: REPAIR_HINT,
    });
  }
}
