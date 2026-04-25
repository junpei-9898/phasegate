// @unit traceability-model
// @layer domain

import type {
  LegacyIssueDirectory,
  WorkItemMigrationCandidate,
  WorkItemMigrationPlan,
} from "../value-objects/work-item-migration-candidate.js";

const ISSUE_ID_PATTERN = /^ISSUE-(\d+)$/;
const WI_ID_PATTERN = /^WI-(\d+)$/;
const H_ID_PATTERN = /^H\d{2}-\d{2}$/;

type LegacyIdKind = "wi" | "issue" | "h" | "unknown";
type WorkItemKind = "issue" | "story";

export class WorkItemMigrationPlanner {
  plan(
    entries: readonly LegacyIssueDirectory[],
    existingWorkItemIds: readonly string[] = [],
  ): WorkItemMigrationPlan {
    const candidates: WorkItemMigrationCandidate[] = [];
    const warnings: string[] = [];

    const usedNumbers = new Set<number>();
    for (const id of existingWorkItemIds) {
      const num = parseWorkItemNumber(id);
      if (num !== null) usedNumbers.add(num);
    }
    for (const entry of entries) {
      const fixed = toFixedWorkItemId(entry.legacyId);
      if (fixed === null) continue;
      const num = parseWorkItemNumber(fixed);
      if (num !== null) usedNumbers.add(num);
    }

    let cursor = 1;

    for (const entry of entries) {
      const kind = classifyLegacyId(entry.legacyId);
      let nextId: string;
      let workItemKind: WorkItemKind;

      if (kind === "wi" || kind === "issue") {
        const fixed = toFixedWorkItemId(entry.legacyId);
        if (fixed === null) {
          warnings.push(`unsupported legacy id: ${entry.legacyId}`);
          continue;
        }
        nextId = fixed;
        workItemKind = "issue";
      } else if (kind === "h") {
        while (usedNumbers.has(cursor)) cursor++;
        nextId = `WI-${String(cursor).padStart(3, "0")}`;
        usedNumbers.add(cursor);
        cursor++;
        workItemKind = "story";
      } else {
        warnings.push(`unsupported legacy id: ${entry.legacyId}`);
        continue;
      }

      const affects = extractAffects(entry.content);
      if (entry.scope === "cross" && affects.length === 0) {
        warnings.push(`${entry.legacyId}: cross-unit WI requires affects`);
      }

      const targetPath =
        entry.scope === "cross" ? `docs/inception/_cross/${nextId}` : `docs/inception/${entry.unitName}/${nextId}`;

      candidates.push({
        legacyId: entry.legacyId,
        nextId,
        sourcePath: entry.sourcePath,
        targetPath,
        scope: entry.scope,
        ...(entry.unitName !== undefined ? { unitName: entry.unitName } : {}),
        descriptionFileName: entry.descriptionFileName,
        conflict: entry.targetExists,
        frontmatterPreview: buildFrontmatterPreview({
          nextId,
          legacyId: entry.legacyId,
          severity: extractSeverity(entry.content),
          affects,
          includeAffects: entry.scope === "cross",
          workItemKind,
        }),
      });
    }

    return Object.freeze({
      candidates: Object.freeze(candidates),
      warnings: Object.freeze(warnings),
    });
  }
}

function classifyLegacyId(legacyId: string): LegacyIdKind {
  if (WI_ID_PATTERN.test(legacyId)) return "wi";
  if (ISSUE_ID_PATTERN.test(legacyId)) return "issue";
  if (H_ID_PATTERN.test(legacyId)) return "h";
  return "unknown";
}

function toFixedWorkItemId(legacyId: string): string | null {
  if (WI_ID_PATTERN.test(legacyId)) return legacyId;

  const match = ISSUE_ID_PATTERN.exec(legacyId);
  if (!match) return null;

  return `WI-${match[1].padStart(3, "0")}`;
}

function parseWorkItemNumber(id: string): number | null {
  const match = WI_ID_PATTERN.exec(id);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  return Number.isFinite(num) ? num : null;
}

function extractSeverity(content: string): "trivial" | "normal" | "high" {
  if (/深刻度\*\*:\s*High/i.test(content)) return "high";
  if (/深刻度\*\*:\s*Trivial/i.test(content)) return "trivial";
  return "normal";
}

function extractAffects(content: string): readonly string[] {
  const match = /\*\*影響Unit\*\*:\s*(.+)/.exec(content);
  if (!match) return Object.freeze([]);

  return Object.freeze(
    match[1]
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

function buildFrontmatterPreview(args: {
  readonly nextId: string;
  readonly legacyId: string;
  readonly severity: "trivial" | "normal" | "high";
  readonly affects: readonly string[];
  readonly includeAffects: boolean;
  readonly workItemKind: WorkItemKind;
}): string {
  const lines = [
    "---",
    `id: ${args.nextId}`,
    `type: ${args.workItemKind}`,
    `severity: ${args.severity}`,
    "status: drafted",
    `legacy_id: ${args.legacyId}`,
  ];

  if (args.includeAffects && args.affects.length > 0) {
    lines.push(`affects: [${args.affects.join(", ")}]`);
  }

  lines.push("---");
  return lines.join("\n");
}
