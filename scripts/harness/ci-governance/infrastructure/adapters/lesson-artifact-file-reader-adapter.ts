/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * LessonArtifactReaderPort実装
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { LessonArtifactReaderPort } from '../../domain/ports/lesson-artifact-reader-port.js';
import type { LessonArtifact } from '../../domain/types/lesson-artifact.js';

export class LessonArtifactFileReaderAdapter implements LessonArtifactReaderPort {
  private readonly artifactsDir: string;

  constructor(baseDir: string) {
    this.artifactsDir = path.join(baseDir, '.harness', 'lessons');
  }

  async readAll(): Promise<LessonArtifact[]> {
    return this.readFromDir(this.artifactsDir);
  }

  async readBySource(source: string): Promise<LessonArtifact[]> {
    const all = await this.readAll();
    return all.filter((artifact) => artifact.source === source);
  }

  private async readFromDir(dir: string): Promise<LessonArtifact[]> {
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      const artifacts: LessonArtifact[] = [];

      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          const artifact = JSON.parse(content) as LessonArtifact;
          artifacts.push(artifact);
        } catch { /* skip invalid */ }
      }

      return artifacts;
    } catch {
      return [];
    }
  }
}
