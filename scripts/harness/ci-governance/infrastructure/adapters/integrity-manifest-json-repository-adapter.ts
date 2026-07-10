// @unit ci-governance
// @layer infrastructure

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { IntegrityManifestRepositoryPort } from "../../domain/ports/integrity-manifest-repository-port.js";
import { IntegrityManifest } from "../../domain/value-objects/integrity-manifest.js";

interface IntegrityJsonV1 {
  readonly version: 1;
  readonly algorithm: "sha256";
  readonly files: Readonly<Record<string, string>>;
}

/**
 * phasegate.integrity.json（ルート）の読み書きアダプタ。
 * files は path 昇順キーで決定的に書き出す。
 */
export class IntegrityManifestJsonRepositoryAdapter implements IntegrityManifestRepositoryPort {
  private readonly filePath: string;

  constructor(baseDir: string, relativePath = "phasegate.integrity.json") {
    this.filePath = path.isAbsolute(relativePath) ? relativePath : path.join(baseDir, relativePath);
  }

  getPath(): string {
    return this.filePath;
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async save(manifest: IntegrityManifest): Promise<string> {
    const files: Record<string, string> = {};
    for (const [p, digest] of manifest.sortedEntries()) {
      files[p] = digest;
    }
    const data: IntegrityJsonV1 = {
      version: 1,
      algorithm: "sha256",
      files,
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
    return this.filePath;
  }

  async load(): Promise<IntegrityManifest | null> {
    let content: string;
    try {
      content = await fs.readFile(this.filePath, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }

    let parsed: IntegrityJsonV1;
    try {
      parsed = JSON.parse(content) as IntegrityJsonV1;
    } catch (err) {
      throw new Error(`Invalid integrity JSON at ${this.filePath}: ${String(err)}`);
    }

    if (
      !parsed ||
      parsed.version !== 1 ||
      parsed.algorithm !== "sha256" ||
      typeof parsed.files !== "object" ||
      parsed.files === null
    ) {
      throw new Error(`Invalid integrity JSON schema at ${this.filePath}`);
    }

    const files = new Map<string, string>(Object.entries(parsed.files));
    return IntegrityManifest.create({ files });
  }
}
