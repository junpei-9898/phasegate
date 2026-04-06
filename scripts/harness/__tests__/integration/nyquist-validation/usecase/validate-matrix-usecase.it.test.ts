// @layer test
import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ValidateMatrixUseCase } from '../../../../nyquist-validation/application/usecases/validate-matrix-usecase.js';
import { MatrixValidationService } from '../../../../nyquist-validation/domain/services/matrix-validation-service.js';
import {
  createAjvValidatorMock,
  createMatrixFilePortMock,
  createStoryRegistryMock,
  createValidateMatrixInput,
  createValidFullCoverageMatrixData,
} from '../nyquist-validation-test-fixtures.js';

target('ValidateMatrixUseCase', () => {
  context('有効な matrix を検証する場合', () => {
    it('有効なmatrixファイルパスを渡すと、バリデーションが通過すること', async () => {
      // Arrange
      const matrixFilePort = createMatrixFilePortMock();
      const ajvValidator = createAjvValidatorMock(true, []);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ matrixFilePath: '/valid.json' }));

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
      expect(actual.schemaErrors).toHaveLength(0);
      expect(actual.integrityErrors).toHaveLength(0);
      expect(actual.validatedData).toEqual(createValidFullCoverageMatrixData());
    });

    it('failFast=trueでもスキーマエラーがない場合、整合性チェックまで実行されること', async () => {
      // Arrange
      const matrixFilePort = createMatrixFilePortMock();
      const ajvValidator = createAjvValidatorMock(true, []);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      const validateSpy = vi.spyOn(matrixValidationService, 'validate');
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ failFast: true }));

      // Assert
      expect(actual.passed).toBe(true);
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('全ACにテスト参照があるデータで、integrityErrorsが空配列であること', async () => {
      // Arrange
      const matrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
      const ajvValidator = createAjvValidatorMock(true, []);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ matrixFilePath: '/full.json' }));

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.integrityErrors).toEqual([]);
    });
  });

  context('異常系を検証する場合', () => {
    it('スキーマ違反のJSONを渡すと、schemaErrorsに変換されること', async () => {
      // Arrange
      const schemaError = { code: 'L3-004', message: 'required field missing', severity: 'error' };
      const matrixFilePort = createMatrixFilePortMock({ version: '1.0.0', stories: [] });
      const ajvValidator = createAjvValidatorMock(false, [schemaError]);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ matrixFilePath: '/invalid-schema.json' }));

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.schemaErrors).toEqual([schemaError]);
      expect(actual.integrityErrors).toEqual([]);
      expect(actual.validatedData).toBeNull();
    });

    it('failFast=trueかつスキーマエラーがある場合、MatrixValidationServiceが呼ばれないこと', async () => {
      // Arrange
      const schemaError = { code: 'L3-004', message: 'schema error', severity: 'error' };
      const matrixFilePort = createMatrixFilePortMock({ version: '1.0.0', stories: [] });
      const ajvValidator = createAjvValidatorMock(false, [schemaError]);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      const validateSpy = vi.spyOn(matrixValidationService, 'validate');
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ failFast: true }));

      // Assert
      expect(actual.passed).toBe(false);
      expect(validateSpy).not.toHaveBeenCalled();
    });

    it('storyId整合性エラーがある場合、integrityErrorsに格納されること', async () => {
      // Arrange
      const integrityError = { code: 'L3-004', message: 'unknown storyId: H99-99', severity: 'error' };
      const matrixFilePort = createMatrixFilePortMock();
      const ajvValidator = createAjvValidatorMock(true, []);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(['H07-01']),
      });
      vi.spyOn(matrixValidationService, 'validate').mockResolvedValue({
        passed: false,
        errors: [integrityError],
        validatedData: null,
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ matrixFilePath: '/unknown-story.json' }));

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.integrityErrors).toEqual([integrityError]);
      expect(actual.schemaErrors).toEqual([]);
    });

    it('スキーマエラーと整合性エラーが両方ある場合、errorsに両方が含まれること', async () => {
      // Arrange
      const schemaError = { code: 'L3-004', message: 'schema error', severity: 'error' };
      const integrityError = { code: 'L3-004', message: 'integrity error', severity: 'error' };
      const matrixFilePort = createMatrixFilePortMock();
      const ajvValidator = createAjvValidatorMock(false, [schemaError]);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      vi.spyOn(matrixValidationService, 'validate').mockResolvedValue({
        passed: false,
        errors: [integrityError],
        validatedData: null,
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ matrixFilePath: '/double-error.json' }));

      // Assert
      expect(actual.errors).toEqual([schemaError, integrityError]);
      expect(actual.schemaErrors).toEqual([schemaError]);
      expect(actual.integrityErrors).toEqual([integrityError]);
    });

    it('matrixファイルが存在しない場合、I/OエラーがUseCaseから伝播すること', async () => {
      // Arrange
      const matrixFilePort = {
        read: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        write: vi.fn(),
      };
      const ajvValidator = createAjvValidatorMock(true, []);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act & Assert
      await expect(usecase.execute(createValidateMatrixInput({ matrixFilePath: '/not-found.json' }))).rejects.toThrow('ENOENT');
    });

    it('StoryRegistryPortがエラーを返した場合、UseCaseからエラーが伝播すること', async () => {
      // Arrange
      const matrixFilePort = createMatrixFilePortMock({ storyMappings: [{ storyId: 'H99-99' }] });
      const ajvValidator = createAjvValidatorMock(true, []);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: {
          getValidStoryIds: vi.fn().mockRejectedValue(new Error('StoryRegistry unavailable')),
        },
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act & Assert
      await expect(usecase.execute(createValidateMatrixInput({ matrixFilePath: '/valid.json' }))).rejects.toThrow('StoryRegistry unavailable');
    });

    it('複数のスキーマエラーがある場合、全件がschemaErrorsに格納されること', async () => {
      // Arrange
      const schemaErrors = [
        { code: 'L3-004', message: 'error 1', severity: 'error' },
        { code: 'L3-004', message: 'error 2', severity: 'error' },
        { code: 'L3-004', message: 'error 3', severity: 'error' },
      ];
      const matrixFilePort = createMatrixFilePortMock({ version: '1.0.0', stories: [] });
      const ajvValidator = createAjvValidatorMock(false, schemaErrors);
      const matrixValidationService = new MatrixValidationService({
        storyRegistryPort: createStoryRegistryMock(),
      });
      const usecase = new ValidateMatrixUseCase({ matrixFilePort, ajvValidator, matrixValidationService });

      // Act
      const actual = await usecase.execute(createValidateMatrixInput({ failFast: false }));

      // Assert
      expect(actual.schemaErrors).toHaveLength(3);
      expect(actual.passed).toBe(false);
    });
  });
});

// @story-id H08-07