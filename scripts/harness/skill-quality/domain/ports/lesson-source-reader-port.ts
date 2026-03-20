/**
 * @layer domain
 * @unit skill-quality
 */
import type { SourceContext } from '../value-objects/source-context.js';
import type { LessonCategory } from '../value-objects/lesson.js';

export interface RawLessonEntry {
  readonly content: string;
  readonly sourceContext: SourceContext;
  readonly tags: readonly LessonCategory[];
}

export interface LessonSourceReaderPort {
  read(source: string): Promise<readonly RawLessonEntry[]>;
}
