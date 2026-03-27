// @unit agent-integration
// @layer domain

export class PhaseGateQueryResultInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhaseGateQueryResultInvariantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PhaseGateQueryResult {
  readonly passed: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];

  private constructor(passed: boolean, blockers: readonly string[], warnings: readonly string[]) {
    this.passed = passed;
    this.blockers = Object.freeze([...blockers]);
    this.warnings = Object.freeze([...warnings]);
  }

  static create(
    passed: boolean,
    blockers: string[],
    warnings: string[]
  ): PhaseGateQueryResult {
    if (!passed && blockers.length === 0) {
      throw new PhaseGateQueryResultInvariantError(
        'passed=falseの場合、blockersは1件以上必要です'
      );
    }

    return new PhaseGateQueryResult(passed, blockers, warnings);
  }

  hasPassed(): boolean {
    return this.passed;
  }

  getBlockers(): readonly string[] {
    return this.blockers;
  }

  getWarnings(): readonly string[] {
    return this.warnings;
  }

  equals(other: PhaseGateQueryResult): boolean {
    if (this.passed !== other.passed) {
      return false;
    }

    if (this.blockers.length !== other.blockers.length) {
      return false;
    }

    if (this.warnings.length !== other.warnings.length) {
      return false;
    }

    return (
      this.blockers.every((blocker, index) => blocker === other.blockers[index]) &&
      this.warnings.every((warning, index) => warning === other.warnings[index])
    );
  }
}
