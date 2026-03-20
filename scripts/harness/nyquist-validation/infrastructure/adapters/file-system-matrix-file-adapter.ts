/**
 * @layer infrastructure
 * @unit nyquist-validation
 *
 * MatrixFilePort 実装: Node.js ファイルシステム
 */
import { readFile, writeFile } from 'node:fs/promises';
import type { MatrixFilePort } from '../../domain/ports/matrix-file-port.js';
import { MatrixValidationFailedError } from '../../domain/errors/matrix-validation-failed-error.js';

export class FileSystemMatrixFileAdapter implements MatrixFilePort {
  async read(filePath: string): Promise<unknown> {
    const raw = await readFile(filePath, 'utf-8');
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new MatrixValidationFailedError(`JSONパース失敗: ${String(err)}`);
    }
  }

  async write(filePath: string, data: unknown): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await writeFile(filePath, json, 'utf-8');
  }
}
