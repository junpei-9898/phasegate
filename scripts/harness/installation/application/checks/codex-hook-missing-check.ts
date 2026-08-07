// @unit installation
// @layer application
// @work-item-id WI-145
// @work-item-id WI-384

import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import { containsPhasegateHook, createFinding, projectPath } from "./check-utils.js";

const REQUIRED_MATCHER_TOKENS = ["Bash", "apply_patch"] as const;
const REPAIR_HINT =
  "Run npx phasegate reconcile --apply, then open Codex /hooks and trust the updated hook definition hash (Codex CLI >= 0.124.0).";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function phasegateCommandFor(entry: unknown, command: "pre-tool-use" | "post-tool-use"): boolean {
  if (!isRecord(entry) || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((hook) => {
    if (!isRecord(hook) || typeof hook.command !== "string") return false;
    return hook.command.includes(`phasegate hook ${command}`);
  });
}

function matcherTokens(entry: unknown): ReadonlySet<string> {
  if (!isRecord(entry) || typeof entry.matcher !== "string") return new Set();
  return new Set(entry.matcher.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
}

function missingForEvent(
  hooks: Record<string, unknown>,
  event: "PreToolUse" | "PostToolUse",
  command: "pre-tool-use" | "post-tool-use",
): string[] {
  const entries = Array.isArray(hooks[event]) ? hooks[event] : [];
  const phasegateEntries = entries.filter((entry) => phasegateCommandFor(entry, command));
  if (phasegateEntries.length === 0) return [`${event}:phasegate-command`];
  const missing: string[] = [];
  for (const token of REQUIRED_MATCHER_TOKENS) {
    if (!phasegateEntries.some((entry) => matcherTokens(entry).has(token))) {
      missing.push(`${event}:${token}`);
    }
  }
  return missing;
}

function hasUserHookEntry(json: Record<string, unknown>): boolean {
  if (Array.isArray(json.hooks)) {
    return json.hooks.some((entry) => !containsPhasegateHook(entry));
  }
  if (!isRecord(json.hooks)) return false;
  return Object.values(json.hooks).some(
    (entries) => Array.isArray(entries) && entries.some((entry) => !containsPhasegateHook(entry)),
  );
}

export class CodexHookMissingCheck implements HeuristicCheck {
  readonly checkId = "codex-hook-missing" as const;
  private readonly target = ".codex/hooks.json";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const absolutePath = projectPath(projectRoot, this.target);
    if (!(await inspector.exists(absolutePath))) {
      return createFinding({
        checkId: this.checkId,
        severity: "red",
        target: this.target,
        message: ".codex/hooks.json に phasegate hook が登録されていません",
        repairMode: "mechanical",
      });
    }
    const json = await inspector.readJson(absolutePath);
    if (json === null) {
      return createFinding({
        checkId: this.checkId,
        severity: "red",
        target: this.target,
        message: ".codex/hooks.json を JSON として読めないため phasegate hook を確認できません",
        repairMode: "manual",
      });
    }
    if (!isRecord(json) || !isRecord(json.hooks)) {
      return createFinding({
        checkId: this.checkId,
        severity: "red",
        target: this.target,
        message: ".codex/hooks.json に phasegate hook が登録されていません",
        repairMode: isRecord(json) && hasUserHookEntry(json) ? "ai-assisted" : "mechanical",
        repairHint: REPAIR_HINT,
      });
    }
    const missing = [
      ...missingForEvent(json.hooks, "PreToolUse", "pre-tool-use"),
      ...missingForEvent(json.hooks, "PostToolUse", "post-tool-use"),
    ];
    if (missing.length === 0) return null;
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: `.codex/hooks.json の Codex hook wiring が古いか不足しています: ${missing.join(", ")}`,
      repairMode: hasUserHookEntry(json) ? "ai-assisted" : "mechanical",
      repairHint: REPAIR_HINT,
    });
  }
}
