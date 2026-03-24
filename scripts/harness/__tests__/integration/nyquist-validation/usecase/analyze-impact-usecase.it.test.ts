import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AnalyzeImpactUseCase } from '../../../../nyquist-validation/application/usecases/analyze-impact-usecase.js';
import { MatrixValidationService } from '../../../../nyquist-validation/domain/services/matrix-validation-service.js';
import { ImpactAnalysisService } from '../../../../nyquist-validation/domain/services/impact-analysis-service.js';
import {
  createAjvValidatorMock,
  createAnalyzeImpactInput,
  createImpactAnalysisMatrixData,
  createMatrixFilePortMock,
  createStoryRegistryMock,
  createValidFullCoverageMatrixData,
} from '../nyquist-validation-test-fixtures.js';

target('AnalyzeImpactUseCase', () => {
  context('存在するstoryIdの影響分析を行う場合', () => {
    it('存在するstoryIdを渡すと、直接マッピングされたテスト参照が返ること', async () => {
      // Arrange
      const usecase = new AnalyzeImpactUseCase({
        matrixFilePort: createMatrixFilePortMock(createImpactAnalysisMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        impactAnalysisService: new ImpactAnalysisService(),
      });

      // Act
      const actual = await usecase.execute(createAnalyzeImpactInput({ matrixFilePath: '/valid.json', storyId: 'H07-01' }));

      // Assert
      expect(actual.found).toBe(true);
      expect(actual.directTests).toHaveLength(3);
      expect(actual.directMappingOnly).toBe(true);
    });

    it('directMappingOnlyが常にtrueであること', async () => {
      // Arrange
      const usecase = new AnalyzeImpactUseCase({
        matrixFilePort: createMatrixFilePortMock(createImpactAnalysisMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        impactAnalysisService: new ImpactAnalysisService(),
      });

      // Act
      const actual = await usecase.execute(createAnalyzeImpactInput({ storyId: 'H07-01' }));

      // Assert
      expect(actual.directMappingOnly).toBe(true);
    });
  });

  context('storyIdがmatrixに存在しない場合', () => {
    it('storyIdがmatrixに存在しない場合、found=falseで空のdirectTestsが返ること', async () => {
      // Arrange
      const usecase = new AnalyzeImpactUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidFullCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        impactAnalysisService: new ImpactAnalysisService(),
      });

      // Act
      const actual = await usecase.execute(createAnalyzeImpactInput({ matrixFilePath: '/valid.json', storyId: 'H99-99' }));

      // Assert
      expect(actual.found).toBe(false);
      expect(actual.directTests).toEqual([]);
    });

    it('重複するテスト参照が除去されて返ること', async () => {
      // Arrange
      const data = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [
          {
            storyId: 'H07-01',
            storyMappings: [
              {
                acId: 'AC-1',
                testReferences: [{ filePath: 'specs/shared.spec.ts', testType: 'it', testName: 'shared 1' }],
              },
              {
                acId: 'AC-2',
                testReferences: [{ filePath: 'specs/shared.spec.ts', testType: 'it', testName: 'shared 2' }],
              },
            ],
          },
        ],
      };
      const usecase = new AnalyzeImpactUseCase({
        matrixFilePort: createMatrixFilePortMock(data),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        impactAnalysisService: new ImpactAnalysisService(),
      });

      // Act
      const actual = await usecase.execute(createAnalyzeImpactInput({ matrixFilePath: '/duplicate-refs.json', storyId: 'H07-01' }));

      // Assert
      expect(actual.directTests).toHaveLength(1);
      expect(actual.directTests[0]?.filePath).toBe('specs/shared.spec.ts');
    });
  });

  context('異常系を検証する場合', () => {
    it('storyId書式が不正な場合でも、存在しないstoryIdとして扱われること', async () => {
      // Arrange
      const usecase = new AnalyzeImpactUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidFullCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        impactAnalysisService: new ImpactAnalysisService(),
      });

      // Act
      const actual = await usecase.execute(createAnalyzeImpactInput({ matrixFilePath: '/valid.json', storyId: 'invalid-id' }));

      // Assert
      expect(actual.found).toBe(false);
      expect(actual.directTests).toEqual([]);
    });

    it('matrixファイルが存在しない場合、エラーが伝播すること', async () => {
      // Arrange
      const usecase = new AnalyzeImpactUseCase({
        matrixFilePort: { read: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')), write: vi.fn() },
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        impactAnalysisService: new ImpactAnalysisService(),
      });

      // Act & Assert
      await expect(usecase.execute(createAnalyzeImpactInput({ matrixFilePath: '/not-found.json' }))).rejects.toThrow('ENOENT');
    });

    it('不正なtestReferenceを含むmatrixの場合、buildMatrix時のエラーが伝播すること', async () => {
      // Arrange
      const invalidData = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [
          {
            storyId: 'H07-01',
            storyMappings: [
              {
                acId: 'AC-1',
                testReferences: [{ filePath: '', testType: 'it' }],
              },
            ],
          },
        ],
      };
      const usecase = new AnalyzeImpactUseCase({
        matrixFilePort: createMatrixFilePortMock(invalidData),
        ajvValidator: createAjvValidatorMock(false, [{ code: 'L3-004', message: 'schema error', severity: 'error' }]),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        impactAnalysisService: new ImpactAnalysisService(),
      });

      // Act & Assert
      await expect(usecase.execute(createAnalyzeImpactInput({ matrixFilePath: '/invalid.json' }))).rejects.toThrow();
    });
  });
});

// @story-id H08-07