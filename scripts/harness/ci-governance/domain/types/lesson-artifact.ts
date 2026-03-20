/**
 * @layer domain
 * @unit ci-governance
 *
 * LessonArtifact型定義（Cross-Unit Contract所有）
 * Schema Owner: ci-governance Unit
 * Cross-Unit Contract: docs/contracts/lesson-artifact.schema.json
 */

import type { LessonCategory } from './lesson-category.js';

export type { LessonCategory };

export interface LessonArtifact {
  /** UUID形式の一意識別子（INV-12: UUID形式必須） */
  readonly lessonId: string;
  /** lesson artifactの出力元スキル名（例: 'story-implementor', 'domain-designer'） */
  readonly source: string;
  /** AGENTS.mdに集約するlesson内容テキスト */
  readonly content: string;
  /** lessonのカテゴリタグ（重複集約時はマージされる） */
  readonly tags: LessonCategory[];
  /** artifact作成日時（ISO 8601形式） */
  readonly timestamp: string; // ISO8601DateString
}
