/**
 * @layer test
 * @unit validator-system
 * @story H08-01
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

    context('E2Eファイルが存在しないconsumer projectの場合', () => {
      it('limitationとして扱い、PhaseGate内部CLI coverage違反を誤検出しないこと', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        const commands = ['validate', 'phasegate:ci-check'];
        // Act
        const actual = sut.check(commands, []);
        // Assert
        expect(actual.hasViolations()).toBe(false);
        expect(actual.limitations()).toHaveLength(2);
        expect(actual.entries[0]).toMatchObject({
          commandName: 'validate',
          hasE2eTest: false,
          status: 'limitation',
        });
      });
    });

    context('E2Eファイル配列はあるが対象コマンドが含まれない場合', () => {
      it('PhaseGate self repositoryの未カバーコマンドとして違反を検出すること', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        const commands = ['validate'];
        // Act
        const actual = sut.check(commands, ['cli-harness.test.ts without the command']);
        // Assert
        expect(actual.hasViolations()).toBe(true);
        expect(actual.limitations()).toHaveLength(0);
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

    context('E2Eファイル内容にrun() invocationが含まれる場合', () => {
      it('direct CLI invocationとしてcoveredに分類されること', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        const commands = ['phasegate:ci-check'];
        const e2eFiles = ["it('checks ci', () => { const actual = run('phasegate:ci-check', '--json'); })"];
        // Act
        const actual = sut.check(commands, e2eFiles);
        // Assert
        expect(actual.hasViolations()).toBe(false);
        expect(actual.entries[0]).toMatchObject({ commandName: 'phasegate:ci-check', status: 'covered' });
      });
    });

    context('E2Eファイル内容にrunInCwd() invocationが含まれる場合', () => {
      it('fixture経由のCLI invocationとしてcoveredに分類されること', () => {
        // Arrange
        const sut = new CliE2eTestExistenceService();
        const commands = ['init'];
        const e2eFiles = ["withTempDir((cwd) => runInCwd(cwd, 'init', '--preset', 'full'))"];
        // Act
        const actual = sut.check(commands, e2eFiles);
        // Assert
        expect(actual.hasViolations()).toBe(false);
        expect(actual.entries[0]).toMatchObject({ commandName: 'init', status: 'covered' });
      });
    });

  });

});
