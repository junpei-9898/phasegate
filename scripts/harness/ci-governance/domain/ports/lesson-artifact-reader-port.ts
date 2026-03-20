/**
 * @layer domain
 * @unit ci-governance
 */

import type { LessonArtifact } from '../types/lesson-artifact.js';

export interface LessonArtifactReaderPort {
  readAll(): Promise<LessonArtifact[]>;
  readBySource?(source: string): Promise<LessonArtifact[]>;
}
