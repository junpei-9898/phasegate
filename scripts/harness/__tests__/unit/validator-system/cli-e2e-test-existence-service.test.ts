/**
 * @layer test
 * @unit validator-system
 * @story H08-09
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CliE2eTestExistenceService } from '../../../validator-system/domain/services/cli-e2e-test-existence-service.js';

target('CliE2eTestExistenceService', () => {

  describe('check()', () => {

    context('commandsが空のとき', () => {
      it('entries: []のレポートを返すこと (UT-VS-DS-CE-01)', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        // Act
        const actual = sut.check([], []);
        // Assert
        expect(actual.hasViolations()).toBe(false);
        expect(actual.entries).toHaveLength(0);
      });
    });

    context('e2eTestFilesにコマンド名が含まれる場合', () => {
      it('hasE2eTest: trueで返ること (UT-VS-DS-CE-02)', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        const commands = ['ci:check'];
        const e2eFiles = ['/tests/cli-harness.test.ts ci:check is working'];
        // Act
        const actual = sut.check(commands, e2eFiles);
        // Assert
        expect(actual.hasViolations()).toBe(false);
        expect(actual.entries[0].hasE2eTest).toBe(true);
      });
    });

    context('e2eTestFilesにコマンド名が含まれない場合', () => {
      it('hasE2eTest: falseで返り違反が検出されること (UT-VS-DS-CE-03)', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        const commands = ['ci:generate-template'];
        const e2eFiles = ['other content only'];
        // Act
        const actual = sut.check(commands, e2eFiles);
        // Assert
        expect(actual.hasViolations()).toBe(true);
        expect(actual.entries[0].hasE2eTest).toBe(false);
        expect(actual.entries[0].commandName).toBe('ci:generate-template');
      });
    });

    context('複数コマンドで一部にE2Eテストがない場合', () => {
      it('カバー済みとuncoveredが正しく分類されること (UT-VS-DS-CE-04)', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        const commands = ['cmd-a', 'cmd-b', 'cmd-c'];
        const e2eFiles = ['cmd-a is tested here and cmd-c too'];
        // Act
        const actual = sut.check(commands, e2eFiles);
        // Assert
        const uncovered = actual.uncoveredCommands();
        expect(uncovered).toHaveLength(1);
        expect(uncovered[0].commandName).toBe('cmd-b');
      });
    });

  });

});
