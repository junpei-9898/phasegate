/**
 * @layer application
 * @unit harness-error
 *
 * ValidateFixExampleUseCase の入力DTO
 */
export interface ValidateFixExampleInput {
  readonly code: string;
  readonly overrideFixExample?: string;
}
