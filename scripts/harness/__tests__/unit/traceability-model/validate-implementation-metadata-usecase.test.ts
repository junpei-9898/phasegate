import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { MetadataTag } from '../../../traceability-model/domain/value-objects/metadata-tag.ts';
import { MetadataValidationResult } from '../../../traceability-model/domain/value-objects/metadata-validation-result.ts';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.ts';
import {
  MetadataReadApplicationError,
  ValidateImplementationMetadataUseCase,
} from '../../../traceability-model/application/usecases/validate-implementation-metadata-usecase.ts';

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
    message: 'metadata validation failed',
    suggestion: 'metadataを修正してください',
    ...overrides,
  });

const createPath = (value: string) => ProjectRelativePath.create(value);

const createMetadataTag = (
  overrides: Partial<{
    type: '@unit' | '@layer' | '@story-id' | '@story';
    value: string;
    lineNumber: number;
    filePath: ProjectRelativePath;
  }> = {},
) =>
  MetadataTag.create({
    type: '@unit',
    value: 'traceability-model',
    lineNumber: 1,
    filePath: createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
    ...overrides,
  });

const createSut = () => {
  const metadataReaderPort = {
    readImplementationTags: vi.fn(),
  };
  const validator = {
    validateImplementation: vi.fn(),
  };

  return {
    metadataReaderPort,
    validator,
    sut: new ValidateImplementationMetadataUseCase({
      metadataReaderPort,
      validator,
    }),
  };
};

target('ValidateImplementationMetadataUseCase.execute', () => {
  describe('実装ファイルのメタデータを検証する', () => {
    // IT-TM-001
    context('2件の実装ファイルがあり、両方のタグ検証が成功する場合', () => {
      it('複数ファイルのメタデータが全てvalidの場合に全結果がvalid=trueで返ること', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath1 = createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts');
        const filePath2 = createPath('scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts');
        const tags1 = Object.freeze([
          createMetadataTag({ type: '@unit', filePath: filePath1 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2, filePath: filePath1 }),
        ]);
        const tags2 = Object.freeze([
          createMetadataTag({ type: '@unit', filePath: filePath2 }),
          createMetadataTag({ type: '@layer', value: 'application', lineNumber: 2, filePath: filePath2 }),
        ]);
        metadataReaderPort.readImplementationTags
          .mockResolvedValueOnce(tags1)
          .mockResolvedValueOnce(tags2);
        validator.validateImplementation
          .mockResolvedValueOnce(MetadataValidationResult.success())
          .mockResolvedValueOnce(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath1, filePath2]);

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0].filePath).toBe(filePath1.toString());
        expect(actual[0].valid).toBe(true);
        expect(actual[0].errors).toEqual([]);
        expect(actual[1].filePath).toBe(filePath2.toString());
        expect(actual[1].valid).toBe(true);
        expect(actual[1].errors).toEqual([]);
        expect(metadataReaderPort.readImplementationTags).toHaveBeenNthCalledWith(1, filePath1);
        expect(metadataReaderPort.readImplementationTags).toHaveBeenNthCalledWith(2, filePath2);
      });
    });

    // IT-TM-002
    context('2件のうち2件目だけタグ不備がある場合', () => {
      it('1件でもinvalidがある場合にそのファイルの結果がvalid=falseで返ること', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath1 = createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts');
        const filePath2 = createPath('scripts/harness/traceability-model/domain/services/metadata-validator.ts');
        metadataReaderPort.readImplementationTags
          .mockResolvedValueOnce(
            Object.freeze([
              createMetadataTag({ type: '@unit', filePath: filePath1 }),
              createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2, filePath: filePath1 }),
            ]),
          )
          .mockResolvedValueOnce(
            Object.freeze([createMetadataTag({ type: '@unit', filePath: filePath2 })]),
          );
        validator.validateImplementation
          .mockResolvedValueOnce(MetadataValidationResult.success())
          .mockResolvedValueOnce(
            MetadataValidationResult.failure({
              errors: [createHarnessError()],
            }),
          );

        // Act
        const actual = await sut.execute([filePath1, filePath2]);

        // Assert
        expect(actual[0].valid).toBe(true);
        expect(actual[1].valid).toBe(false);
        expect(actual[1].errors[0].code).toBe('L2-002');
      });
    });

    // IT-TM-003
    context('最初のファイル読み込みで例外が発生する場合', () => {
      it('MetadataReaderPortの読み込み失敗時にMetadataReadApplicationErrorが発生すること', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath = createPath('scripts/harness/traceability-model/domain/services/metadata-validator.ts');
        metadataReaderPort.readImplementationTags.mockRejectedValue(new Error('read failed'));

        // Act
        const actual = sut.execute([filePath]);

        // Assert
        await expect(actual).rejects.toThrow(MetadataReadApplicationError);
        expect(validator.validateImplementation).not.toHaveBeenCalled();
      });
    });

    // IT-TM-004
    context('validatorがwarningとerrorを含む結果を返す場合', () => {
      it('結果がMetadataValidationOutput DTOに正しく整形されること', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();
        const filePath = createPath('scripts/harness/traceability-model/domain/services/metadata-validator.ts');
        const tags = Object.freeze([
          createMetadataTag({ type: '@unit', filePath }),
          createMetadataTag({ type: '@layer', value: 'usecase', lineNumber: 2, filePath }),
        ]);
        const errors = Object.freeze([createHarnessError()]);
        const warnings = Object.freeze([
          createHarnessError({
            code: 'L2-WARN',
            severity: 'warning',
            message: 'warning detected',
          }),
        ]);
        metadataReaderPort.readImplementationTags.mockResolvedValue(tags);
        validator.validateImplementation.mockResolvedValue(
          MetadataValidationResult.failure({
            errors,
            warnings,
          }),
        );

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0]).toEqual({
          filePath: filePath.toString(),
          valid: false,
          errors,
          warnings,
        });
      });
    });

    // IT-TM-005
    context('入力ファイル配列が空の場合', () => {
      it('空のfilePathsが渡された場合に空配列が返ること', async () => {
        // Arrange
        const { sut, metadataReaderPort, validator } = createSut();

        // Act
        const actual = await sut.execute([]);

        // Assert
        expect(actual).toEqual([]);
        expect(metadataReaderPort.readImplementationTags).not.toHaveBeenCalled();
        expect(validator.validateImplementation).not.toHaveBeenCalled();
      });
    });
  });
});
