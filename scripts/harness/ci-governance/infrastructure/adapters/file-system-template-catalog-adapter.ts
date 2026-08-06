// @unit ci-governance
// @layer infrastructure
// @work-item-id WI-367

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { TemplateCatalogPort } from "../../domain/ports/template-catalog-port.js";
import { TemplateCatalogEntry } from "../../domain/value-objects/template-catalog-entry.js";
import type { TemplateName } from "../../domain/value-objects/template-name.js";

/**
 * `harnessRoot/templates` を readdir して catalog を組み立てる。
 *
 * `read()` は catalog エントリの `fileName`（readdir 由来）だけを join する。
 * 引数の `TemplateName` は照合キーとしてのみ使われ、パス構成要素にならないため
 * `../` を含む入力があっても templatesDir の外へは出られない。
 */
export class FileSystemTemplateCatalogAdapter implements TemplateCatalogPort {
  private readonly templatesDir: string;

  constructor(harnessRoot: string, subDir: string = "templates") {
    this.templatesDir = path.isAbsolute(subDir) ? subDir : path.join(harnessRoot, subDir);
  }

  directoryPath(): string {
    return this.templatesDir;
  }

  async list(): Promise<readonly TemplateCatalogEntry[]> {
    let dirEntries: import("node:fs").Dirent[];
    try {
      dirEntries = await fs.readdir(this.templatesDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const entries: TemplateCatalogEntry[] = [];
    for (const dirEntry of dirEntries) {
      if (!dirEntry.isFile()) continue;
      const entry = TemplateCatalogEntry.fromFileName(dirEntry.name);
      if (entry === null) continue;
      entries.push(entry);
    }

    // name 昇順（同名は fileName で決定的に）。表示・照合ともに name が主キーであるため。
    entries.sort((a, b) => {
      if (a.name.value !== b.name.value) return a.name.value < b.name.value ? -1 : 1;
      return a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0;
    });
    return entries;
  }

  async read(name: TemplateName): Promise<string | null> {
    const entries = await this.list();
    const matched = entries.find((entry) => entry.name.value === name.value);
    if (matched === undefined) return null;

    return await fs.readFile(path.join(this.templatesDir, matched.fileName), "utf-8");
  }
}
