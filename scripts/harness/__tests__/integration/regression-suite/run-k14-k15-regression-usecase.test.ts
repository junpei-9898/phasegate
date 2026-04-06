// @layer test
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunK14K15RegressionUseCase } from '../../../regression-suite/application/usecases/run-k14-k15-regression-usecase.js';
import { SuiteId } from '../../../regression-suite/domain/value-objects/suite-id.js';
import { KRequirementTest } from '../../../regression-suite/domain/value-objects/k-requirement-test.js';
import { RegressionSuiteDefinition } from '../../../regression-suite/domain/value-objects/regression-suite-definition.js';
import { TestFailureDetail } from '../../../regression-suite/domain/value-objects/test-failure-detail.js';
import { CoverageRate } from '../../../regression-suite/domain/value-objects/coverage-rate.js';
import type { SuiteRegistryPort } from '../../../regression-suite/domain/ports/suite-registry-port.js';
import type { TestRunnerPort } from '../../../regression-suite/domain/ports/test-runner-port.js';
import type { ConfigQueryPort } from '../../../regression-suite/domain/ports/config-query-port.js';
import type { CiGateResultWriterPort } from '../../../regression-suite/domain/ports/ci-gate-result-writer-port.js';

const createSuiteId = (value: 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence' = 'k-requirements') =>
  SuiteId.create(value);

const createKRequirementTest = (overrides: Partial<{ kNumber: string; targetUnit: string }> = {}) =>
  KRequirementTest.create({
    kNumber: overrides.kNumber ?? 'K1',
    targetUnit: overrides.targetUnit ?? 'test-unit',
    verificationCondition: 'テスト条件',
  });

const createRegressionSuiteDefinition = (overrides: Partial<{ suiteId: SuiteId; testCases: KRequirementTest[] }> = {}) =>
  RegressionSuiteDefinition.create({
    suiteId: overrides.suiteId ?? createSuiteId('k-requirements'),
    testCases: overrides.testCases ?? [createKRequirementTest()],
    description: 'テスト用スイート定義',
  });

const createCoverageRate = (value: number) => CoverageRate.create(value);

const createTestFailureDetail = (overrides: Partial<{ testCaseId: string; errorMessage: string }> = {}) =>
  TestFailureDetail.create({
    testCaseId: overrides.testCaseId ?? 'K1',
    errorMessage: overrides.errorMessage ?? 'テストが失敗しました',
  });

target('RunK14K15RegressionUseCase', () => {
  let suiteRegistryPort: SuiteRegistryPort;
  let testRunnerPort: TestRunnerPort;
  let configQueryPort: ConfigQueryPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let useCase: RunK14K15RegressionUseCase;

  beforeEach(() => {
    suiteRegistryPort = { getDefinition: vi.fn() };
    testRunnerPort = { runSuite: vi.fn() };
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(90) };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    useCase = new RunK14K15RegressionUseCase(
      suiteRegistryPort, testRunnerPort, configQueryPort, ciGateResultWriterPort
    );
  });

  // IT-UC-RunK14K15-001
  describe('execute: K14とK15のテストケースのみを実行すること', () => {
    context("kNumberFilter=['K14', 'K15'] を指定した場合", () => {
      it('TestRunnerPort.runSuite が K14/K15 の2件のみ受け取ること', async () => {
        // Arrange
        const allTestCases = ['K1','K2','K3','K4','K5','K6','K7','K8','K9','K10','K11','K12','K13','K14','K15','K3.5']
          .map(k => createKRequirementTest({ kNumber: k }));
        const definition = createRegressionSuiteDefinition({
          suiteId: createSuiteId('k-requirements'), testCases: allTestCases,
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 2, failedCount: 0, skippedCount: 0, totalCount: 2,
          coverageRate: null, failures: [],
        });

        // Act
        await useCase.execute({ suiteId: 'k-requirements', kNumberFilter: ['K14', 'K15'] });

        // Assert
        const passedTestCases = vi.mocked(testRunnerPort.runSuite).mock.calls[0][0] as KRequirementTest[];
        expect(passedTestCases).toHaveLength(2);
        expect(passedTestCases.every((tc) => ['K14', 'K15'].includes(tc.kNumber))).toBe(true);
      });
    });
  });

  // IT-UC-RunK14K15-002
  describe("execute: K14テスト通過時にgateResult='go'を返すこと", () => {
    context("kNumberFilter=['K14', 'K15'] 指定で全件通過する場合", () => {
      it("RunRegressionSuiteOutput.gateResult='go'・passedCount=2", async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({
          suiteId: createSuiteId('k-requirements'),
          testCases: [
            createKRequirementTest({ kNumber: 'K14' }),
            createKRequirementTest({ kNumber: 'K15' }),
          ],
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 2, failedCount: 0, skippedCount: 0, totalCount: 2,
          coverageRate: createCoverageRate(95), failures: [],
        });

        // Act
        const actual = await useCase.execute({ kNumberFilter: ['K14', 'K15'] });

        // Assert
        expect(actual.gateResult).toBe('go');
        expect(actual.passedCount).toBe(2);
      });
    });
  });

  // IT-UC-RunK14K15-003
  describe("execute: K15テスト失敗時にfailuresにK15の詳細が含まれること", () => {
    context("kNumberFilter=['K14', 'K15'] 指定でK15が失敗する場合", () => {
      it("failures[0].testCaseId='K15'", async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({
          suiteId: createSuiteId('k-requirements'),
          testCases: [
            createKRequirementTest({ kNumber: 'K14' }),
            createKRequirementTest({ kNumber: 'K15' }),
          ],
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 1, skippedCount: 0, totalCount: 2,
          coverageRate: null,
          failures: [createTestFailureDetail({ testCaseId: 'K15', errorMessage: 'K15 assertion failed' })],
        });

        // Act
        const actual = await useCase.execute({ kNumberFilter: ['K14', 'K15'] });

        // Assert
        expect(actual.failures[0].testCaseId).toBe('K15');
      });
    });
  });
});
