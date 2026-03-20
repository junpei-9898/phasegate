/**
 * @layer domain
 * @unit traceability-model
 */

export interface TraceabilityHarnessError {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly fix_example?: string;
}

export interface MetadataValidationResultSuccessArgs {
  readonly warnings?: readonly TraceabilityHarnessError[];
}

export interface MetadataValidationResultFailureArgs {
  readonly errors: readonly TraceabilityHarnessError[];
  readonly warnings?: readonly TraceabilityHarnessError[];
}

const errorEquals = (
  left: TraceabilityHarnessError,
  right: TraceabilityHarnessError,
): boolean =>
  left.code === right.code &&
  left.severity === right.severity &&
  left.message === right.message &&
  left.suggestion === right.suggestion &&
  left.fix_example === right.fix_example;

export class MetadataValidationResult {
  readonly valid: boolean;
  readonly errors: readonly TraceabilityHarnessError[];
  readonly warnings: readonly TraceabilityHarnessError[];

  private constructor(args: {
    readonly valid: boolean;
    readonly errors: readonly TraceabilityHarnessError[];
    readonly warnings: readonly TraceabilityHarnessError[];
  }) {
    if (args.valid && args.errors.length > 0) {
      throw new Error('valid result cannot contain errors');
    }

    this.valid = args.valid;
    this.errors = Object.freeze([...args.errors]);
    this.warnings = Object.freeze([...args.warnings]);
    Object.freeze(this);
  }

  static success(
    args: MetadataValidationResultSuccessArgs = {},
  ): MetadataValidationResult {
    return new MetadataValidationResult({
      valid: true,
      errors: Object.freeze([]),
      warnings: args.warnings ?? Object.freeze([]),
    });
  }

  static failure(
    args: MetadataValidationResultFailureArgs,
  ): MetadataValidationResult {
    return new MetadataValidationResult({
      valid: false,
      errors: args.errors,
      warnings: args.warnings ?? Object.freeze([]),
    });
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  equals(other: MetadataValidationResult): boolean {
    if (
      this.valid !== other.valid ||
      this.errors.length !== other.errors.length ||
      this.warnings.length !== other.warnings.length
    ) {
      return false;
    }

    return (
      this.errors.every((error, index) => errorEquals(error, other.errors[index])) &&
      this.warnings.every((warning, index) =>
        errorEquals(warning, other.warnings[index]),
      )
    );
  }
}
