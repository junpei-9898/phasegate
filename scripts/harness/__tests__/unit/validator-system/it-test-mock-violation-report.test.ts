/**
 * @layer test
 * @unit validator-system
 * @story H08-07
 */
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ItTestMockViolationReport } from '../../../validator-system/domain/value-objects/it-test-mock-violation-report.js';

target('ItTestMockViolationReport', () => {

  describe('create()で違反レポートを生成する', () => {

    it('violations: []でレポートが生成されること (UT-VS-VO-IM-01)', () => {
      // Act
      const actual = ItTestMockViolationReport.create([]);
      // Assert
      expect(actual.violations).toHaveLength(0);
    });

    it('violations: [1件]でレポートが生成されること (UT-VS-VO-IM-02)', () => {
      // Arrange
      const entry = { filePath: 'test.ts', mockedModules: ['./service'] };
      // Act
      const actual = ItTestMockViolationReport.create([entry]);
      // Assert
      expect(actual.violations).toHaveLength(1);
      expect(actual.violations[0].filePath).toBe('test.ts');
    });

  });

  describe('empty()で空レポートを生成する', () => {

    it('empty()でviolations: []のレポートが返ること (UT-VS-VO-IM-03)', () => {
      // Act
      const actual = ItTestMockViolationReport.empty();
      // Assert
      expect(actual.violations).toHaveLength(0);
    });

  });

  describe('hasViolations()で違反有無を返す', () => {

    it('violations: []のとき falseを返すこと (UT-VS-VO-IM-04)', () => {
      // Arrange
      const sut = ItTestMockViolationReport.empty();
      // Act & Assert
      expect(sut.hasViolations()).toBe(false);
    });

    it('violations: [1件]のとき trueを返すこと', () => {
      // Arrange
      const sut = ItTestMockViolationReport.create([{ filePath: 'a.ts', mockedModules: ['./b'] }]);
      // Act & Assert
      expect(sut.hasViolations()).toBe(true);
    });

  });

  describe('toMessages()でメッセージ一覧を返す', () => {

    it('violations: []のとき空配列を返すこと (UT-VS-VO-IM-05)', () => {
      // Arrange
      const sut = ItTestMockViolationReport.empty();
      // Act
      const actual = sut.toMessages();
      // Assert
      expect(actual).toHaveLength(0);
    });

    it('violations: [filePath, mockedModules:[2件]]のときメッセージ2件を返すこと', () => {
      // Arrange
      const sut = ItTestMockViolationReport.create([
        { filePath: 'foo.test.ts', mockedModules: ['./service-a', './service-b'] },
      ]);
      // Act
      const actual = sut.toMessages();
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0]).toContain('foo.test.ts');
      expect(actual[0]).toContain('./service-a');
    });

  });

});
