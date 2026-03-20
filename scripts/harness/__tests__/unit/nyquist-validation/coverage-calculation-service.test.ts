import { describe, expect, it } from 'vitest';
import { target, createAcMapping, createStoryMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers.js';
import { CoverageCalculationService } from '../../../nyquist-validation/domain/services/coverage-calculation-service.js';

target('CoverageCalculationService', () => {

  describe('正常系テスト', () => {
    // UT-CCS-001
    it('全4ACがカバー済みのとき rate=1.0、coveredAcCount=4、totalAcCount=4、uncoveredAcIds=[] が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs), createAcMapping('AC-2', refs),
        createAcMapping('AC-3', refs), createAcMapping('AC-4', refs),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.coveredAcCount).toBe(4);
      expect(actual.totalAcCount).toBe(4);
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });

    // UT-CCS-002
    it('4ACのうち2件カバー済みのとき rate=0.5、coveredAcCount=2、totalAcCount=4、uncoveredAcIds=2件が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs), createAcMapping('AC-2', refs),
        createAcMapping('AC-3', []), createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.5);
      expect(actual.coveredAcCount).toBe(2);
      expect(actual.totalAcCount).toBe(4);
      expect(actual.uncoveredAcIds).toHaveLength(2);
    });

    // UT-CCS-003
    it('全ACが未カバー（4件）のとき rate=0.0、coveredAcCount=0、totalAcCount=4、uncoveredAcIds=4件が返されること', () => {
      // Arrange
      const acMappings = [
        createAcMapping('AC-1', []), createAcMapping('AC-2', []),
        createAcMapping('AC-3', []), createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.0);
      expect(actual.coveredAcCount).toBe(0);
      expect(actual.totalAcCount).toBe(4);
      expect(actual.uncoveredAcIds).toHaveLength(4);
    });

    // UT-CCS-004
    it('storyMappingsが空配列のとき rate=1.0、coveredAcCount=0、totalAcCount=0、uncoveredAcIds=[] が返されること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.coveredAcCount).toBe(0);
      expect(actual.totalAcCount).toBe(0);
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });

    // UT-CCS-005
    it('2ストーリー × 2AC（全カバー）のとき rate=1.0、totalAcCount=4 が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)]);
      const matrix = createRequirementTestMatrix([sm1, sm2]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.totalAcCount).toBe(4);
    });
  });

  describe('uncoveredAcIds 収集テスト', () => {
    // UT-CCS-006
    it('H07-01: AC-1未カバー、H07-02: AC-2未カバーのとき uncoveredAcIds に AC-1 と AC-2 が含まれること', () => {
      // Arrange
      const refs = [createTestReference()];
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', []), createAcMapping('AC-2', refs)]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', refs), createAcMapping('AC-2', [])]);
      const matrix = createRequirementTestMatrix([sm1, sm2]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.uncoveredAcIds).toContain('AC-1');
      expect(actual.uncoveredAcIds).toContain('AC-2');
    });

    // UT-CCS-007
    it('全ACがカバー済みのとき uncoveredAcIds が空配列であること', () => {
      // Arrange
      const refs = [createTestReference()];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', refs)])]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });
  });

  describe('境界値テスト', () => {
    // UT-CCS-008
    it('totalAcCount=1, coveredAcCount=1 のとき rate=1.0 が小数点以下4桁で保持されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', refs)])]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
    });

    // UT-CCS-009
    it('totalAcCount=3, coveredAcCount=1 のとき rate=0.3333（小数点以下4桁）が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [createAcMapping('AC-1', refs), createAcMapping('AC-2', []), createAcMapping('AC-3', [])];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.3333);
    });
  });
});
