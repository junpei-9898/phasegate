// @unit agent-integration
// @layer domain

/**
 * phase-gate 等のエラーに紐づく actionable なガイダンス情報
 * （harness-error Unit の ErrorDefinition.defaultSuggestedSkill 等から供給される）
 */
export interface ErrorGuidance {
  readonly suggestedSkill: string | null;
  readonly scaffoldCommand: string | null;
  readonly templatePath: string | null;
}

/**
 * エラーコード → actionable guidance の lookup を行う port
 * 実装は harness-error Unit の ErrorDefinitionRegistry を参照する
 */
export interface ErrorGuidanceQueryPort {
  getGuidance(errorCode: string): Promise<ErrorGuidance | null>;
}
