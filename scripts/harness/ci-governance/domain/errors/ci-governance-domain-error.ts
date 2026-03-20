/**
 * @layer domain
 * @unit ci-governance
 *
 * CiGovernanceDomainError - ドメイン層エラー
 */

export class CiGovernanceDomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CiGovernanceDomainError';
    this.code = code;
  }
}
