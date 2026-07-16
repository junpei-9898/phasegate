// @unit regression-suite
// @layer infrastructure
// @story H14-01
import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { VitestTestRunnerAdapter } from '../../../regression-suite/infrastructure/adapters/vitest-test-runner-adapter.js';
import { KRequirementTest } from '../../../regression-suite/domain/value-objects/k-requirement-test.js';

target('VitestTestRunnerAdapter（実 FS 実行）', () => {
  // IT-ADP-VitestRunner-001
  describe('runSuite: testCases が空のとき全カウント 0 の TestRunnerResult を返すこと', () => {
    context('空配列を渡す場合', () => {
      it('passedCount=0・failedCount=0・totalCount=0・failures=[]・coverageRate=null', async () => {
        // Arrange
        const adapter = new VitestTestRunnerAdapter(process.cwd());

        // Act
        const actual = await adapter.runSuite([]);

        // Assert
        expect(actual.passedCount).toBe(0);
        expect(actual.failedCount).toBe(0);
        expect(actual.totalCount).toBe(0);
        expect(actual.failures).toEqual([]);
        expect(actual.coverageRate).toBeNull();
      });
    });
  });

  // IT-ADP-VitestRunner-002
  describe('runSuite: テストディレクトリが存在しない targetUnit を未実装ユニットとして pass 扱いすること', () => {
    context('実 FS 上に unit/integration ディレクトリを持たない targetUnit を渡す場合', () => {
      it('passedCount=件数・failedCount=0・totalCount=件数（実ディレクトリ探索の結果）', async () => {
        // Arrange: __tests__ が存在しない一時ディレクトリを rootDir とし、実ファイル探索を発生させる
        const rootDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-vitest-'));
        try {
          const adapter = new VitestTestRunnerAdapter(rootDir);
          const testCases = [
            KRequirementTest.create({ kNumber: 'K1', targetUnit: 'nonexistent-unit-a', verificationCondition: '条件A' }),
            KRequirementTest.create({ kNumber: 'K2', targetUnit: 'nonexistent-unit-b', verificationCondition: '条件B' }),
          ];

          // Act
          const actual = await adapter.runSuite(testCases);

          // Assert
          expect(actual.passedCount).toBe(2);
          expect(actual.failedCount).toBe(0);
          expect(actual.totalCount).toBe(2);
          expect(actual.failures).toEqual([]);
        } finally {
          await rm(rootDir, { recursive: true, force: true });
        }
      }, 30000);
    });
  });

  // IT-ADP-VitestRunner-003
  describe('runSuite: 同一 targetUnit の複数テストケースをまとめて 1 回の判定に集約すること', () => {
    context('存在しない同一 targetUnit のテストケースを 3 件渡す場合', () => {
      it('totalCount=3・全件が同一ユニット判定（pass）へ集約されること', async () => {
        // Arrange
        const rootDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-vitest-agg-'));
        try {
          const adapter = new VitestTestRunnerAdapter(rootDir);
          const testCases = [
            KRequirementTest.create({ kNumber: 'K1', targetUnit: 'same-missing-unit', verificationCondition: '条件1' }),
            KRequirementTest.create({ kNumber: 'K2', targetUnit: 'same-missing-unit', verificationCondition: '条件2' }),
            KRequirementTest.create({ kNumber: 'K3', targetUnit: 'same-missing-unit', verificationCondition: '条件3' }),
          ];

          // Act
          const actual = await adapter.runSuite(testCases);

          // Assert
          expect(actual.totalCount).toBe(3);
          expect(actual.passedCount).toBe(3);
          expect(actual.failedCount).toBe(0);
        } finally {
          await rm(rootDir, { recursive: true, force: true });
        }
      }, 30000);
    });
  });
});
