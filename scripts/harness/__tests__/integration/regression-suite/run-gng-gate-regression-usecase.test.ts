// @layer test
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunGngGateRegressionUseCase } from '../../../regression-suite/application/usecases/run-gng-gate-regression-usecase.js';
import { SuiteId } from '../../../regression-suite/domain/value-objects/suite-id.js';
import { GngConditionTest } from '../../../regression-suite/domain/value-objects/gng-condition-test.js';
import { RegressionSuiteDefinition } from '../../../regression-suite/domain/value-objects/regression-suite-definition.js';
import { TestFailureDetail } from '../../../regression-suite/domain/value-objects/test-failure-detail.js';
import type { SuiteRegistryPort } from '../../../regression-suite/domain/ports/suite-registry-port.js';
import type { TestRunnerPort } from '../../../regression-suite/domain/ports/test-runner-port.js';
import type { ConfigQueryPort } from '../../../regression-suite/domain/ports/config-query-port.js';
import type { CiGateResultWriterPort } from '../../../regression-suite/domain/ports/ci-gate-result-writer-port.js';

const createSuiteId = (value: 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence' = 'gng-gate') =>
  SuiteId.create(value);

const createGngConditionTest = (overrides: Partial<{ gngNumber: string }> = {}) =>
  GngConditionTest.create({
    gngNumber: overrides.gngNumber ?? 'GNG-4',
    targetUnit: 'test-unit',
    verificationCondition: 'GNG条件を検証する',
  });

const createRegressionSuiteDefinition = (overrides: Partial<{ suiteId: SuiteId; testCases: GngConditionTest[] }> = {}) =>
  RegressionSuiteDefinition.create({
    suiteId: overrides.suiteId ?? createSuiteId('gng-gate'),
    testCases: overrides.testCases ?? [createGngConditionTest()],
    description: 'テスト用スイート定義',
  });

const createTestFailureDetail = (overrides: Partial<{ testCaseId: string; errorMessage: string }> = {}) =>
  TestFailureDetail.create({
    testCaseId: overrides.testCaseId ?? 'GNG-4',
    errorMessage: overrides.errorMessage ?? 'GNG条件が失敗しました',
  });

target('RunGngGateRegressionUseCase', () => {
  let suiteRegistryPort: SuiteRegistryPort;
  let testRunnerPort: TestRunnerPort;
  let configQueryPort: ConfigQueryPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let useCase: RunGngGateRegressionUseCase;

  beforeEach(() => {
    suiteRegistryPort = { getDefinition: vi.fn() };
    testRunnerPort = { runSuite: vi.fn() };
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(90) };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    useCase = new RunGngGateRegressionUseCase(
      suiteRegistryPort, testRunnerPort, configQueryPort, ciGateResultWriterPort
    );
  });

  // IT-UC-RunGng-001
  describe('execute: GNG-4/GNG-5/GNG-8の3件を実行してsummaryを返すこと', () => {
    context('SuiteRegistryPort が GngConditionTest[] 3件を返し全件通過する場合', () => {
      it('RunRegressionSuiteOutput.passedCount=3・totalCount=3・gateResult=go', async () => {
        // Arrange
        const testCases = [
          createGngConditionTest({ gngNumber: 'GNG-4' }),
          createGngConditionTest({ gngNumber: 'GNG-5' }),
          createGngConditionTest({ gngNumber: 'GNG-8' }),
        ];
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('gng-gate'), testCases });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 3, failedCount: 0, skippedCount: 0, totalCount: 3,
          coverageRate: null, failures: [],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'gng-gate' });

        // Assert
        expect(actual.passedCount).toBe(3);
        expect(actual.totalCount).toBe(3);
        expect(actual.gateResult).toBe('go');
      });
    });
  });

  // IT-UC-RunGng-002
  describe("execute: GNG条件のいずれかが失敗した場合にgateResult='no-go'を返すこと", () => {
    context("TestRunnerPort が passedCount=2・failedCount=1・failures=[GNG-4] を返す場合", () => {
      it("gateResult='no-go'・failures[0].testCaseId='GNG-4'", async () => {
        // Arrange
        const testCases = ['GNG-4','GNG-5','GNG-8'].map(g => createGngConditionTest({ gngNumber: g }));
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('gng-gate'), testCases });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 2, failedCount: 1, skippedCount: 0, totalCount: 3,
          coverageRate: null,
          failures: [createTestFailureDetail({ testCaseId: 'GNG-4', errorMessage: 'GNG-4 violation' })],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'gng-gate' });

        // Assert
        expect(actual.gateResult).toBe('no-go');
        expect(actual.failures[0].testCaseId).toBe('GNG-4');
      });
    });
  });

  // IT-UC-RunGng-003
  describe("execute: CiGateResultWriterPortにgng-gateの結果が書き出されること", () => {
    context('全件通過した場合', () => {
      it("CiGateResultWriterPort.write('gng-gate', summary) が1回呼ばれる", async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({
          suiteId: createSuiteId('gng-gate'),
          testCases: [createGngConditionTest()],
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1, coverageRate: null, failures: [],
        });

        // Act
        await useCase.execute({ suiteId: 'gng-gate' });

        // Assert
        expect(ciGateResultWriterPort.write).toHaveBeenCalledTimes(1);
      });
    });
  });
});
