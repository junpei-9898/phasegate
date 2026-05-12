/**
 * @layer test
 * @unit validator-system
 * @work-item-id WI-111
 * @story H08-01
 */
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { CliE2eTestCoverageReport } from '../../../validator-system/domain/value-objects/cli-e2e-test-coverage-report.js';

target('CliE2eTestCoverageReport', () => {

  describe('create()でカバレッジレポートを生成する', () => {

    it('entries: []でレポートが生成されること (UT-VS-VO-CE-01)', () => {
      // Act
      const actual = CliE2eTestCoverageReport.create([]);
      // Assert
      expect(actual.entries).toHaveLength(0);
    });

    it('entries: [hasE2eTest: true]でレポートが生成されること (UT-VS-VO-CE-02)', () => {
      // Arrange
      const entry = { commandName: 'ci:check', hasE2eTest: true };
      // Act
      const actual = CliE2eTestCoverageReport.create([entry]);
      // Assert
      expect(actual.entries).toHaveLength(1);
      expect(actual.entries[0].commandName).toBe('ci:check');
    });

  });

  describe('empty()で空レポートを生成する', () => {

    it('empty()でentries: []のレポートが返ること (UT-VS-VO-CE-03)', () => {
      // Act
      const actual = CliE2eTestCoverageReport.empty();
      // Assert
      expect(actual.entries).toHaveLength(0);
    });

  });

  describe('uncoveredCommands()で未カバーコマンド一覧を返す', () => {

    it('全件hasE2eTest: trueのとき空配列を返すこと (UT-VS-VO-CE-04)', () => {
      // Arrange
      const sut = CliE2eTestCoverageReport.create([
        { commandName: 'cmd-a', hasE2eTest: true },
        { commandName: 'cmd-b', hasE2eTest: true },
      ]);
      // Act
      const actual = sut.uncoveredCommands();
      // Assert
      expect(actual).toHaveLength(0);
    });

    it('hasE2eTest: falseが1件あるとき1件を返すこと', () => {
      // Arrange
      const sut = CliE2eTestCoverageReport.create([
        { commandName: 'cmd-a', hasE2eTest: true },
        { commandName: 'cmd-b', hasE2eTest: false },
      ]);
      // Act
      const actual = sut.uncoveredCommands();
      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].commandName).toBe('cmd-b');
    });

  });

  describe('hasViolations()で違反有無を返す', () => {

    it('全件カバー済みのとき falseを返すこと', () => {
      // Arrange
      const sut = CliE2eTestCoverageReport.create([{ commandName: 'cmd', hasE2eTest: true }]);
      // Act & Assert
      expect(sut.hasViolations()).toBe(false);
    });

    it('未カバーが1件あるとき trueを返すこと', () => {
      // Arrange
      const sut = CliE2eTestCoverageReport.create([{ commandName: 'cmd', hasE2eTest: false }]);
      // Act & Assert
      expect(sut.hasViolations()).toBe(true);
    });

  });

  describe('toMessages()でメッセージ一覧を返す', () => {

    it('全件カバー済みのとき空配列を返すこと (UT-VS-VO-CE-05)', () => {
      // Arrange
      const sut = CliE2eTestCoverageReport.create([{ commandName: 'cmd', hasE2eTest: true }]);
      // Act
      const actual = sut.toMessages();
      // Assert
      expect(actual).toHaveLength(0);
    });

    it('未カバー1件のときコマンド名を含むメッセージを返すこと', () => {
      // Arrange
      const sut = CliE2eTestCoverageReport.create([{ commandName: 'ci:generate-template', hasE2eTest: false }]);
      // Act
      const actual = sut.toMessages();
      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0]).toContain('ci:generate-template');
    });

  });

});
