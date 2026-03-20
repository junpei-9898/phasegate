/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from './file-path.js';
import { RuleName } from './rule-name.js';

export type RuleViolationSeverity = 'error' | 'warning';

type RuleViolationProps = {
  readonly filePath: FilePath;
  readonly line: number;
  readonly column: number;
  readonly ruleName: RuleName;
  readonly message: string;
  readonly severity: RuleViolationSeverity;
  readonly fixExample?: string | null;
};

const VALID_SEVERITIES = new Set<RuleViolationSeverity>(['error', 'warning']);

export class RuleViolation {
  readonly filePath: FilePath;
  readonly line: number;
  readonly column: number;
  readonly ruleName: RuleName;
  readonly message: string;
  readonly severity: RuleViolationSeverity;
  readonly fixExample: string | null;

  private constructor(props: Required<RuleViolationProps>) {
    this.filePath = props.filePath;
    this.line = props.line;
    this.column = props.column;
    this.ruleName = props.ruleName;
    this.message = props.message;
    this.severity = props.severity;
    this.fixExample = props.fixExample;
  }

  static create(props: RuleViolationProps): RuleViolation {
    if (props.line < 1) {
      throw new Error('line must be greater than or equal to 1');
    }

    if (props.column < 1) {
      throw new Error('column must be greater than or equal to 1');
    }

    if (props.message.length === 0) {
      throw new Error('message must not be empty');
    }

    if (!VALID_SEVERITIES.has(props.severity)) {
      throw new Error(`Invalid rule violation severity: ${props.severity}`);
    }

    return Object.freeze(
      new RuleViolation({
        ...props,
        fixExample: props.fixExample ?? null,
      })
    );
  }

  equals(other: RuleViolation): boolean {
    return (
      this.filePath.equals(other.filePath) &&
      this.line === other.line &&
      this.column === other.column &&
      this.ruleName.equals(other.ruleName) &&
      this.message === other.message &&
      this.severity === other.severity &&
      this.fixExample === other.fixExample
    );
  }

  withFixExample(fixExample: string): RuleViolation {
    return RuleViolation.create({
      filePath: this.filePath,
      line: this.line,
      column: this.column,
      ruleName: this.ruleName,
      message: this.message,
      severity: this.severity,
      fixExample,
    });
  }

  toContract(): {
    filePath: string;
    line: number;
    column: number;
    ruleName: string;
    message: string;
    severity: RuleViolationSeverity;
    fix_example?: string;
  } {
    const contract = {
      filePath: this.filePath.toString(),
      line: this.line,
      column: this.column,
      ruleName: this.ruleName.toString(),
      message: this.message,
      severity: this.severity,
    };

    if (this.fixExample === null) {
      return contract;
    }

    return {
      ...contract,
      fix_example: this.fixExample,
    };
  }
}
