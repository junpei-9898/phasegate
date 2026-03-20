import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { WriteLessonArtifactUseCase } from '../../../skill-quality/application/usecases/write-lesson-artifact-usecase.js';
import { Lesson } from '../../../skill-quality/domain/value-objects/lesson.js';
import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';
import type { ValidationViolation } from '../../../skill-quality/domain/types/validation-violation.js';

function createMockLessonArtifactSchemaPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}

function createMockLessonArtifactWriterPort() {
  return { write: vi.fn().mockResolvedValue(undefined) };
}

function createLesson(content: string): Lesson {
  return Lesson.create({
    content,
    sourceContext: SourceContext.create('test-source'),
    tags: [],
  });
}

target('WriteLessonArtifactUseCase', () => {

  // IT-UC-WriteLess-001
  describe('execute: 有効な Lesson[] が JSON として出力されること', () => {
    context('LessonArtifactSchemaPort が violations=[] を返す場合', () => {
      it('output.lessonCount=2, outputPath が .harness/lesson-artifacts/ で始まる', async () => {
        // Arrange
        const mockSchema = createMockLessonArtifactSchemaPort([]);
        const mockWriter = createMockLessonArtifactWriterPort();
        const usecase = new WriteLessonArtifactUseCase(mockSchema, mockWriter);
        const lessons = [createLesson('教訓1'), createLesson('教訓2')];
        // Act
        const actual = await usecase.execute({ storyId: 'H12-04', lessons });
        // Assert
        expect(actual.lessonCount).toBe(2);
        expect(actual.outputPath).toMatch(/\.harness\/lesson-artifacts\//);
      });
    });
  });

  // IT-UC-WriteLess-002
  describe('execute: lessons=[] の場合に空の Artifact が出力されること', () => {
    context('lessons=[] の場合', () => {
      it('output.lessonCount=0', async () => {
        // Arrange
        const mockSchema = createMockLessonArtifactSchemaPort([]);
        const mockWriter = createMockLessonArtifactWriterPort();
        const usecase = new WriteLessonArtifactUseCase(mockSchema, mockWriter);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-04', lessons: [] });
        // Assert
        expect(actual.lessonCount).toBe(0);
      });
    });
  });

  // IT-UC-WriteLess-003
  describe('execute: ci-governance スキーマ違反でエラーになること', () => {
    context('LessonArtifactSchemaPort が violations 非空を返す場合', () => {
      it('HarnessError(LESSON_ARTIFACT_SCHEMA_VIOLATION) がスローされる', async () => {
        // Arrange
        const schemaViolations: ValidationViolation[] = [{ ruleId: 'schema-001', message: 'missing field' }];
        const mockSchema = createMockLessonArtifactSchemaPort(schemaViolations);
        const mockWriter = createMockLessonArtifactWriterPort();
        const usecase = new WriteLessonArtifactUseCase(mockSchema, mockWriter);
        const lessons = [createLesson('教訓')];
        // Act & Assert
        await expect(
          usecase.execute({ storyId: 'H12-04', lessons }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('LESSON_ARTIFACT_SCHEMA_VIOLATION') }));
      });
    });
  });

  // IT-UC-WriteLess-004
  describe("execute: storyId が INVALID 形式でエラーになること", () => {
    context("storyId='INVALID' の場合", () => {
      it('HarnessError(INVALID_STORY_ID) がスローされる', async () => {
        // Arrange
        const usecase = new WriteLessonArtifactUseCase(
          createMockLessonArtifactSchemaPort(),
          createMockLessonArtifactWriterPort(),
        );
        // Act & Assert
        await expect(usecase.execute({ storyId: 'INVALID', lessons: [] })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_STORY_ID') }),
        );
      });
    });
  });

});
