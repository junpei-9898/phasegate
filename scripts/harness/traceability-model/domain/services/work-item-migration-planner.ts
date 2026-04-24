// @unit traceability-model
// @layer domain

import type {
  LegacyIssueDirectory,
  WorkItemMigrationCandidate,
  WorkItemMigrationPlan,
} from "../value-objects/work-item-migration-candidate.js";

const ISSUE_ID_PATTERN = /^ISSUE-(\d+)$/;
const WI_ID_PATTERN = /^WI-\d+$/;

export class WorkItemMigrationPlanner {
  plan(entries: readonly LegacyIssueDirectory[]): WorkItemMigrationPlan {
    const candidates: WorkItemMigrationCandidate[] = [];
    const warnings: string[] = [];

    for (const entry of entries) {
      const nextId = toWorkItemId(entry.legacyId);
      if (nextId === null) {
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
        }),
      });
    }

    return Object.freeze({
      candidates: Object.freeze(candidates),
      warnings: Object.freeze(warnings),
    });
  }
}

function toWorkItemId(legacyId: string): string | null {
  if (WI_ID_PATTERN.test(legacyId)) return legacyId;

  const match = ISSUE_ID_PATTERN.exec(legacyId);
  if (!match) return null;

  return `WI-${match[1].padStart(3, "0")}`;
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
}): string {
  const lines = [
    "---",
    `id: ${args.nextId}`,
    "type: issue",
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
