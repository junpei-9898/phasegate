// @unit traceability-model
// @layer infrastructure
// @work-item-id WI-126 / WI-140
// @work-item-id WI-337

import { readdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { WorkItemStatusPort } from "../../domain/ports/work-item-status-port.js";
import {
  type WorkItemFrontmatter,
  WorkItemFrontmatterValidationError,
} from "../../domain/value-objects/work-item-frontmatter.js";
import type {
  WorkItemStatusApplyResult,
  WorkItemStatusInput,
  WorkItemStatusReport,
} from "../../domain/value-objects/work-item-status-report.js";
import { parseWorkItemFrontmatter } from "../parsers/work-item-frontmatter-parser.js";

const WI_DIR_PATTERN = /^WI-\d+$/;
const MARKDOWN_PATTERN = /\.mdx?$/;
const SOURCE_PATTERN = /\.(?:ts|tsx|js|jsx)$/;
const SKIPPED_DIRS = new Set(["archive", "_shared", "_operation", "share", "node_modules", ".git"]);

export interface FileSystemWorkItemStatusGatewayDeps {
  readonly rootDir: string;
  readonly inceptionRoot?: string;
  readonly productRoot?: string;
  readonly sourceRoot?: string;
  readonly testRoot?: string;
}

export class FileSystemWorkItemStatusGateway implements WorkItemStatusPort {
  private readonly rootDir: string;
  private readonly inceptionRoot: string;
  private readonly productRoot: string;
  private readonly sourceRoot: string;
  private readonly testRoot: string;

  constructor(deps: FileSystemWorkItemStatusGatewayDeps) {
    this.rootDir = deps.rootDir;
    this.inceptionRoot = deps.inceptionRoot ?? "docs/inception";
    this.productRoot = deps.productRoot ?? "docs/product";
    this.sourceRoot = deps.sourceRoot ?? "scripts/harness";
    this.testRoot = deps.testRoot ?? "scripts/harness/__tests__";
  }

  async listWorkItemStatusInputs(): Promise<readonly WorkItemStatusInput[]> {
    const entries = await this.listDescriptions(this.inceptionRoot);
    const productFiles = await this.listFiles(this.productRoot, MARKDOWN_PATTERN);
    const sourceFiles = (await this.listFiles(this.sourceRoot, SOURCE_PATTERN)).filter(
      (filePath) => !filePath.startsWith(this.testRoot),
    );
    const testFiles = await this.listFiles(this.testRoot, SOURCE_PATTERN);

    const inputs: WorkItemStatusInput[] = [];
    for (const entry of entries) {
      const content = await readFile(path.join(this.rootDir, entry.descriptionPath), "utf8");
      let frontmatter: WorkItemFrontmatter | null;
      try {
        frontmatter = parseWorkItemFrontmatter(content);
      } catch (error) {
        if (error instanceof WorkItemFrontmatterValidationError) {
          console.warn(`[phasegate] warning: ${entry.descriptionPath} をスキップしました: ${error.message}`);
          continue;
        }
        throw error;
      }
      if (frontmatter === null) continue;

      const aliases = this.aliasesFor(frontmatter);
      const productReflectionPaths = await this.filesContainingAny(productFiles, aliases);
      const implementationPaths = await this.filesContainingAny(sourceFiles, aliases);
      const testPaths = await this.filesContainingAny(testFiles, aliases);
      const wiDir = path.posix.dirname(entry.descriptionPath);
      const existingInceptionArtifacts = await this.existingInceptionArtifacts(wiDir);

      inputs.push(Object.freeze({
        descriptionPath: entry.descriptionPath,
        directoryId: entry.directoryId,
        ownerUnit: entry.ownerUnit,
        frontmatter,
        requiredInceptionArtifacts: this.requiredInceptionArtifacts(frontmatter),
        existingInceptionArtifacts,
        affectedUnits: this.affectedUnits(entry.ownerUnit, frontmatter),
        productReflectionPaths,
        implementationPaths,
        testPaths,
      }));
    }
    return Object.freeze(inputs.sort((a, b) => a.descriptionPath.localeCompare(b.descriptionPath)));
  }

  async applyDerivedStatuses(
    reports: readonly WorkItemStatusReport[],
  ): Promise<WorkItemStatusApplyResult> {
    const updated: WorkItemStatusReport[] = [];
    const unchanged: WorkItemStatusReport[] = [];
    for (const report of reports) {
      if (!report.stale) {
        unchanged.push(report);
        continue;
      }
      const absolutePath = path.join(this.rootDir, report.descriptionPath);
      const content = await readFile(absolutePath, "utf8");
      const nextContent = this.replaceStatusLine(content, report.derivedStatus);
      await writeFile(absolutePath, nextContent, "utf8");
      updated.push(report);
    }
    return Object.freeze({
      updated: Object.freeze(updated),
      unchanged: Object.freeze(unchanged),
      blocked: Object.freeze([]),
    });
  }

  private async listDescriptions(relativeDir: string): Promise<readonly {
    readonly descriptionPath: string;
    readonly directoryId: string;
    readonly ownerUnit: string | null;
  }[]> {
    const results: {
      descriptionPath: string;
      directoryId: string;
      ownerUnit: string | null;
    }[] = [];
    await this.collectDescriptions(relativeDir, results);
    return results;
  }

  private async collectDescriptions(
    relativeDir: string,
    results: { descriptionPath: string; directoryId: string; ownerUnit: string | null }[],
  ): Promise<void> {
    let entries;
    try {
      entries = await readdir(path.join(this.rootDir, relativeDir), { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIPPED_DIRS.has(entry.name)) continue;
      const childDir = path.posix.join(relativeDir, entry.name);
      if (WI_DIR_PATTERN.test(entry.name)) {
        results.push({
          descriptionPath: path.posix.join(childDir, "description.md"),
          directoryId: entry.name,
          ownerUnit: this.ownerUnitFor(childDir),
        });
        continue;
      }
      await this.collectDescriptions(childDir, results);
    }
  }

  private ownerUnitFor(wiDir: string): string | null {
    const relative = wiDir.slice(this.inceptionRoot.length).replace(/^\/+/, "");
    const first = relative.split("/")[0];
    if (!first || first === "_cross") return null;
    return first;
  }

  private async listFiles(relativeDir: string, pattern: RegExp): Promise<readonly string[]> {
    const results: string[] = [];
    await this.collectFiles(relativeDir, pattern, results);
    return Object.freeze(results.sort());
  }

  private async collectFiles(relativeDir: string, pattern: RegExp, results: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(path.join(this.rootDir, relativeDir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      const childPath = path.posix.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        await this.collectFiles(childPath, pattern, results);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(childPath);
      }
    }
  }

  private async filesContainingAny(files: readonly string[], aliases: readonly string[]): Promise<readonly string[]> {
    const results: string[] = [];
    for (const filePath of files) {
      const content = await readFile(path.join(this.rootDir, filePath), "utf8");
      if (aliases.some((alias) => this.containsWorkItemAnnotation(content, alias))) {
        results.push(filePath);
      }
    }
    return Object.freeze(results);
  }

  private containsWorkItemAnnotation(content: string, alias: string): boolean {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`@(work-item-id|story-id|issue-id|story)\\s+[^\\n]*\\b${escaped}\\b`).test(content);
  }

  private aliasesFor(frontmatter: WorkItemFrontmatter): readonly string[] {
    return Object.freeze([frontmatter.id, frontmatter.legacyId].filter((value): value is string => Boolean(value)));
  }

  private requiredInceptionArtifacts(frontmatter: WorkItemFrontmatter): readonly string[] {
    switch (frontmatter.type) {
      case "story":
        return Object.freeze(["description.md", "logical_design.md", "domain_model.md", "unit_test_design.md"]);
      case "issue":
        return Object.freeze(["description.md", "logical_design.md", "domain_model.md"]);
      case "refactor":
        return Object.freeze(["description.md", "logical_design.md"]);
      case "fix":
      case "chore":
        return Object.freeze(["description.md"]);
    }
  }

  private async existingInceptionArtifacts(wiDir: string): Promise<readonly string[]> {
    try {
      const entries = await readdir(path.join(this.rootDir, wiDir), { withFileTypes: true });
      return Object.freeze(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
    } catch {
      return Object.freeze([]);
    }
  }

  private affectedUnits(ownerUnit: string | null, frontmatter: WorkItemFrontmatter): readonly string[] {
    if (frontmatter.affects && frontmatter.affects.length > 0) {
      return Object.freeze([...frontmatter.affects]);
    }
    if (ownerUnit) return Object.freeze([ownerUnit]);
    return Object.freeze([]);
  }

  private replaceStatusLine(content: string, status: string): string {
    if (!content.startsWith("---")) {
      throw new Error("description.md frontmatter is missing");
    }
    const frontmatterEnd = content.indexOf("\n---", 4);
    if (frontmatterEnd === -1) {
      throw new Error("description.md frontmatter is not closed");
    }
    const frontmatter = content.slice(0, frontmatterEnd);
    if (!/(\nstatus:\s*)[^\n]+/.test(frontmatter)) {
      throw new Error("description.md frontmatter status is missing");
    }
    const nextFrontmatter = frontmatter.replace(/(\nstatus:\s*)[^\n]+/, `$1${status}`);
    return nextFrontmatter + content.slice(frontmatterEnd);
  }
}
