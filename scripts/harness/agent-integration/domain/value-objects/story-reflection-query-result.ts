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

  static pass(): StoryReflectionQueryResult {
    return new StoryReflectionQueryResult(true, [], [], false);
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
