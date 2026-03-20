/**
 * @layer application
 * @unit harness-error
 *
 * validator出力の正規化前DTO
 */
export interface ValidatorIssueDraft {
  readonly code: string;
  readonly message: string;
  readonly suggestion: string;
  readonly severity?: 'error' | 'warning';
  readonly adrRef?: string;
  readonly fixExample?: string;
  readonly validatorId: string;
}
