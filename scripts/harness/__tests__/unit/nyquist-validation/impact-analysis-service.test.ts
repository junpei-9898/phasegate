// @layer test
// @story H07-04
import { describe, expect, it } from 'vitest';
import { target, createAcMapping, createStoryMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers.js';
import { ImpactAnalysisService } from '../../../nyquist-validation/domain/services/impact-analysis-service.js';

target('ImpactAnalysisService', () => {

  describe('正常系テスト', () => {
    // UT-IAS-001
    it('H07-01 に2つのAcMapping（各1件のTestReference）があるとき analyze が storyId=H07-01、directTests=2件のImpactAnalysisResultを返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts' });
      const ref2 = createTestReference({ filePath: 'scripts/__tests__/unit/b.test.ts' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref1]), createAcMapping('AC-2', [ref2])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.storyId).toBe('H07-01');
      expect(actual.directTests).toHaveLength(2);
    });

    // UT-IAS-002
    it('H07-01 の全ACがカバー済みのとき directMappingOnly=true のImpactAnalysisResultが返されること', () => {
      // Arrange
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [createTestReference()])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directMappingOnly).toBe(true);
    });

    // UT-IAS-003
    it('H07-01 のacMappingsが空配列のとき storyId=H07-01、directTests=[] のImpactAnalysisResultが返されること', () => {
      // Arrange
      const sm = createStoryMapping('H07-01', []);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.storyId).toBe('H07-01');
      expect(actual.directTests).toHaveLength(0);
    });
  });

  describe('異常系テスト（storyId未検出）', () => {
    // UT-IAS-004
    it('matrixに H07-01 のみ存在する状態で H07-99 を analyze すると directTests=[] の空ImpactAnalysisResultが返されること（エラーなし）', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01')]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-99');
      // Assert
      expect(actual.directTests).toHaveLength(0);
    });
  });

  describe('重複除去テスト', () => {
    // UT-IAS-005
    it('AC-1とAC-2に同一filePath・同一testTypeのTestReferenceが重複するとき directTests で重複が除去されて1件になること', () => {
      // Arrange
      const ref = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'unit' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref]), createAcMapping('AC-2', [ref])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directTests).toHaveLength(1);
    });

    // UT-IAS-006
    it('AC-1とAC-2に同一filePathだが異なるtestTypeのTestReferenceがある場合、両方のTestReferenceが含まれること', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'it' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref1]), createAcMapping('AC-2', [ref2])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directTests).toHaveLength(2);
    });
  });

  describe('不変条件テスト', () => {
    // UT-IAS-007
    it('どのstoryIdで analyze を呼んでも返却されるImpactAnalysisResultの directMappingOnly が常に true であること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01')]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directMappingOnly).toBe(true);
    });
  });
});
