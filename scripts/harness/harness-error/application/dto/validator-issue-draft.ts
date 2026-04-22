// @unit harness-error
// @layer application

export interface ValidatorIssueDraft {
  readonly code: string;
  readonly message: string;
  readonly suggestion: string;
  readonly severity?: 'error' | 'warning';
  readonly adrRef?: string;
  readonly fixExample?: string;
  readonly validatorId: string;
}
