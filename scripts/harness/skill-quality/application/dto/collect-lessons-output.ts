/**
 * @layer application
 * @unit skill-quality
 */
import type { Lesson } from '../../domain/value-objects/lesson.js';

export interface CollectLessonsOutput {
  readonly lessons: readonly Lesson[];
  readonly totalCollected: number;
  readonly deduplicatedCount: number;
}
