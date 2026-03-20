/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ConsistencyReport } from '../../../validator-system/domain/value-objects/consistency-report.js';

target('ConsistencyReport', () => {

  describe('有効なフィールドからConsistencyReportを生成する', () => {

    it('mismatchPairs: [], checkTargets: [domain_model.md]でConsistencyReportが生成されること (UT-CSR-001)', () => {
      // Arrange & Act
      const actual = ConsistencyReport.create({
        mismatchPairs: [],
        checkTargets: ['domain_model.md'],
      });
      // Assert
      expect(actual).toBeDefined();
    });

    it('mismatchPairs: [1件]でConsistencyReportが生成されること (UT-CSR-002)', () => {
      // Arrange
      const mismatch = { expected: 'L2', actual: 'L3', location: 'domain_model.md:12' };
      // Act
      const actual = ConsistencyReport.create({
        mismatchPairs: [mismatch],
        checkTargets: ['domain_model.md'],
      });
      // Assert
      expect(actual.mismatchPairs).toHaveLength(1);
    });
  });

  describe('hasMismatches()で不整合有無を返す', () => {

    it('mismatchPairs: []のとき falseを返すこと (UT-CSR-003/UT-BND-013)', () => {
      // Arrange
      const sut = ConsistencyReport.create({ mismatchPairs: [], checkTargets: [] });
      // Act
      const actual = sut.hasMismatches();
      // Assert
      expect(actual).toBe(false);
    });

    it('mismatchPairs.length === 2のとき trueを返すこと (UT-CSR-004)', () => {
      // Arrange
      const pair = { expected: 'L2', actual: 'L3', location: 'doc:1' };
      const sut = ConsistencyReport.create({ mismatchPairs: [pair, pair], checkTargets: [] });
      // Act
      const actual = sut.hasMismatches();
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('mismatchCount()で不整合件数を返す', () => {

    it('mismatchPairs.length === 3のとき 3を返すこと (UT-CSR-005)', () => {
      // Arrange
      const pair = { expected: 'L2', actual: 'L3', location: 'doc:1' };
      const sut = ConsistencyReport.create({ mismatchPairs: [pair, pair, pair], checkTargets: [] });
      // Act
      const actual = sut.mismatchCount();
      // Assert
      expect(actual).toBe(3);
    });
  });

  describe('toHarnessErrors()でHarnessError[]を返す', () => {

    it('mismatchPairs.length === 2のときHarnessError[]が2件返ること（各code: L4-002） (UT-CSR-006)', () => {
      // Arrange
      const pair = { expected: 'L2', actual: 'L3', location: 'doc:1' };
      const sut = ConsistencyReport.create({ mismatchPairs: [pair, pair], checkTargets: [] });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].code.toString()).toBe('L4-002');
      expect(actual[1].code.toString()).toBe('L4-002');
    });

    it('mismatchPairs: []のとき空配列を返すこと (UT-CSR-007)', () => {
      // Arrange
      const sut = ConsistencyReport.create({ mismatchPairs: [], checkTargets: [] });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toEqual([]);
    });
  });
});
