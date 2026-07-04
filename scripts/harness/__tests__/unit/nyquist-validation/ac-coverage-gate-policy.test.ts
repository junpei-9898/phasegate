// @layer test
// @story H07-02
import { describe, expect, it } from 'vitest';
import { target, context, createAcMapping, createStoryMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers.js';
import { AcCoverageGatePolicy } from '../../../nyquist-validation/domain/services/ac-coverage-gate-policy.js';

target('AcCoverageGatePolicy', () => {

  describe('正常系テスト', () => {
    // UT-ACGP-001
    it('全ACにTestReferenceが1件以上ある（1ストーリー2AC）とき check が passed=true、errors=[] を返すこと', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-002
    it('全ACにTestReferenceが1件以上ある（3ストーリー複数AC）とき check が passed=true、errors=[] を返すこと', () => {
      // Arrange
      const refs = [createTestReference()];
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', refs)]);
      const sm3 = createStoryMapping('H07-03', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs), createAcMapping('AC-3', refs)]);
      const matrix = createRequirementTestMatrix([sm1, sm2, sm3]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-003
    it('storyMappingsが空配列のとき check が passed=true、errors=[] を返すこと（ACなし=全AC網羅済み）', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-004
    it('acMappingsが空配列のStoryMappingのみのとき check が passed=true、errors=[] を返すこと', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });
  });

  describe('異常系テスト', () => {
    // UT-ACGP-005
    it('AC-1のTestReferenceが空（未カバー1件）のとき passed=false、errors に AC-1未カバーの HarnessError 1件が含まれること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });

    // UT-ACGP-006
    it('2ストーリーで各1件ずつ未カバーACがある場合 passed=false、errors が 2件であること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', [])]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', [])]);
      const matrix = createRequirementTestMatrix([sm1, sm2]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(2);
    });

    // UT-ACGP-007
    it('複数ACのうち1件だけ未カバーの場合 passed=false、errors に未カバーAC 1件のみが含まれること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [createAcMapping('AC-1', refs), createAcMapping('AC-2', [])];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });
  });

  describe('不変条件テスト', () => {
    // UT-ACGP-008
    it('passed=true のとき errors が空配列であること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [createTestReference()])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-009
    it('passed=false のとき errors が1件以上存在すること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors.length).toBeGreaterThanOrEqual(1);
    });

    // UT-ACGP-010
    it('未カバーAC検出時に各 HarnessError の code が L3-004 であること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.errors[0].code).toBe('L3-004');
    });
  });
});
