/**
 * @layer domain
 * @unit config-foundation
 *
 * Feature Registry に存在しない機能名を操作しようとした場合のエラー
 */
import { ConfigFoundationDomainError } from './config-foundation-domain-error.js';

export class UnsupportedFeatureError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-004]`, 'L1-004');
    this.name = 'UnsupportedFeatureError';
  }
}
