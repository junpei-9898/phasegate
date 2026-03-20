/**
 * @layer domain
 * @unit config-foundation
 *
 * project.preset が許可列挙値に一致しない場合のエラー
 */
import { ConfigFoundationDomainError } from './config-foundation-domain-error.js';

export class InvalidPresetError extends ConfigFoundationDomainError {
  constructor(value: string) {
    super(
      `Invalid preset value: "${value}". Allowed values are: minimal, standard, strict [L1-002]`,
      'L1-002',
    );
    this.name = 'InvalidPresetError';
  }
}
