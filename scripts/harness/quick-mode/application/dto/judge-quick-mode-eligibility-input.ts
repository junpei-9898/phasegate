/**
 * @layer application
 * @unit quick-mode
 *
 * JudgeQuickModeEligibilityUseCase の入力 DTO
 */

export interface JudgeQuickModeEligibilityInput {
  readonly changedFiles?: readonly { filePath: string; changeKind: string }[];
}
