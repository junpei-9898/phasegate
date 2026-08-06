// @unit ci-governance
// @layer infrastructure
// @work-item-id WI-368

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { InceptionDocWriterPort } from "../../domain/ports/inception-doc-writer-port.js";
import {
  DEFAULT_INCEPTION_DOC_ROOTS,
  type InceptionDocKind,
  type InceptionDocRoots,
} from "../../domain/value-objects/inception-doc-kind.js";

export class FileSystemInceptionDocWriterAdapter implements InceptionDocWriterPort {
  private readonly baseDir: string;
  private readonly roots: InceptionDocRoots;

  constructor(baseDir: string, roots: InceptionDocRoots = DEFAULT_INCEPTION_DOC_ROOTS) {
    this.baseDir = baseDir;
    this.roots = roots;
  }

  resolvePath(kind: InceptionDocKind): string {
    return path.join(this.baseDir, kind.relativeTargetPath(this.roots));
  }

  async exists(kind: InceptionDocKind): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(kind));
      return true;
    } catch {
      return false;
    }
  }

  async write(kind: InceptionDocKind, content: string): Promise<string> {
    const targetPath = this.resolvePath(kind);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf-8");
    return targetPath;
  }
}
