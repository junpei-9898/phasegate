// @layer test
import { describe, expect, it } from 'vitest';
import { target, context, createCoverageResult, createAcMapping, createStoryMapping, createRequirementTestMatrix, createTestReference } from '../../helpers/test-helpers.js';
import { CoverageResult } from '../../../nyquist-validation/domain/value-objects/coverage-result.js';
import { CoverageCalculationService } from '../../../nyquist-validation/domain/services/coverage-calculation-service.js';

target('CoverageResult', () => {

  describe('生成テスト（CoverageCalculationService.calculate 経由）', () => {
    // UT-CVR-001
    it('totalAcCount=4, coveredAcCount=4 のとき rate=1.0、uncoveredAcIds=[] で生成されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs),
        createAcMapping('AC-2', refs),
        createAcMapping('AC-3', refs),
        createAcMapping('AC-4', refs),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });

    // UT-CVR-002
    it('totalAcCount=4, coveredAcCount=2 のとき rate=0.5、uncoveredAcIds=2件で生成されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs),
        createAcMapping('AC-2', refs),
        createAcMapping('AC-3', []),
        createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.5);
      expect(actual.uncoveredAcIds).toHaveLength(2);
    });

    // UT-CVR-003
    it('totalAcCount=4, coveredAcCount=0 のとき rate=0.0、uncoveredAcIds=4件で生成されること', () => {
      // Arrange
      const acMappings = [
        createAcMapping('AC-1', []),
        createAcMapping('AC-2', []),
        createAcMapping('AC-3', []),
        createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.0);
      expect(actual.uncoveredAcIds).toHaveLength(4);
    });

    // UT-CVR-004
    it('totalAcCount=0（空のmatrix）のとき rate=1.0（空は全網羅とみなす）で生成されること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
    });
  });

  describe('制約テスト', () => {
    // UT-CVR-005
    it('coveredAcCount > totalAcCount の不正な状態で CoverageResult を直接構築するとエラーがthrowされること', () => {
      // Arrange
      const actual = () =>
        CoverageResult.create({ rate: 1.0, coveredAcCount: 5, totalAcCount: 4, uncoveredAcIds: [] });
      // Act / Assert
      expect(actual).toThrow();
    });

    // UT-CVR-006
    it('rate が 0.0〜1.0 の範囲外（例: 1.5）で直接構築するとエラーがthrowされること', () => {
      // Arrange
      const actual = () =>
        CoverageResult.create({ rate: 1.5, coveredAcCount: 1, totalAcCount: 1, uncoveredAcIds: [] });
      // Act / Assert
      expect(actual).toThrow();
    });
  });

  describe('等値性テスト', () => {
    // UT-CVR-007
    it('全フィールドが等しいCoverageResult同士で equals が true を返すこと', () => {
      // Arrange
      const cvr1 = createCoverageResult({ rate: 0.5, coveredAcCount: 1, totalAcCount: 2, uncoveredAcIds: ['AC-2'] });
      const cvr2 = createCoverageResult({ rate: 0.5, coveredAcCount: 1, totalAcCount: 2, uncoveredAcIds: ['AC-2'] });
      // Act
      const actual = cvr1.equals(cvr2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-CVR-008
    it('rateが異なるCoverageResult同士で equals が false を返すこと', () => {
      // Arrange
      const cvr1 = createCoverageResult({ rate: 1.0, coveredAcCount: 1, totalAcCount: 1, uncoveredAcIds: [] });
      const cvr2 = createCoverageResult({ rate: 0.5, coveredAcCount: 1, totalAcCount: 2, uncoveredAcIds: ['AC-2'] });
      // Act
      const actual = cvr1.equals(cvr2);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('振る舞いテスト（meetsThreshold）', () => {
    // UT-CVR-009
    it('rate=0.9, threshold=0.9 のとき meetsThreshold が true を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.9, coveredAcCount: 9, totalAcCount: 10, uncoveredAcIds: ['AC-10'] });
      // Act
      const actual = sut.meetsThreshold(0.9);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-CVR-010
    it('rate=0.89, threshold=0.9 のとき meetsThreshold が false を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.89, coveredAcCount: 89, totalAcCount: 100, uncoveredAcIds: ['AC-90'] });
      // Act
      const actual = sut.meetsThreshold(0.9);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-CVR-011
    it('rate=1.0, threshold=0.95 のとき meetsThreshold が true を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 1.0, coveredAcCount: 1, totalAcCount: 1, uncoveredAcIds: [] });
      // Act
      const actual = sut.meetsThreshold(0.95);
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('振る舞いテスト（toPercentage）', () => {
    // UT-CVR-012
    it('rate=0.9 のとき toPercentage が 90 を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.9, coveredAcCount: 9, totalAcCount: 10, uncoveredAcIds: ['AC-10'] });
      // Act
      const actual = sut.toPercentage();
      // Assert
      expect(actual).toBe(90);
    });

    // UT-CVR-013
    it('rate=0.9999 のとき toPercentage が 99.99 を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.9999, coveredAcCount: 9999, totalAcCount: 10000, uncoveredAcIds: ['AC-10000'] });
      // Act
      const actual = sut.toPercentage();
      // Assert
      expect(actual).toBe(99.99);
    });

    // UT-CVR-014
    it('rate=0.0 のとき toPercentage が 0 を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.0, coveredAcCount: 0, totalAcCount: 1, uncoveredAcIds: ['AC-1'] });
      // Act
      const actual = sut.toPercentage();
      // Assert
      expect(actual).toBe(0);
    });
  });
});
