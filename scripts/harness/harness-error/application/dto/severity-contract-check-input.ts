/**
 * @layer application
 * @unit harness-error
 *
 * AssertSeverityContractUseCase の入力DTO
 */
export interface SeverityContractCheckInput {
  readonly code: string;
  readonly requestedSeverity: 'error' | 'warning';
}
