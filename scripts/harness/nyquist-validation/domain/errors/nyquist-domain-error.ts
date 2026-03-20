/**
 * @layer domain
 * @unit nyquist-validation
 *
 * Nyquist検証ドメインエラーの基底クラス
 */

export class NyquistDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NyquistDomainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
