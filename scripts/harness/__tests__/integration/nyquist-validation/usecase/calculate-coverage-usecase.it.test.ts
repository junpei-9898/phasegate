import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CalculateCoverageUseCase } from '../../../../nyquist-validation/application/usecases/calculate-coverage-usecase.js';
import { MatrixValidationService } from '../../../../nyquist-validation/domain/services/matrix-validation-service.js';
import { CoverageCalculationService } from '../../../../nyquist-validation/domain/services/coverage-calculation-service.js';
import { createCoverageResult } from '../../../helpers/test-helpers.js';
import {
  createAjvValidatorMock,
  createCalculateCoverageInput,
  createCoverageThresholdPortMock,
  createEmptyStoriesMatrixData,
  createMatrixFilePortMock,
  createStoryRegistryMock,
  createValidFullCoverageMatrixData,
  createValidPartialCoverageMatrixData,
} from '../nyquist-validation-test-fixtures.js';

target('CalculateCoverageUseCase', () => {
  context('閾値チェックなしで網羅率を算出する場合', () => {
    it('checkThreshold=falseの場合、閾値チェックなしで網羅率が返ること', async () => {
      // Arrange
      const coverageThresholdPort = createCoverageThresholdPortMock();
      const coverageCalculationService = new CoverageCalculationService();
      vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue(
        createCoverageResult({ rate: 0.75, coveredAcCount: 3, totalAcCount: 4, uncoveredAcIds: ['H07-01.AC-4'] })
      );
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidPartialCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService,
        coverageThresholdPort,
      });

      // Act
      const actual = await usecase.execute(createCalculateCoverageInput({ matrixFilePath: '/partial.json', checkThreshold: false }));

      // Assert
      expect(actual.ratePercent).toBe(75);
      expect(actual.threshold).toBeNull();
      expect(actual.meetsThreshold).toBeNull();
      expect(coverageThresholdPort.getThreshold).not.toHaveBeenCalled();
    });
  });

  context('閾値チェックありで網羅率を算出する場合', () => {
    it('checkThreshold=trueで閾値を充足する場合、meetsThreshold=trueが返ること', async () => {
      // Arrange
      const coverageCalculationService = new CoverageCalculationService();
      vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue(
        createCoverageResult({ rate: 0.95, coveredAcCount: 19, totalAcCount: 20, uncoveredAcIds: ['H07-01.AC-1'] })
      );
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidFullCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService,
        coverageThresholdPort: createCoverageThresholdPortMock({ standard: 0.9, strict: 0.95, active: 0.9 }),
      });

      // Act
      const actual = await usecase.execute(createCalculateCoverageInput({ matrixFilePath: '/high-coverage.json', checkThreshold: true }));

      // Assert
      expect(actual.meetsThreshold).toBe(true);
      expect(actual.threshold).toBe(0.9);
    });

    it('全AC網羅済みの場合、ratePercent=100が返ること', async () => {
      // Arrange
      const coverageCalculationService = new CoverageCalculationService();
      vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue(
        createCoverageResult({ rate: 1, coveredAcCount: 3, totalAcCount: 3, uncoveredAcIds: [] })
      );
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidFullCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService,
        coverageThresholdPort: createCoverageThresholdPortMock(),
      });

      // Act
      const actual = await usecase.execute(createCalculateCoverageInput({ matrixFilePath: '/full.json' }));

      // Assert
      expect(actual.ratePercent).toBe(100);
      expect(actual.uncoveredAcIds).toEqual([]);
    });

    it('totalAcCount=0の場合、rate=1.0として扱われること', async () => {
      // Arrange
      const coverageCalculationService = new CoverageCalculationService();
      vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue(
        createCoverageResult({ rate: 1, coveredAcCount: 0, totalAcCount: 0, uncoveredAcIds: [] })
      );
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createEmptyStoriesMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService,
        coverageThresholdPort: createCoverageThresholdPortMock(),
      });

      // Act
      const actual = await usecase.execute(createCalculateCoverageInput({ matrixFilePath: '/empty.json' }));

      // Assert
      expect(actual.ratePercent).toBe(100);
      expect(actual.coveredAcCount).toBe(0);
      expect(actual.totalAcCount).toBe(0);
    });
  });

  context('異常系と境界値を検証する場合', () => {
    it('checkThreshold=trueで閾値未達の場合、meetsThreshold=falseが返ること', async () => {
      // Arrange
      const coverageCalculationService = new CoverageCalculationService();
      vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue(
        createCoverageResult({ rate: 0.6, coveredAcCount: 3, totalAcCount: 5, uncoveredAcIds: ['H07-01.AC-3', 'H07-01.AC-4'] })
      );
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidPartialCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService,
        coverageThresholdPort: createCoverageThresholdPortMock({ standard: 0.9, strict: 0.95, active: 0.9 }),
      });

      // Act
      const actual = await usecase.execute(createCalculateCoverageInput({ matrixFilePath: '/low-coverage.json', checkThreshold: true }));

      // Assert
      expect(actual.meetsThreshold).toBe(false);
      expect(actual.threshold).toBe(0.9);
    });

    it('CoverageThresholdPortがエラーを返した場合、エラーが伝播すること', async () => {
      // Arrange
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidFullCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService: new CoverageCalculationService(),
        coverageThresholdPort: { getThreshold: vi.fn().mockRejectedValue(new Error('config-foundation unavailable')) },
      });

      // Act & Assert
      await expect(usecase.execute(createCalculateCoverageInput({ checkThreshold: true }))).rejects.toThrow('config-foundation unavailable');
    });

    it('uncoveredAcIdsが正しく列挙されること', async () => {
      // Arrange
      const coverageCalculationService = new CoverageCalculationService();
      vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue(
        createCoverageResult({ rate: 0.5, coveredAcCount: 2, totalAcCount: 4, uncoveredAcIds: ['H01-01.AC-2', 'H01-02.AC-1'] })
      );
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidPartialCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService,
        coverageThresholdPort: createCoverageThresholdPortMock(),
      });

      // Act
      const actual = await usecase.execute(createCalculateCoverageInput({ matrixFilePath: '/partial.json' }));

      // Assert
      expect(actual.uncoveredAcIds).toEqual(['H01-01.AC-2', 'H01-02.AC-1']);
    });

    it('ratePercentが小数点以下2桁で返ること', async () => {
      // Arrange
      const coverageCalculationService = new CoverageCalculationService();
      vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue(
        createCoverageResult({ rate: 0.6667, coveredAcCount: 2, totalAcCount: 3, uncoveredAcIds: ['H07-01.AC-3'] })
      );
      const usecase = new CalculateCoverageUseCase({
        matrixFilePort: createMatrixFilePortMock(createValidPartialCoverageMatrixData()),
        ajvValidator: createAjvValidatorMock(true, []),
        matrixValidationService: new MatrixValidationService({ storyRegistryPort: createStoryRegistryMock() }),
        coverageCalculationService,
        coverageThresholdPort: createCoverageThresholdPortMock(),
      });

      // Act
      const actual = await usecase.execute(createCalculateCoverageInput({ matrixFilePath: '/partial.json' }));

      // Assert
      expect(actual.ratePercent).toBe(66.67);
    });
  });
});

// @story-id H08-07