/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { LessonArtifactWriterPort } from '../../domain/ports/lesson-artifact-writer-port.js';
import type { LessonArtifact } from '../../domain/aggregates/lesson-artifact.js';

export class FileSystemLessonArtifactWriterAdapter implements LessonArtifactWriterPort {
  constructor(private readonly outputDir: string = '.harness/lesson-artifacts') {}

  async write(lessonArtifact: LessonArtifact): Promise<void> {
    const json = lessonArtifact.toJson();
    const outputPath = join(this.outputDir, `${lessonArtifact.storyId}.json`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(json, null, 2), 'utf-8');
  }
}
