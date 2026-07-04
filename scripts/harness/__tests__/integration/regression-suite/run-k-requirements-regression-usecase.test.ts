// @layer test
// @unit regression-suite
// @story H14-01
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunKRequirementsRegressionUseCase } from '../../../regression-suite/application/usecases/run-k-requirements-regression-usecase.js';
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

const createTestFailureDetail = (overrides: Partial<{ testCaseId: string; errorMessage: string; stackTrace?: string }> = {}) =>
  TestFailureDetail.create({
    testCaseId: overrides.testCaseId ?? 'K1',
    errorMessage: overrides.errorMessage ?? 'テストが失敗しました',
    stackTrace: overrides.stackTrace,
  });

target('RunKRequirementsRegressionUseCase', () => {
  let suiteRegistryPort: SuiteRegistryPort;
  let testRunnerPort: TestRunnerPort;
  let configQueryPort: ConfigQueryPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let useCase: RunKRequirementsRegressionUseCase;

  beforeEach(() => {
    suiteRegistryPort = { getDefinition: vi.fn() };
    testRunnerPort = { runSuite: vi.fn() };
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(90) };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    useCase = new RunKRequirementsRegressionUseCase(
      suiteRegistryPort, testRunnerPort, configQueryPort, ciGateResultWriterPort
    );
  });

  // IT-UC-RunKReq-001
  describe('execute: K1-K15の全テストケースを実行してTestExecutionSummaryを返すこと', () => {
    context('SuiteRegistryPort が K1-K15 16件のKRequirementTestを返す場合', () => {
      it('RunRegressionSuiteOutput.passedCount=16・failedCount=0・totalCount=16・gateResult=go', async () => {
        // Arrange
        const kNumbers = ['K1','K2','K3','K3.5','K4','K5','K6','K7','K8','K9','K10','K11','K12','K13','K14','K15'];
        const testCases = kNumbers.map(k => createKRequirementTest({ kNumber: k, targetUnit: 'target-unit' }));
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements'), testCases });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 16, failedCount: 0, skippedCount: 0, totalCount: 16,
          coverageRate: createCoverageRate(95), failures: [],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'k-requirements' });

        // Assert
        expect(actual.passedCount).toBe(16);
        expect(actual.failedCount).toBe(0);
        expect(actual.totalCount).toBe(16);
        expect(actual.gateResult).toBe('go');
      });
    });
  });

  // IT-UC-RunKReq-002
  describe('execute: カバレッジ閾値90%を超過する場合にgateResult=go を返すこと', () => {
    context('TestRunnerPort が coverageRate=91 を返す場合', () => {
      it('gateResult=go・coverageRate=91', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 16, failedCount: 0, skippedCount: 0, totalCount: 16,
          coverageRate: createCoverageRate(91), failures: [],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'k-requirements' });

        // Assert
        expect(actual.gateResult).toBe('go');
        expect(actual.coverageRate).toBe(91);
      });
    });
  });

  // IT-UC-RunKReq-003
  describe('execute: カバレッジ閾値90%を下回る場合にgateResult=no-go を返すこと', () => {
    context('TestRunnerPort が passedCount=14・failedCount=2・coverageRate=85 を返す場合', () => {
      it('gateResult=no-go・failures.length=2', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 14, failedCount: 2, skippedCount: 0, totalCount: 16,
          coverageRate: createCoverageRate(85),
          failures: [
            createTestFailureDetail({ testCaseId: 'K1' }),
            createTestFailureDetail({ testCaseId: 'K2' }),
          ],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'k-requirements' });

        // Assert
        expect(actual.gateResult).toBe('no-go');
        expect(actual.failures).toHaveLength(2);
      });
    });
  });

  // IT-UC-RunKReq-004
  describe('execute: 失敗したテストケースのTestFailureDetailがfailuresに含まれること', () => {
    context("TestRunnerPort が failedCount=1・failures=[TestFailureDetail { testCaseId:'K3', errorMessage:'Biome AST error' }] を返す場合", () => {
      it("failures[0].testCaseId='K3'・failures[0].errorMessage='Biome AST error'", async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 0, failedCount: 1, skippedCount: 0, totalCount: 1,
          coverageRate: null,
          failures: [createTestFailureDetail({ testCaseId: 'K3', errorMessage: 'Biome AST error' })],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'k-requirements' });

        // Assert
        expect(actual.failures[0].testCaseId).toBe('K3');
        expect(actual.failures[0].errorMessage).toBe('Biome AST error');
      });
    });
  });

  // IT-UC-RunKReq-005
  describe('execute: スイート定義が見つからない場合にエラーが伝播すること', () => {
    context('SuiteRegistryPort.getDefinition が SuiteDefinitionNotFoundError をスローする場合', () => {
      it('SuiteDefinitionNotFoundError がスロー', async () => {
        // Arrange
        vi.mocked(suiteRegistryPort.getDefinition).mockRejectedValue(new Error('SuiteDefinitionNotFoundError'));

        // Act / Assert
        await expect(useCase.execute({ suiteId: 'k-requirements' }))
          .rejects.toThrow('SuiteDefinitionNotFoundError');
      });
    });
  });

  // IT-UC-RunKReq-006
  describe('execute: TestRunnerPortが失敗した場合にエラーが伝播すること', () => {
    context("TestRunnerPort.runSuite が throw Error('network error') をスローする場合", () => {
      it('TestRunnerPortError がスロー', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockRejectedValue(new Error('network error'));

        // Act / Assert
        await expect(useCase.execute({ suiteId: 'k-requirements' }))
          .rejects.toThrow('TestRunnerPortError');
      });
    });
  });
});
