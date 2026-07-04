// @unit attestation
// @layer infrastructure

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { AttestationDocument } from "../../application/dto/attestation-document.js";
import type { AttestationRepositoryPort } from "../../application/ports/attestation-repository-port.js";

/**
 * AttestationRepositoryPort の node:fs 実装。
 * write は親ディレクトリを作成し、2スペース整形 JSON + 改行で書き出す。
 * read は readFile + JSON.parse。不在/parse 失敗はそのまま throw し usecase が exitCode 2 へ変換する。
 */
export class FileSystemAttestationRepositoryAdapter implements AttestationRepositoryPort {
  constructor(private readonly baseDir: string) {}

  async write(path: string, doc: AttestationDocument): Promise<void> {
    const absPath = this.resolvePath(path);
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  }

  async read(path: string): Promise<unknown> {
    const absPath = this.resolvePath(path);
    const raw = await readFile(absPath, "utf8");
    return JSON.parse(raw);
  }

  private resolvePath(path: string): string {
    return isAbsolute(path) ? path : resolve(this.baseDir, path);
  }
}
