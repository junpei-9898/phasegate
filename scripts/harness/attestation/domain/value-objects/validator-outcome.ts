// @unit attestation
// @layer domain

export interface ValidatorOutcomeProps {
  readonly validatorId: string;
  readonly passed: boolean;
  readonly skipped?: boolean;
}

/**
 * ci-check の1バリデータ結果を写す値オブジェクト。
 * `{ validatorId, passed, skipped }`。skipped 未指定は false に正規化する。
 */
export class ValidatorOutcome {
  readonly validatorId: string;
  readonly passed: boolean;
  readonly skipped: boolean;

  private constructor(validatorId: string, passed: boolean, skipped: boolean) {
    this.validatorId = validatorId;
    this.passed = passed;
    this.skipped = skipped;
    Object.freeze(this);
  }

  static create(props: ValidatorOutcomeProps): ValidatorOutcome {
    if (typeof props.validatorId !== "string" || props.validatorId.length === 0) {
      throw new Error("ValidatorOutcome: validatorId must not be empty");
    }
    if (typeof props.passed !== "boolean") {
      throw new Error("ValidatorOutcome: passed must be a boolean");
    }
    return new ValidatorOutcome(props.validatorId, props.passed, props.skipped === true);
  }

  /** allPassed 規則: passed または skipped ならグリーン。 */
  isGreen(): boolean {
    return this.passed || this.skipped;
  }

  equals(other: ValidatorOutcome): boolean {
    return this.validatorId === other.validatorId && this.passed === other.passed && this.skipped === other.skipped;
  }
}
