/**
 * @layer application
 * @unit skill-quality
 */
import type { LessonArtifact, LessonArtifactJson } from '../../domain/aggregates/lesson-artifact.js';

export class LessonArtifactMapper {
  static toJson(artifact: LessonArtifact): LessonArtifactJson {
    return artifact.toJson();
  }
}
