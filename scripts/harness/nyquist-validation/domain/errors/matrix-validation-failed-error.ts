/**
 * @layer domain
 * @unit nyquist-validation
 *
 * JSONスキーマバリデーション失敗時のエラー
 */
import { NyquistDomainError } from './nyquist-domain-error.js';

export class MatrixValidationFailedError extends NyquistDomainError {
  constructor(message: string) {
    super(`matrixバリデーションが失敗しました: ${message}`);
    this.name = 'MatrixValidationFailedError';
  }
}
