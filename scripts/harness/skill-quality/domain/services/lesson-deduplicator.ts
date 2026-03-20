/**
 * @layer domain
 * @unit skill-quality
 */
import type { Lesson } from '../value-objects/lesson.js';

export class LessonDeduplicator {
  deduplicate(lessons: readonly Lesson[]): readonly Lesson[] {
    const map = new Map<string, Lesson>();
    for (const lesson of lessons) {
      if (!map.has(lesson.fingerprint.value)) {
        map.set(lesson.fingerprint.value, lesson);
      }
    }
    return Array.from(map.values());
  }
}
