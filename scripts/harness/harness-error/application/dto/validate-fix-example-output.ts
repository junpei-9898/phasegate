/**
 * @layer application
 * @unit harness-error
 *
 * ValidateFixExampleUseCase の出力DTO
 */
export interface ValidateFixExampleOutput {
  readonly code: string;
  readonly validatorId: string;
  readonly passed: boolean;
  readonly diagnostics: readonly string[];
}
