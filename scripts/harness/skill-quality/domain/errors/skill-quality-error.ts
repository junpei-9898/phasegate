/**
 * @layer domain
 * @unit skill-quality
 *
 * skill-quality ドメインエラー
 */

export type SkillQualityErrorCode =
  | 'LOOP_ALREADY_COMPLETED'
  | 'LOOP_MAX_RETRIES_EXCEEDED'
  | 'LOOP_GAPS_NOT_EMPTY'
  | 'INVALID_STORY_ID'
  | 'DUPLICATE_LESSON_FINGERPRINT'
  | 'EMPTY_COMMIT_FIELD'
  | 'INVALID_COVERAGE_REPORT'
  | 'INVALID_REQUIREMENT_COVERAGE'
  | 'INVALID_COVERAGE_RANGE'
  | 'INVALID_LOOP_ATTEMPT'
  | 'EMPTY_LESSON_CONTENT'
  | 'EMPTY_SOURCE_CONTEXT'
  | 'EMPTY_FILE_PATH'
  | 'INVALID_UPDATED_COUNT'
  | 'EMPTY_MISSING_SECTIONS'
  | 'EMPTY_VIOLATIONS'
  | 'TDD_CYCLE_INCOMPLETE'
  | 'SKILL_FILE_NOT_FOUND'
  | 'GIT_COMMIT_FAILED'
  | 'COVERAGE_RUN_FAILED'
  | 'MATRIX_FILE_NOT_FOUND'
  | 'LESSON_ARTIFACT_SCHEMA_VIOLATION';

export class SkillQualityError extends Error {
  readonly code: string;

  constructor(code: SkillQualityErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'SkillQualityError';
  }
}
