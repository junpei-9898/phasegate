/**
 * @layer application
 * @unit phase-dependency-model
 */

export interface CustomizationValidationResultDto {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly effectiveRules: readonly string[];
}
