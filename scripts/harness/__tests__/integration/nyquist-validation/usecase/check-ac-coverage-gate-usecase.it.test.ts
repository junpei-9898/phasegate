// @layer test
import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CheckAcCoverageGateUseCase } from '../../../../nyquist-validation/application/usecases/check-ac-coverage-gate-usecase.js';
import { MatrixValidationService } from '../../../../nyquist-validation/domain/services/matrix-validation-service.js';
import { AcCoverageGatePolicy } from '../../../../nyquist-validation/domain/services/ac-coverage-gate-policy.js';
import {
  createAjvValidatorMock,
  createCheckAcCoverageGateInput,
  createMatrixFilePortMock,
  createStoryRegistryMock,
  createValidFullCoverageMatrixData,
  createValidNoCoverageMatrixData,
  createValidPartialCoverageMatrixData,
} from '../nyquist-validation-test-fixtures.js';

target('CheckAcCoverageGateUseCase', () => {
  context('全AC網羅済みのmatrixを渡す場合', () => {
    it('全ACにテスト参照があるmatrixの場合、ゲートを通過すること', async () => {
      // Arrange
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidFullCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        acCoverageGatePolicy: new AcCoverageGatePolicy(),
      });

      // Act
      const actual = await usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/full-coverage.json' }));

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toEqual([]);
    });

    it('ゲート通過時、matrixプロパティが非nullで返ること', async () => {
      // Arrange
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidFullCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        acCoverageGatePolicy: new AcCoverageGatePolicy(),
      });

      // Act
      const actual = await usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/full-coverage.json' }));

      // Assert
      expect(actual.matrix).not.toBeNull();
      expect(actual.matrix?.totalAcCount()).toBe(3);
    });
  });

  context('異常系を検証する場合', () => {
    it('未カバーACがある場合、passed=falseとHarnessError[]が返ること', async () => {
      // Arrange
      const coverageError = { code: 'L3-004', message: 'AC not covered: H07-01.AC-4', severity: 'error' };
      const acCoverageGatePolicy = new AcCoverageGatePolicy();
      vi.spyOn(acCoverageGatePolicy, 'check').mockReturnValue({ passed: false, errors: [coverageError] });
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidPartialCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        acCoverageGatePolicy,
      });

      // Act
      const actual = await usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/partial-coverage.json' }));

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toEqual([coverageError]);
    });

    it('複数の未カバーACがある場合、各ACに対してHarnessErrorが生成されること', async () => {
      // Arrange
      const coverageErrors = [
        { code: 'L3-004', message: 'AC not covered: H07-01.AC-1', severity: 'error' },
        { code: 'L3-004', message: 'AC not covered: H07-01.AC-2', severity: 'error' },
        { code: 'L3-004', message: 'AC not covered: H07-01.AC-3', severity: 'error' },
      ];
      const acCoverageGatePolicy = new AcCoverageGatePolicy();
      vi.spyOn(acCoverageGatePolicy, 'check').mockReturnValue({ passed: false, errors: coverageErrors });
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidNoCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        acCoverageGatePolicy,
      });

      // Act
      const actual = await usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/no-coverage.json' }));

      // Assert
      expect(actual.errors).toEqual(coverageErrors);
    });

    it('JSONスキーマ違反のmatrixの場合、passed=falseになること', async () => {
      // Arrange
      const schemaError = { code: 'L3-004', message: 'schema error', severity: 'error' };
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: createMatrixFilePortMock({ version: '1.0.0' }),
        ajvValidator: createAjvValidatorMock(false, [schemaError]),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        acCoverageGatePolicy: new AcCoverageGatePolicy(),
      });

      // Act
      const actual = await usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/invalid-schema.json' }));

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toEqual([schemaError]);
      expect(actual.matrix).toBeNull();
    });

    it('storyId整合性エラーのmatrixの場合、passed=falseになること', async () => {
      // Arrange
      const integrityError = { code: 'L3-004', message: 'unknown storyId: H99-99', severity: 'error' };
      const matrixValidationService = new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock(['H07-01']) });
      vi.spyOn(matrixValidationService, 'validate').mockResolvedValue({
        passed: false,
        errors: [integrityError],
        validatedData: null,
      });
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: createMatrixFilePortMock(),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService,
        acCoverageGatePolicy: new AcCoverageGatePolicy(),
      });

      // Act
      const actual = await usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/unknown-story.json' }));

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toEqual([integrityError]);
    });

    it('matrixファイルが存在しない場合、エラーが伝播すること', async () => {
      // Arrange
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: { read: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')), write: vi.fn() },
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        acCoverageGatePolicy: new AcCoverageGatePolicy(),
      });

      // Act & Assert
      await expect(usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/not-found.json' }))).rejects.toThrow('ENOENT');
    });

    it('RequirementTestMatrix.createで不変条件違反がある場合、エラーが伝播すること', async () => {
      // Arrange
      const duplicateData = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [
          { storyId: 'H07-01', storyMappings: [{ acId: 'AC-1', testReferences: [] }] },
          { storyId: 'H07-01', storyMappings: [{ acId: 'AC-2', testReferences: [] }] },
        ],
      };
      const usecase = new CheckAcCoverageGateUseCase({
        matrixFilePort: createMatrixFilePortMock(duplicateData),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        acCoverageGatePolicy: new AcCoverageGatePolicy(),
      });

      // Act & Assert
      await expect(usecase.execute(createCheckAcCoverageGateInput({ matrixFilePath: '/duplicate-story.json' }))).rejects.toThrow(/storyIdが重複しています/);
    });
  });
});

// @story-id H08-07