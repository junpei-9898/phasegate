/**
 * @layer domain
 * @unit harness-error
 *
 * harness-error ドメイン層の基底エラークラス
 */
export class HarnessErrorDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HarnessErrorDomainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
