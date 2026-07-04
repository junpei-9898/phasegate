// @unit attestation
// @layer infrastructure

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { SourceDigesterPort } from "../../application/ports/source-digester-port.js";
import { Digest } from "../../domain/value-objects/digest.js";

/**
 * SourceDigesterPort の node:fs 実装。
 * source パスの「現在の」内容を読み、sha256 Digest を返す。
 * ci-governance の file-system-sha1-hasher-adapter をミラーするが、アルゴリズムは sha256。
 *
 * 不在ファイルは readFile が throw する。verify 時は usecase が本 throw を捕捉し
 * inputHashes チェックの失敗（mismatch）として扱う（クラッシュではない）。
 */
export class FileSystemSourceDigesterAdapter implements SourceDigesterPort {
  constructor(private readonly baseDir: string) {}

  async digestFile(path: string): Promise<Digest> {
    const absPath = isAbsolute(path) ? path : resolve(this.baseDir, path);
    const content = await readFile(absPath);
    const hex = createHash("sha256").update(content).digest("hex");
    return Digest.fromSha256Hex(hex);
  }
}
