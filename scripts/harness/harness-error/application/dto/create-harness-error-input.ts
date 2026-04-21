/**
 * @layer application
 * @unit harness-error
 *
 * CreateHarnessErrorUseCase の入力DTO
 */
export interface CreateHarnessErrorInput {
  readonly code: string;
  readonly message: string;
  readonly suggestion: string;
  readonly severity?: 'error' | 'warning';
  readonly adrRef?: string;
  readonly fixExample?: string;
  readonly validatorId: string;
  readonly suggestedSkill?: string;
  readonly scaffoldCommand?: string;
  readonly templatePath?: string;
}
