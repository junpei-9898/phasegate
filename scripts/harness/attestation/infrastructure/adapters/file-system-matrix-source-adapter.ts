// @unit attestation
// @layer infrastructure

import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { MatrixSourcePort } from "../../application/ports/matrix-source-port.js";

/**
 * MatrixSourcePort の node:fs 実装（H16-03 / WI-227）。
 * requirement-test-matrix.json を読み込み parse して返す。
 * 不在・parse 不能は throw する（呼び出し側 usecase が fail-closed / [] に変換する）。
 */
export class FileSystemMatrixSourceAdapter implements MatrixSourcePort {
  constructor(
    private readonly baseDir: string,
    private readonly defaultMatrixPath = ".harness/requirement-test-matrix.json",
  ) {}

  async load(matrixFilePath?: string): Promise<unknown> {
    const rel = matrixFilePath && matrixFilePath.length > 0 ? matrixFilePath : this.defaultMatrixPath;
    const absPath = isAbsolute(rel) ? rel : resolve(this.baseDir, rel);
    const raw = await readFile(absPath, "utf8");
    return JSON.parse(raw);
  }
}
