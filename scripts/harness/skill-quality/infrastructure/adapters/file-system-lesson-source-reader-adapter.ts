/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { readFile } from 'node:fs/promises';
import type { LessonSourceReaderPort, RawLessonEntry } from '../../domain/ports/lesson-source-reader-port.js';
import { SourceContext } from '../../domain/value-objects/source-context.js';

export class FileSystemLessonSourceReaderAdapter implements LessonSourceReaderPort {
  async read(source: string): Promise<readonly RawLessonEntry[]> {
    const content = await readFile(source, 'utf-8');
    const entries: RawLessonEntry[] = [];

    // Extract [Agent-Lesson] tags: <!-- [Agent-Lesson] ... -->
    const tagPattern = /<!--\s*\[Agent-Lesson\]\s*([\s\S]*?)-->/g;
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(content)) !== null) {
      const lessonContent = match[1]?.trim();
      if (lessonContent) {
        entries.push({
          content: lessonContent,
          sourceContext: SourceContext.create(source),
          tags: [],
        });
      }
    }

    return entries;
  }
}
