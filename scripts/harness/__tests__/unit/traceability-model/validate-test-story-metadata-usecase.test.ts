import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { MetadataTag } from '../../../traceability-model/domain/value-objects/metadata-tag.ts';
import { MetadataValidationResult } from '../../../traceability-model/domain/value-objects/metadata-validation-result.ts';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.ts';
import {
  MetadataReadApplicationError,
  ValidateTestStoryMetadataUseCase,
} from '../../../traceability-model/application/usecases/validate-test-story-metadata-usecase.ts';

const createHarnessError = (overrides: Partial<{
  code: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
  fix_example?: string;
}> = {}) =>
  Object.freeze({
    code: 'L2-002',
    severity: 'error' as const,
    message: 'test story validation failed',
    suggestion: 'テストの@storyを修正してください',
    ...overrides,
  });

const createPath = (value: string) => ProjectRelativePath.create(value);

const createStoryTag = (
  filePath: ProjectRelativePath,
  value = 'H03-01',
) =>
  MetadataTag.create({
    type: '@story',
    value,
    lineNumber: 1,
    filePath,
  });

const createSut = () => {
  const metadataReaderPort = {
    readImplementationTags: vi.fn(),
    readTestTags: vi.fn(),
  };
  const validator = {
    validateTest: vi.fn(),
  };

  return {
    metadataReaderPort,
    validator,
    sut: new ValidateTestStoryMetadataUseCase({
      metadataReaderPort,
      validator,
    }),
  };
};

target('ValidateTestStoryMetadataUseCase.execute', () => {
  describe('テストファイルのstoryメタデータを検証する', () => {
    // IT-TM-012
    context('テストファイルに@story H03-01が1件ある場合', () => {
      it('@storyタグが存在し正規StoryIdとして解決可能な場合にvalid=trueで返ること', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath = createPath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts');
        const tags = Object.freeze([createStoryTag(filePath)]);
        metadataReaderPort.readTestTags.mockResolvedValue(tags);
        validator.validateTest.mockResolvedValue(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(true);
        expect(validator.validateTest).toHaveBeenCalledWith({
          filePath,
          tags,
        });
      });
    });

    // IT-TM-013
    context('テストファイルに@storyが存在しない場合', () => {
      it('@storyタグが欠落している場合にエラーを返すこと', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath = createPath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts');
        metadataReaderPort.readTestTags.mockResolvedValue(Object.freeze([]));
        validator.validateTest.mockResolvedValue(
          MetadataValidationResult.failure({
            errors: [createHarnessError()],
          }),
        );

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(false);
        expect(actual[0].errors[0].code).toBe('L2-002');
      });
    });

    // IT-TM-014
    context('@story US-001のように正規形式外の値が与えられる場合', () => {
      it('@storyタグの値が正規StoryId形式でない場合にエラーを返すこと', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath = createPath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts');
        metadataReaderPort.readTestTags.mockResolvedValue(
          Object.freeze([createStoryTag(filePath, 'US-001')]),
        );
        validator.validateTest.mockResolvedValue(
          MetadataValidationResult.failure({
            errors: [createHarnessError({ message: '@story format is invalid' })],
          }),
        );

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].errors.length).toBeGreaterThan(0);
        expect(actual[0].valid).toBe(false);
      });
    });

    // IT-TM-015
    context('テストタグ読取でI/O例外が発生する場合', () => {
      it('MetadataReaderPortの読み込み失敗時にMetadataReadApplicationErrorが発生すること', async () => {
        // Arrange
        const { sut, metadataReaderPort } = createSut();
        const filePath = createPath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts');
        metadataReaderPort.readTestTags.mockRejectedValue(new Error('read failed'));

        // Act
        const actual = sut.execute([filePath]);

        // Assert
        await expect(actual).rejects.toThrow(MetadataReadApplicationError);
      });
    });

    // IT-TM-016
    context('validatorがwarning付きの成功結果を返す場合', () => {
      it('結果がMetadataValidationOutput DTOに正しく整形されること', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath = createPath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts');
        const tags = Object.freeze([createStoryTag(filePath)]);
        const warnings = Object.freeze([
          createHarnessError({
            code: 'L2-WARN',
            severity: 'warning',
            message: 'warning detected',
          }),
        ]);
        metadataReaderPort.readTestTags.mockResolvedValue(tags);
        validator.validateTest.mockResolvedValue(
          MetadataValidationResult.success({ warnings }),
        );

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0]).toEqual({
          filePath: filePath.toString(),
          valid: true,
          errors: [],
          warnings,
        });
      });
    });
  });
});
