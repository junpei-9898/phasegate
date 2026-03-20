/**
 * @layer domain
 * @unit adr-foundation
 */
const VALIDATOR_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ERROR_CODE_PATTERN = /^L[0-4]-\d{3,}$/;

export type ArchgateEntryProps = Readonly<{
  validatorId?: string;
  validator_id?: string;
  errorCode?: string;
  error_code?: string;
}>;

export class InvalidArchgateValidatorIdError extends Error {
  constructor(value: string) {
    super(`validator_idはkebab-caseで指定してください: ${value}`);
    this.name = 'InvalidArchgateValidatorIdError';
  }
}

export class InvalidArchgateErrorCodeError extends Error {
  constructor(value: string) {
    super(`error_codeはL0-L4レイヤーのHarness Error形式で指定してください: ${value}`);
    this.name = 'InvalidArchgateErrorCodeError';
  }
}

export class ArchgateEntry {
  readonly validatorId: string;
  readonly validator_id: string;
  readonly errorCode: string;
  readonly error_code: string;

  private constructor(validatorId: string, errorCode: string) {
    this.validatorId = validatorId;
    this.validator_id = validatorId;
    this.errorCode = errorCode;
    this.error_code = errorCode;
    Object.freeze(this);
  }

  static create(props: ArchgateEntryProps): ArchgateEntry {
    const validatorId = props.validatorId ?? props.validator_id ?? '';
    const errorCode = props.errorCode ?? props.error_code ?? '';

    if (!VALIDATOR_ID_PATTERN.test(validatorId)) {
      throw new InvalidArchgateValidatorIdError(validatorId);
    }

    if (!ERROR_CODE_PATTERN.test(errorCode)) {
      throw new InvalidArchgateErrorCodeError(errorCode);
    }

    return new ArchgateEntry(validatorId, errorCode);
  }

  matchesValidatorId(value: string): boolean {
    return this.validatorId === value;
  }

  matchesErrorCode(value: string): boolean {
    return this.errorCode === value;
  }

  equals(other: ArchgateEntry): boolean {
    return this.validatorId === other.validatorId && this.errorCode === other.errorCode;
  }
}
