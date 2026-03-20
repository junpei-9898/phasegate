/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface PhaseGateResultCreateArgs {
  readonly passed: boolean;
  readonly blockers: readonly string[];
  readonly warnings?: readonly string[];
  readonly auditPayload?: Record<string, unknown>;
}

export class PhaseGateResult {
  readonly passed: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly auditPayload?: Record<string, unknown>;

  private constructor(args: {
    readonly passed: boolean;
    readonly blockers: readonly string[];
    readonly warnings: readonly string[];
    readonly auditPayload?: Record<string, unknown>;
  }) {
    this.passed = args.passed;
    this.blockers = Object.freeze([...args.blockers]);
    this.warnings = Object.freeze([...args.warnings]);
    this.auditPayload = args.auditPayload;
    Object.freeze(this);
  }

  static create(args: PhaseGateResultCreateArgs): PhaseGateResult {
    if (!args.passed && args.blockers.length === 0) {
      throw new Error('passed=false の場合はblockersが必要です');
    }

    return new PhaseGateResult({
      passed: args.passed,
      blockers: args.blockers,
      warnings: args.warnings ?? Object.freeze([]),
      auditPayload: args.auditPayload,
    });
  }

  isBlocked(): boolean {
    return !this.passed;
  }

  hasAuditTrail(): boolean {
    return this.auditPayload !== undefined;
  }

  equals(other: PhaseGateResult): boolean {
    const auditEquals =
      JSON.stringify(this.auditPayload ?? null) === JSON.stringify(other.auditPayload ?? null);

    if (
      this.passed !== other.passed ||
      this.blockers.length !== other.blockers.length ||
      this.warnings.length !== other.warnings.length ||
      !auditEquals
    ) {
      return false;
    }

    return (
      this.blockers.every((entry, index) => entry === other.blockers[index]) &&
      this.warnings.every((entry, index) => entry === other.warnings[index])
    );
  }
}
