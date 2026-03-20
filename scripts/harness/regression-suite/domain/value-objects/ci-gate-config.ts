import type { SuiteId } from './suite-id.js';

export type ExecutionMode = 'parallel' | 'sequential';

export interface CiGateConfigProps {
  requiredSuiteIds: SuiteId[];
  coverageThreshold: number;
  executionMode: ExecutionMode;
}

export class CiGateConfig {
  readonly requiredSuiteIds: ReadonlyArray<SuiteId>;
  readonly coverageThreshold: number;
  readonly executionMode: ExecutionMode;

  private constructor(props: CiGateConfigProps) {
    this.requiredSuiteIds = Object.freeze([...props.requiredSuiteIds]);
    this.coverageThreshold = props.coverageThreshold;
    this.executionMode = props.executionMode;
    Object.freeze(this);
  }

  static create(props: CiGateConfigProps): CiGateConfig {
    if (props.coverageThreshold <= 0 || props.coverageThreshold > 100) {
      throw new Error(
        `InvalidCoverageThresholdError: coverageThreshold must be > 0 and <= 100, got ${props.coverageThreshold}`
      );
    }
    if (!props.requiredSuiteIds || props.requiredSuiteIds.length === 0) {
      throw new Error('InvalidCiGateConfigError: requiredSuiteIds must have at least one entry');
    }
    return new CiGateConfig(props);
  }

  isRequired(suiteId: SuiteId): boolean {
    return this.requiredSuiteIds.some((id) => id.equals(suiteId));
  }

  equals(other: CiGateConfig): boolean {
    return (
      this.coverageThreshold === other.coverageThreshold &&
      this.executionMode === other.executionMode &&
      JSON.stringify(this.requiredSuiteIds.map((id) => id.value)) ===
        JSON.stringify(other.requiredSuiteIds.map((id) => id.value))
    );
  }
}
