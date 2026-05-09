// @unit traceability-model
// @layer infrastructure
// @work-item-id WI-106

import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import type {
  WorkItemIdentityEntry,
  WorkItemIdentityPort,
} from "../../domain/ports/work-item-identity-port.js";
import { parseWorkItemFrontmatter } from "../parsers/work-item-frontmatter-parser.js";

const WI_DIR_PATTERN = /^WI-\d+$/;
const SKIPPED_DIRS = new Set(["archive", "_shared", "_operation", "share"]);

export interface FileSystemWorkItemIdentityGatewayDeps {
  readonly rootDir: string;
  readonly inceptionRoot?: string;
}

export class FileSystemWorkItemIdentityGateway implements WorkItemIdentityPort {
  private readonly rootDir: string;
  private readonly inceptionRoot: string;

  constructor(deps: FileSystemWorkItemIdentityGatewayDeps) {
    this.rootDir = deps.rootDir;
    this.inceptionRoot = deps.inceptionRoot ?? "docs/inception";
  }

  async listWorkItemIdentities(): Promise<readonly WorkItemIdentityEntry[]> {
    const results: WorkItemIdentityEntry[] = [];
    await this.collect(this.inceptionRoot, results);
    return Object.freeze(results.sort((a, b) => a.filePath.localeCompare(b.filePath)));
  }

  private async collect(relativeDir: string, results: WorkItemIdentityEntry[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(path.join(this.rootDir, relativeDir), { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIPPED_DIRS.has(entry.name)) continue;

      const childDir = path.posix.join(relativeDir, entry.name);
      if (WI_DIR_PATTERN.test(entry.name)) {
        const descriptionPath = path.posix.join(childDir, "description.md");
        const frontmatter = await this.readFrontmatterId(descriptionPath);
        if (frontmatter !== null) {
          results.push({
            filePath: descriptionPath,
            directoryId: entry.name,
            frontmatterId: frontmatter,
          });
        }
        continue;
      }

      await this.collect(childDir, results);
    }
  }

  private async readFrontmatterId(descriptionPath: string): Promise<string | null> {
    try {
      const content = await readFile(path.join(this.rootDir, descriptionPath), "utf8");
      return parseWorkItemFrontmatter(content)?.id ?? null;
    } catch {
      return null;
    }
  }
}
