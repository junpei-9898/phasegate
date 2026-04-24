// @unit traceability-model
// @layer infrastructure

import * as fs from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import type { WorkItemMigrationSourcePort } from "../../domain/ports/work-item-migration-source-port.js";
import type {
  LegacyIssueDirectory,
  WorkItemDescriptionFileName,
} from "../../domain/value-objects/work-item-migration-candidate.js";

const ISSUE_DIR_PATTERN = /^(?:ISSUE|WI)-\d+$/;
const SKIPPED_INCEPTION_DIRS = new Set(["_shared", "_operation", "_cross", "issues"]);

export interface FileSystemWorkItemMigrationSourceGatewayDeps {
  readonly rootDir: string;
}

export class FileSystemWorkItemMigrationSourceGateway implements WorkItemMigrationSourcePort {
  private readonly rootDir: string;

  constructor(deps: FileSystemWorkItemMigrationSourceGatewayDeps) {
    this.rootDir = deps.rootDir;
  }

  async listLegacyIssueDirectories(): Promise<readonly LegacyIssueDirectory[]> {
    const entries: LegacyIssueDirectory[] = [];
    entries.push(...(await this.listCrossIssueDirectories()));
    entries.push(...(await this.listUnitIssueDirectories()));
    return Object.freeze(entries);
  }

  private async listCrossIssueDirectories(): Promise<readonly LegacyIssueDirectory[]> {
    const issuesDir = path.join(this.rootDir, "docs", "inception", "issues");
    if (!fs.existsSync(issuesDir)) return Object.freeze([]);

    const names = (await readdir(issuesDir)).sort();
    const entries: LegacyIssueDirectory[] = [];
    for (const name of names) {
      if (!ISSUE_DIR_PATTERN.test(name)) continue;
      const sourcePath = `docs/inception/issues/${name}`;
      const entry = await this.createEntry({
        legacyId: name,
        sourcePath,
        targetPath: `docs/inception/_cross/${toTargetId(name)}`,
        scope: "cross",
      });
      entries.push(entry);
    }
    return Object.freeze(entries);
  }

  private async listUnitIssueDirectories(): Promise<readonly LegacyIssueDirectory[]> {
    const inceptionDir = path.join(this.rootDir, "docs", "inception");
    if (!fs.existsSync(inceptionDir)) return Object.freeze([]);

    const unitNames = (await readdir(inceptionDir)).sort();
    const entries: LegacyIssueDirectory[] = [];
    for (const unitName of unitNames) {
      if (SKIPPED_INCEPTION_DIRS.has(unitName)) continue;
      const issuesDir = path.join(inceptionDir, unitName, "issues");
      if (!fs.existsSync(issuesDir)) continue;

      for (const name of (await readdir(issuesDir)).sort()) {
        if (!ISSUE_DIR_PATTERN.test(name)) continue;
        const sourcePath = `docs/inception/${unitName}/issues/${name}`;
        const entry = await this.createEntry({
          legacyId: name,
          sourcePath,
          targetPath: `docs/inception/${unitName}/${toTargetId(name)}`,
          scope: "unit",
          unitName,
        });
        entries.push(entry);
      }
    }

    return Object.freeze(entries);
  }

  private async createEntry(args: {
    readonly legacyId: string;
    readonly sourcePath: string;
    readonly targetPath: string;
    readonly scope: "cross" | "unit";
    readonly unitName?: string;
  }): Promise<LegacyIssueDirectory> {
    const descriptionFileName = this.resolveDescriptionFileName(args.sourcePath);
    const content =
      descriptionFileName === null
        ? ""
        : await readFile(path.join(this.rootDir, args.sourcePath, descriptionFileName), "utf8");

    return {
      legacyId: args.legacyId,
      sourcePath: args.sourcePath,
      scope: args.scope,
      ...(args.unitName !== undefined ? { unitName: args.unitName } : {}),
      descriptionFileName,
      content,
      targetExists: fs.existsSync(path.join(this.rootDir, args.targetPath)),
    };
  }

  private resolveDescriptionFileName(sourcePath: string): WorkItemDescriptionFileName | null {
    const descriptionPath = path.join(this.rootDir, sourcePath, "description.md");
    if (fs.existsSync(descriptionPath)) return "description.md";

    const issueDescriptionPath = path.join(this.rootDir, sourcePath, "issue_description.md");
    return fs.existsSync(issueDescriptionPath) ? "issue_description.md" : null;
  }
}

function toTargetId(legacyId: string): string {
  if (legacyId.startsWith("WI-")) return legacyId;
  return `WI-${legacyId.replace(/^ISSUE-/, "").padStart(3, "0")}`;
}
