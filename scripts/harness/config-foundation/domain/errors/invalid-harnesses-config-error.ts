/**
 * @layer domain
 * @unit config-foundation
 *
 * harnesses セクションの構造や値が HarnessesConfig の制約に違反する場合のエラー
 */
import { ConfigFoundationDomainError } from './config-foundation-domain-error.js';

export class InvalidHarnessesConfigError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-003]`, 'L1-003');
    this.name = 'InvalidHarnessesConfigError';
  }
}
