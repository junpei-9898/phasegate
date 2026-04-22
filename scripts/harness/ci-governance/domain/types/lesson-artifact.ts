// @unit ci-governance
// @layer domain
// Cross-Unit Contract: docs/contracts/lesson-artifact.schema.json

import type { LessonCategory } from './lesson-category.js';

export type { LessonCategory };

export interface LessonArtifact {
  /** UUID形式の一意識別子（INV-12: UUID形式必須） */
  readonly lessonId: string;
  readonly source: string;
  readonly content: string;
  readonly tags: LessonCategory[];
  /** ISO 8601形式 */
  readonly timestamp: string;
}
