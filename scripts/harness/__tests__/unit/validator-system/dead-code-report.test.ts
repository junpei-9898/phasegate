/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { DeadCodeReport } from '../../../validator-system/domain/value-objects/dead-code-report.js';

target('DeadCodeReport', () => {

  describe('有効なフィールドからDeadCodeReportを生成する', () => {

    it('unusedExports: [], unreachableCode: [], gcRecommended: falseでDeadCodeReportが生成されること (UT-DCR-001/UT-BND-014)', () => {
      // Arrange & Act
      const actual = DeadCodeReport.create({
        unusedExports: [],
        unreachableCode: [],
        gcRecommended: false,
      });
      // Assert
      expect(actual).toBeDefined();
    });

    it('unusedExportsとunreachableCodeに値がある状態でDeadCodeReportが生成されること (UT-DCR-002)', () => {
      // Arrange & Act
      const actual = DeadCodeReport.create({
        unusedExports: ['src/index.ts::unusedFn'],
        unreachableCode: [{ filePath: 'src/util.ts', range: { startLine: 10, endLine: 15 } }],
        gcRecommended: false,
      });
      // Assert
      expect(actual.unusedExports).toHaveLength(1);
      expect(actual.unreachableCode).toHaveLength(1);
    });
  });

  describe('hasDeadCode()でデッドコード有無を返す', () => {

    it('unusedExports: [], unreachableCode: []のとき falseを返すこと (UT-DCR-003)', () => {
      // Arrange
      const sut = DeadCodeReport.create({ unusedExports: [], unreachableCode: [], gcRecommended: false });
      // Act
      const actual = sut.hasDeadCode();
      // Assert
      expect(actual).toBe(false);
    });

    it('unusedExports.length === 1のとき trueを返すこと (UT-DCR-004)', () => {
      // Arrange
      const sut = DeadCodeReport.create({
        unusedExports: ['src/index.ts::unusedFn'],
        unreachableCode: [],
        gcRecommended: false,
      });
      // Act
      const actual = sut.hasDeadCode();
      // Assert
      expect(actual).toBe(true);
    });

    it('unusedExports: [], unreachableCode.length === 1のとき trueを返すこと (UT-DCR-005)', () => {
      // Arrange
      const sut = DeadCodeReport.create({
        unusedExports: [],
        unreachableCode: [{ filePath: 'src/util.ts', range: { startLine: 10, endLine: 15 } }],
        gcRecommended: false,
      });
      // Act
      const actual = sut.hasDeadCode();
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('toHarnessErrors()でHarnessError[]を返す', () => {

    it('unusedExports: [1件]のときHarnessError[]が1件返ること（code: L4-003） (UT-DCR-006)', () => {
      // Arrange
      const sut = DeadCodeReport.create({
        unusedExports: ['src/index.ts::unusedFn'],
        unreachableCode: [],
        gcRecommended: false,
      });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].code.toString()).toBe('L4-003');
    });

    it('unusedExports: [], unreachableCode: []のとき空配列を返すこと (UT-DCR-007)', () => {
      // Arrange
      const sut = DeadCodeReport.create({ unusedExports: [], unreachableCode: [], gcRecommended: false });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toEqual([]);
    });
  });
});
