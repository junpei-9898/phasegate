// @unit agent-integration
// @layer domain

export class StoryReflectionQueryResultInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoryReflectionQueryResultInvariantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StoryReflectionQueryResult {
  readonly passed: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly skipped: boolean;
  declare readonly sessionEnforced?: true;

  private constructor(
    passed: boolean,
    blockers: readonly string[],
    warnings: readonly string[],
    skipped: boolean,
  ) {
    this.passed = passed;
    this.blockers = Object.freeze([...blockers]);
    this.warnings = Object.freeze([...warnings]);
    this.skipped = skipped;
  }

  static pass(warnings: string[] = []): StoryReflectionQueryResult {
    return new StoryReflectionQueryResult(true, [], warnings, false);
  }

  static skipped(warnings: string[] = []): StoryReflectionQueryResult {
    return new StoryReflectionQueryResult(true, [], warnings, true);
  }

  static block(blockers: string[], warnings: string[]): StoryReflectionQueryResult {
    if (blockers.length === 0) {
      throw new StoryReflectionQueryResultInvariantError(
        'passed=falseの場合、blockersは1件以上必要です',
      );
    }

    return new StoryReflectionQueryResult(false, blockers, warnings, false);
  }

  /** Only trusted configuration readers may mark the optional session enforcement path. */
  withSessionEnforcement(): StoryReflectionQueryResult {
    return Object.assign(new StoryReflectionQueryResult(this.passed, this.blockers, this.warnings, this.skipped), {
      sessionEnforced: true as const,
    });
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

  isSkipped(): boolean {
    return this.skipped;
  }
}
