// @unit ci-governance
// @layer infrastructure
// @work-item-id WI-368

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { InceptionTemplateRepositoryPort } from "../../domain/ports/inception-template-repository-port.js";
import type { InceptionDocKind } from "../../domain/value-objects/inception-doc-kind.js";

export class FileSystemInceptionTemplateRepositoryAdapter implements InceptionTemplateRepositoryPort {
  private readonly templatesDir: string;

  constructor(harnessRoot: string, subDir: string = "templates") {
    this.templatesDir = path.isAbsolute(subDir) ? subDir : path.join(harnessRoot, subDir);
  }

  resolvePath(kind: InceptionDocKind): string {
    return path.join(this.templatesDir, kind.templateFileName);
  }

  async read(kind: InceptionDocKind): Promise<string> {
    const filePath = this.resolvePath(kind);
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`テンプレートが見つかりません: ${filePath} (kind=${kind.value})`);
      }
      throw err;
    }
  }
}
