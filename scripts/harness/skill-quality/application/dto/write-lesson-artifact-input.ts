/**
 * @layer application
 * @unit skill-quality
 */
import type { Lesson } from '../../domain/value-objects/lesson.js';

export interface WriteLessonArtifactInput {
  readonly storyId: string;
  readonly lessons: readonly Lesson[];
}
