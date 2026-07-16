// @unit regression-suite
// @layer infrastructure
// @story H14-01
import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { buildRegressionSuite } from '../../../regression-suite/composition-root.js';

target('k-requirements 実行統合フロー（実配線）', () => {
  // IT-FLOW-KReq-001
  describe('composition-root 経由で UseCase→レジストリ→TestRunner→CiGateWriter が連携すること', () => {
    context('__tests__ を持たない baseDir で k-requirements スイートを実行する場合', () => {
      it('RunRegressionSuiteOutput.totalCount=16（K1〜K15 全件が実配線で評価される）', async () => {
        // Arrange: 実 composition-root で全 adapter を実体配線する
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-kreq-flow-'));
        try {
          const suite = buildRegressionSuite(baseDir);

          // Act
          const actual = await suite.runKRequirementsRegressionUseCase.execute({ suiteId: 'k-requirements' });

          // Assert
          expect(actual.totalCount).toBe(16);
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      }, 60000);
    });
  });

  // IT-FLOW-KReq-002
  describe('実配線フローの結果が CiGateResultWriter で実ファイルに書き出されること', () => {
    context('k-requirements スイートを実行した場合', () => {
      it('baseDir/reports/regression/k-requirements-result.json が生成され suiteId を保持すること', async () => {
        // Arrange
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-kreq-write-'));
        try {
          const suite = buildRegressionSuite(baseDir);

          // Act
          await suite.runKRequirementsRegressionUseCase.execute({ suiteId: 'k-requirements' });

          // Assert
          const resultPath = path.join(baseDir, 'reports', 'regression', 'k-requirements-result.json');
          const body = JSON.parse(await readFile(resultPath, 'utf-8'));
          expect(body.suiteId).toBe('k-requirements');
          expect(body.totalCount).toBe(16);
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      }, 60000);
    });
  });
});
