// @unit traceability-model
// @layer infrastructure

import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { WorkItemMigrationApplyPort } from "../../domain/ports/work-item-migration-apply-port.js";
import type {
  WorkItemMigrationAppliedCandidate,
  WorkItemMigrationCandidate,
} from "../../domain/value-objects/work-item-migration-candidate.js";

export interface FileSystemWorkItemMigrationApplyGatewayDeps {
  readonly rootDir: string;
}

export class FileSystemWorkItemMigrationApplyGateway implements WorkItemMigrationApplyPort {
  private readonly rootDir: string;

  constructor(deps: FileSystemWorkItemMigrationApplyGatewayDeps) {
    this.rootDir = deps.rootDir;
  }

  async apply(candidate: WorkItemMigrationCandidate): Promise<WorkItemMigrationAppliedCandidate> {
    const sourceDir = path.join(this.rootDir, candidate.sourcePath);
    const targetDir = path.join(this.rootDir, candidate.targetPath);

    await assertPathDoesNotExist(targetDir);
    await mkdir(path.dirname(targetDir), { recursive: true });
    await rename(sourceDir, targetDir);

    const descriptionPath = await this.normalizeDescriptionFile(targetDir, candidate);
    await this.ensureFrontmatter(descriptionPath, candidate.frontmatterPreview);

    return Object.freeze({
      legacyId: candidate.legacyId,
      nextId: candidate.nextId,
      sourcePath: candidate.sourcePath,
      targetPath: candidate.targetPath,
      descriptionPath: path.posix.join(candidate.targetPath, "description.md"),
    });
  }

  private async normalizeDescriptionFile(targetDir: string, candidate: WorkItemMigrationCandidate): Promise<string> {
    const descriptionPath = path.join(targetDir, "description.md");
    if (candidate.descriptionFileName === "description.md") {
      return descriptionPath;
    }

    await assertPathDoesNotExist(descriptionPath);
    if (candidate.descriptionFileName === null) {
      await writeFile(descriptionPath, `# ${candidate.legacyId}\n`, "utf8");
      return descriptionPath;
    }

    await rename(path.join(targetDir, candidate.descriptionFileName), descriptionPath);
    return descriptionPath;
  }

  private async ensureFrontmatter(descriptionPath: string, frontmatterPreview: string): Promise<void> {
    const content = await readFile(descriptionPath, "utf8");
    const existing = parseFrontmatter(content);

    if (existing === null) {
      await writeFile(descriptionPath, `${frontmatterPreview}\n\n${content}`, "utf8");
      return;
    }

    if (matchesPlannerFrontmatter(existing.frontmatter, frontmatterPreview)) {
      return;
    }

    const body = content.slice(existing.length).replace(/^\s+/, "");
    await writeFile(descriptionPath, `${frontmatterPreview}\n\n${body}`, "utf8");
  }
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const ID_PATTERN = /^id:\s*(\S+)\s*$/m;
const LEGACY_ID_PATTERN = /^legacy_id:\s*(\S+)\s*$/m;

function parseFrontmatter(content: string): { readonly frontmatter: string; readonly length: number } | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return null;
  return { frontmatter: match[1], length: match[0].length };
}

function matchesPlannerFrontmatter(existing: string, preview: string): boolean {
  const previewMatch = FRONTMATTER_PATTERN.exec(`${preview}\n`);
  if (!previewMatch) return false;
  const previewBody = previewMatch[1];

  const previewId = ID_PATTERN.exec(previewBody)?.[1];
  const existingId = ID_PATTERN.exec(existing)?.[1];
  if (previewId === undefined || previewId !== existingId) return false;

  const previewLegacy = LEGACY_ID_PATTERN.exec(previewBody)?.[1];
  if (previewLegacy === undefined) return true;

  const existingLegacy = LEGACY_ID_PATTERN.exec(existing)?.[1];
  return existingLegacy === previewLegacy;
}

async function assertPathDoesNotExist(targetPath: string): Promise<void> {
  try {
    await access(targetPath);
  } catch {
    return;
  }
  throw new Error(`Path already exists: ${targetPath}`);
}
