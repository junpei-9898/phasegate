/**
 * @layer domain
 * @unit config-foundation
 *
 * 入力ドキュメントがドメイン不変条件を満たさない場合のエラー
 */
import { ConfigFoundationDomainError } from './config-foundation-domain-error.js';

export class ConfigValidationError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-001]`, 'L1-001');
    this.name = 'ConfigValidationError';
  }
}
