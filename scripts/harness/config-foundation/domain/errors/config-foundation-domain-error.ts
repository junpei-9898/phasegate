/**
 * @layer domain
 * @unit config-foundation
 *
 * config-foundation ドメイン層の基底エラークラス
 */
export class ConfigFoundationDomainError extends Error {
  readonly errorCode: string;

  constructor(message: string, errorCode: string) {
    super(message);
    this.name = 'ConfigFoundationDomainError';
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
