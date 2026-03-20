/**
 * @layer domain
 * @unit skill-quality
 */
import type { ValidationViolation } from '../types/validation-violation.js';

export interface LessonArtifactSchemaPort {
  validate(json: unknown): Promise<readonly ValidationViolation[]>;
}
