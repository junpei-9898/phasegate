/**
 * @layer domain
 * @unit skill-quality
 */
import type { LessonArtifact } from '../aggregates/lesson-artifact.js';

export interface LessonArtifactWriterPort {
  write(lessonArtifact: LessonArtifact): Promise<void>;
}
