/**
 * @layer domain
 * @unit nyquist-validation
 *
 * requirement-test-matrix.json ファイルI/Oポート
 */

export interface MatrixFilePort {
  read(filePath: string): Promise<unknown>;
  write(filePath: string, data: unknown): Promise<void>;
}
