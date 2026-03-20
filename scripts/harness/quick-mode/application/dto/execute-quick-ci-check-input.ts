/**
 * @layer application
 * @unit quick-mode
 *
 * ExecuteQuickCiCheckUseCase の入力 DTO
 */

export interface ExecuteQuickCiCheckInput {
  readonly changedFiles?: readonly { filePath: string; changeKind: string }[];
  readonly dryRun?: boolean;
}
