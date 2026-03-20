/**
 * @layer infrastructure
 * @unit skill-quality
 */
import Ajv from 'ajv';
import type { LessonArtifactSchemaPort } from '../../domain/ports/lesson-artifact-schema-port.js';
import type { ValidationViolation } from '../../domain/types/validation-violation.js';

const LESSON_ARTIFACT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    storyId: { type: 'string' },
    lessons: { type: 'array' },
  },
  required: ['storyId', 'lessons'],
};

export class AjvLessonArtifactSchemaAdapter implements LessonArtifactSchemaPort {
  private readonly ajv: Ajv;
  private readonly compiledValidator: ReturnType<Ajv['compile']>;

  constructor() {
    this.ajv = new Ajv();
    this.compiledValidator = this.ajv.compile(LESSON_ARTIFACT_SCHEMA);
  }

  async validate(json: unknown): Promise<readonly ValidationViolation[]> {
    const valid = this.compiledValidator(json);
    if (valid) return [];
    return (this.compiledValidator.errors ?? []).map((err) => ({
      ruleId: 'SCHEMA_VIOLATION',
      message: err.message ?? 'Schema validation error',
      location: err.instancePath,
    }));
  }
}
