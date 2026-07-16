// @unit regression-suite
// @layer infrastructure
// @story H15-02
import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessConfigQueryAdapter } from '../../../regression-suite/infrastructure/adapters/harness-config-query-adapter.js';
import { JsonCiGateResultWriterAdapter } from '../../../regression-suite/infrastructure/adapters/json-ci-gate-result-writer-adapter.js';
import { TestExecutionSummary } from '../../../regression-suite/domain/value-objects/test-execution-summary.js';
import { CoverageRate } from '../../../regression-suite/domain/value-objects/coverage-rate.js';
import { TestFailureDetail } from '../../../regression-suite/domain/value-objects/test-failure-detail.js';

target('HarnessConfigQueryAdapter（実体）', () => {
  // IT-ADP-ConfigQuery-001
  describe('getCoverageThreshold: 既定値 90 を返すこと', () => {
    context('コンストラクタ引数を指定せずに生成した場合', () => {
      it('actual=90', async () => {
        // Arrange
        const adapter = new HarnessConfigQueryAdapter();

        // Act
        const actual = await adapter.getCoverageThreshold();

        // Assert
        expect(actual).toBe(90);
      });
    });
  });

  // IT-ADP-ConfigQuery-002
  describe('getCoverageThreshold: コンストラクタで指定した閾値を返すこと', () => {
    context('defaultThreshold=80 を指定して生成した場合', () => {
      it('actual=80', async () => {
        // Arrange
        const adapter = new HarnessConfigQueryAdapter(80);

        // Act
        const actual = await adapter.getCoverageThreshold();

        // Assert
        expect(actual).toBe(80);
      });
    });
  });
});

target('JsonCiGateResultWriterAdapter（実 FS 書き出し）', () => {
  // IT-ADP-CiGateWriter-001
  describe('write: TestExecutionSummary を JSON として実 CI 出力ディレクトリに書き出すこと', () => {
    context('passed=10・failed=0 の summary を書き出す場合', () => {
      it('<suiteId>-result.json に passedCount=10・failedCount=0・suiteId が書き出されること', async () => {
        // Arrange
        const outputDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-cigate-'));
        try {
          const adapter = new JsonCiGateResultWriterAdapter(outputDir);
          const summary = TestExecutionSummary.create({
            passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10,
            coverageRate: CoverageRate.create(95), failures: [],
          });

          // Act
          await adapter.write('k-requirements', summary);

          // Assert
          const filePath = path.join(outputDir, 'k-requirements-result.json');
          const body = JSON.parse(await readFile(filePath, 'utf-8'));
          expect(body.suiteId).toBe('k-requirements');
          expect(body.passedCount).toBe(10);
          expect(body.failedCount).toBe(0);
          expect(body.coverageRate).toBe(95);
        } finally {
          await rm(outputDir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-CiGateWriter-002
  describe('write: 失敗を含む summary の failures を JSON に含めて書き出すこと', () => {
    context('failed=2・failures 2 件を持つ summary を書き出す場合', () => {
      it('書き出された JSON の failures に testCaseId/errorMessage が含まれること', async () => {
        // Arrange
        const outputDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-cigate-fail-'));
        try {
          const adapter = new JsonCiGateResultWriterAdapter(outputDir);
          const summary = TestExecutionSummary.create({
            passedCount: 8, failedCount: 2, skippedCount: 0, totalCount: 10,
            coverageRate: CoverageRate.create(70),
            failures: [
              TestFailureDetail.create({ testCaseId: 'K1', errorMessage: 'assertion failed' }),
              TestFailureDetail.create({ testCaseId: 'K2', errorMessage: 'timeout' }),
            ],
          });

          // Act
          await adapter.write('gng-gate', summary);

          // Assert
          const filePath = path.join(outputDir, 'gng-gate-result.json');
          const body = JSON.parse(await readFile(filePath, 'utf-8'));
          expect(body.failedCount).toBe(2);
          expect(body.failures).toHaveLength(2);
          expect(body.failures[0].testCaseId).toBe('K1');
          expect(body.failures[0].errorMessage).toBe('assertion failed');
        } finally {
          await rm(outputDir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-CiGateWriter-003
  describe('write: coverageRate が null の summary を coverageRate=null で書き出すこと', () => {
    context('coverageRate=null の summary を書き出す場合', () => {
      it('書き出された JSON の coverageRate が null であること', async () => {
        // Arrange
        const outputDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-cigate-nullcov-'));
        try {
          const adapter = new JsonCiGateResultWriterAdapter(outputDir);
          const summary = TestExecutionSummary.create({
            passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1,
            coverageRate: null, failures: [],
          });

          // Act
          await adapter.write('agent-independence', summary);

          // Assert
          const filePath = path.join(outputDir, 'agent-independence-result.json');
          const body = JSON.parse(await readFile(filePath, 'utf-8'));
          expect(body.coverageRate).toBeNull();
        } finally {
          await rm(outputDir, { recursive: true, force: true });
        }
      });
    });
  });
});
