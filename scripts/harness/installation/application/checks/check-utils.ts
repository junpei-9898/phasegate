// @unit installation
// @layer application
// @work-item-id WI-145
// @work-item-id WI-209
// @work-item-id WI-210

import { join } from "node:path";
import type { CheckId } from "../../domain/check-id.js";
import { DiagnosticFinding, type DiagnosticSeverity } from "../../domain/diagnostic-finding.js";
import type { RepairMode } from "../../domain/repair-mode.js";
import { RepairTable } from "../../domain/repair-table.js";
import type { SuggestedSkill } from "../../domain/suggested-skill.js";

const PHASEGATE_REPAIR_HINT = "npx phasegate install --apply";

export function projectPath(projectRoot: string, relativePath: string): string {
  return join(projectRoot, relativePath);
}

export function containsPhasegateHook(value: unknown): boolean {
  if (typeof value === "string") {
    return value.includes("npx phasegate hook") || value.includes("phasegate hook");
  }
  if (Array.isArray(value)) return value.some((item) => containsPhasegateHook(item));
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => containsPhasegateHook(item));
  }
  return false;
}

export function hasUserCustomization(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

export function scriptHasPhasegateBlock(content: string, commands: readonly string[]): boolean {
  return commands.some((command) => content.includes(command));
}

export function createFinding(input: {
  readonly checkId: CheckId;
  readonly severity: DiagnosticSeverity;
  readonly target: string;
  readonly message: string;
  readonly repairMode: RepairMode;
  readonly repairHint?: string | null;
  readonly suggestedSkill?: SuggestedSkill | null;
}): DiagnosticFinding {
  return DiagnosticFinding.create({
    checkId: input.checkId,
    severity: input.severity,
    target: input.target,
    message: input.message,
    repairMode: input.repairMode,
    repairHint: input.repairHint ?? (input.repairMode === "mechanical" ? PHASEGATE_REPAIR_HINT : null),
    suggestedSkill: input.suggestedSkill ?? new RepairTable().lookup(input.checkId),
  });
}

export function skillTargetLooksValid(target: string | null): boolean {
  if (target === null) return false;
  const normalized = target.replaceAll("\\", "/").replace(/\/+$/, "");
  return normalized === "skills" || normalized === "../skills" || normalized.endsWith("/skills");
}

export function skillDirectoryLooksValid(files: readonly string[]): boolean {
  return files.some((file) => file.endsWith("/SKILL.md") || file.endsWith("\\SKILL.md") || file.endsWith(".harness-version"));
}
