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
  readonly severity?: "error" | "warning";
  readonly adrRef?: string;
  readonly fixExample?: string;
  readonly validatorId: string;
  readonly suggestedSkill?: string;
  readonly scaffoldCommand?: string;
  readonly templatePath?: string;
  /** WI-335: 修復方式分類。省略時は ErrorDefinition の既定（未定義なら manual 扱い）。 */
  readonly remediationType?: "mechanical" | "ai-assisted" | "manual";
}
