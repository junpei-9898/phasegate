/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { RuleName } from './rule-name.js';
import { RuleViolation } from './rule-violation.js';

type LintReportProps = {
  readonly violations: readonly RuleViolation[];
  readonly passedRules: readonly RuleName[];
  readonly skippedRules: readonly RuleName[];
  readonly durationMs: number;
  readonly scannedFiles: number;
};

export class LintReport {
  readonly violations: readonly RuleViolation[];
  readonly passedRules: readonly RuleName[];
  readonly skippedRules: readonly RuleName[];
  readonly durationMs: number;
  readonly scannedFiles: number;

  private constructor(props: LintReportProps) {
    this.violations = props.violations;
    this.passedRules = props.passedRules;
    this.skippedRules = props.skippedRules;
    this.durationMs = props.durationMs;
    this.scannedFiles = props.scannedFiles;
  }

  static create(props: LintReportProps): LintReport {
    if (props.durationMs < 0) {
      throw new Error('durationMs must be greater than or equal to zero');
    }

    if (props.scannedFiles < 0) {
      throw new Error('scannedFiles must be greater than or equal to zero');
    }

    return Object.freeze(
      new LintReport({
        violations: Object.freeze([...props.violations]),
        passedRules: Object.freeze([...props.passedRules]),
        skippedRules: Object.freeze([...props.skippedRules]),
        durationMs: props.durationMs,
        scannedFiles: props.scannedFiles,
      })
    );
  }

  hasErrors(): boolean {
    return this.violations.some((violation) => violation.severity === 'error');
  }

  errorCount(): number {
    return this.violations.filter((violation) => violation.severity === 'error').length;
  }

  warningCount(): number {
    return this.violations.filter((violation) => violation.severity === 'warning').length;
  }

  violationCount(): number {
    return this.violations.length;
  }
}
