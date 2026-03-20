/**
 * @layer application
 * @unit harness-error
 *
 * ListErrorDefinitionsUseCase の入力DTO
 */
export interface ListErrorDefinitionsQuery {
  readonly layer?: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  readonly validatorId?: string;
  readonly category?: string;
}
