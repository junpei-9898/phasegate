/**
 * @layer test
 * @unit validator-system
 * @story H08-08
 */
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { StubCommentReport } from '../../../validator-system/domain/value-objects/stub-comment-report.js';

target('StubCommentReport', () => {

  describe('create()でスタブコメントレポートを生成する', () => {

    it('entries: []でレポートが生成されること (UT-VS-VO-SC-01)', () => {
      // Act
      const actual = StubCommentReport.create([]);
      // Assert
      expect(actual.entries).toHaveLength(0);
    });

    it('entries: [1件]でレポートが生成されること (UT-VS-VO-SC-02)', () => {
      // Arrange
      const entry = { filePath: 'adapter.ts', lineNumber: 10, lineContent: '// stub実装: TODO' };
      // Act
      const actual = StubCommentReport.create([entry]);
      // Assert
      expect(actual.entries).toHaveLength(1);
      expect(actual.entries[0].lineNumber).toBe(10);
    });

  });

  describe('empty()で空レポートを生成する', () => {

    it('empty()でentries: []のレポートが返ること (UT-VS-VO-SC-03)', () => {
      // Act
      const actual = StubCommentReport.empty();
      // Assert
      expect(actual.entries).toHaveLength(0);
    });

  });

  describe('hasViolations()で違反有無を返す', () => {

    it('entries: []のとき falseを返すこと (UT-VS-VO-SC-04)', () => {
      // Arrange
      const sut = StubCommentReport.empty();
      // Act & Assert
      expect(sut.hasViolations()).toBe(false);
    });

    it('entries: [1件]のとき trueを返すこと', () => {
      // Arrange
      const sut = StubCommentReport.create([{ filePath: 'a.ts', lineNumber: 5, lineContent: '// stub' }]);
      // Act & Assert
      expect(sut.hasViolations()).toBe(true);
    });

  });

  describe('toMessages()でメッセージ一覧を返す', () => {

    it('entries: []のとき空配列を返すこと (UT-VS-VO-SC-05)', () => {
      // Arrange
      const sut = StubCommentReport.empty();
      // Act
      const actual = sut.toMessages();
      // Assert
      expect(actual).toHaveLength(0);
    });

    it('entries: [1件]のときfilePath・lineNumberを含むメッセージを返すこと', () => {
      // Arrange
      const sut = StubCommentReport.create([
        { filePath: 'src/adapter.ts', lineNumber: 15, lineContent: '  // stub実装: dummy' },
      ]);
      // Act
      const actual = sut.toMessages();
      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0]).toContain('src/adapter.ts');
      expect(actual[0]).toContain('15');
    });

  });

});
