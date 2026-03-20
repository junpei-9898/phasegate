/**
 * @layer application
 * @unit adr-foundation
 */
export interface AdrValidationViolationDto {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export interface AdrHarnessError {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly metadata: {
    readonly adr_ref?: string;
    readonly field?: string;
  };
}

export interface AdrValidationResultDto {
  readonly adrRef: string;
  readonly valid: boolean;
  readonly violations: readonly AdrValidationViolationDto[];
  readonly harnessErrors: readonly AdrHarnessError[];
}
