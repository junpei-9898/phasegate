/**
 * @layer domain
 * @unit nyquist-validation
 *
 * AC ID が AC-{n} 形式に違反している場合のエラー
 */
import { NyquistDomainError } from './nyquist-domain-error.js';

export class InvalidAcIdFormatError extends NyquistDomainError {
  constructor(acId: string) {
    super(`acIdはAC-{正整数}形式で指定してください（ゼロパディング不可）: ${acId}`);
    this.name = 'InvalidAcIdFormatError';
  }
}
