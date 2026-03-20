/**
 * @layer domain
 * @unit skill-quality
 */
import { Lesson } from '../value-objects/lesson.js';
import type { LessonSourceReaderPort } from '../ports/lesson-source-reader-port.js';

export class LessonCollector {
  constructor(private readonly lessonSourceReaderPort: LessonSourceReaderPort) {}

  async collect(sources: readonly string[]): Promise<Lesson[]> {
    const allLessons: Lesson[] = [];
    for (const source of sources) {
      const entries = await this.lessonSourceReaderPort.read(source);
      for (const entry of entries) {
        const lesson = Lesson.create({
          content: entry.content,
          sourceContext: entry.sourceContext,
          tags: entry.tags,
        });
        allLessons.push(lesson);
      }
    }
    return allLessons;
  }
}
