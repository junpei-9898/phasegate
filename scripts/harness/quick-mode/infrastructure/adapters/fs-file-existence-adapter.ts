/**
 * @layer infrastructure
 * @unit quick-mode
 * @work-item-id WI-334
 *
 * FileExistencePort の fs 実装。
 * 相対パスは baseDir（既定: process.cwd()）基準で解決する。
 * stat が ENOENT / ENOTDIR 以外で失敗した場合（権限エラー等）は
 * 「存在する」扱いにして呼び出し側の changeKind 推定を MODIFY 既定
 * （従来どおりの安全側）に倒す。
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FileExistencePort } from "../../application/ports/file-existence-port.js";

export class FsFileExistenceAdapter implements FileExistencePort {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? process.cwd();
  }

  async exists(filePath: string): Promise<boolean> {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath);
    try {
      await fs.stat(absolutePath);
      return true;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        return false;
      }
      // stat 失敗（権限等）は存在扱い → changeKind は従来どおり MODIFY 既定（安全側）
      return true;
    }
  }
}
