/**
 * @layer application
 * @unit skill-quality
 */
import { LessonArtifact } from '../../domain/aggregates/lesson-artifact.js';
import type { LessonArtifactSchemaPort } from '../../domain/ports/lesson-artifact-schema-port.js';
import type { LessonArtifactWriterPort } from '../../domain/ports/lesson-artifact-writer-port.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';
import type { WriteLessonArtifactInput } from '../dto/write-lesson-artifact-input.js';
import type { WriteLessonArtifactOutput } from '../dto/write-lesson-artifact-output.js';

export class WriteLessonArtifactUseCase {
  constructor(
    private readonly lessonArtifactSchemaPort: LessonArtifactSchemaPort,
    private readonly lessonArtifactWriterPort: LessonArtifactWriterPort,
  ) {}

  async execute(input: WriteLessonArtifactInput): Promise<WriteLessonArtifactOutput> {
    const artifact = LessonArtifact.create(input.storyId);
    for (const lesson of input.lessons) {
      artifact.addLesson(lesson);
    }

    const json = artifact.toJson();
    const violations = await this.lessonArtifactSchemaPort.validate(json);
    if (violations.length > 0) {
      throw new SkillQualityError('LESSON_ARTIFACT_SCHEMA_VIOLATION', `Schema violations: ${violations.map((v) => v.message).join(', ')}`);
    }

    await this.lessonArtifactWriterPort.write(artifact);

    return {
      outputPath: `.harness/lesson-artifacts/${input.storyId}.json`,
      lessonCount: artifact.lessons.length,
    };
  }
}
