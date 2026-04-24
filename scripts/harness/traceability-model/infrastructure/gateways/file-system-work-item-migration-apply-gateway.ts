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
    if (content.startsWith("---\n")) return;
    await writeFile(descriptionPath, `${frontmatterPreview}\n\n${content}`, "utf8");
  }
}

async function assertPathDoesNotExist(targetPath: string): Promise<void> {
  try {
    await access(targetPath);
  } catch {
    return;
  }
  throw new Error(`Path already exists: ${targetPath}`);
}
