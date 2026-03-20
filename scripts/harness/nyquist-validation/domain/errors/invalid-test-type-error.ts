/**
 * @layer domain
 * @unit nyquist-validation
 *
 * testType が unit | it | scenario 以外の場合のエラー
 */
import { NyquistDomainError } from './nyquist-domain-error.js';

export class InvalidTestTypeError extends NyquistDomainError {
  constructor(testType: string) {
    super(`testTypeはunit、it、scenarioのいずれかで指定してください: ${testType}`);
    this.name = 'InvalidTestTypeError';
  }
}
