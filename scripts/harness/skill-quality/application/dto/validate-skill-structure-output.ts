/**
 * @layer application
 * @unit skill-quality
 */
import type { SkillValidationResult } from '../../domain/value-objects/skill-validation-result.js';

export interface ValidateSkillStructureOutput {
  readonly result: SkillValidationResult;
}
