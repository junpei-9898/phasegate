// @layer test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RegressionRunner } from '../../../../regression-suite/domain/services/regression-runner.js';
import { SuiteId } from '../../../../regression-suite/domain/value-objects/suite-id.js';
import { RegressionSuiteDefinition } from '../../../../regression-suite/domain/value-objects/regression-suite-definition.js';
import { KRequirementTest } from '../../../../regression-suite/domain/value-objects/k-requirement-test.js';
import { CoverageRate } from '../../../../regression-suite/domain/value-objects/coverage-rate.js';
import type { SuiteRegistryPort } from '../../../../regression-suite/domain/ports/suite-registry-port.js';
import type { TestRunnerPort } from '../../../../regression-suite/domain/ports/test-runner-port.js';
import type { ConfigQueryPort } from '../../../../regression-suite/domain/ports/config-query-port.js';
import type { CiGateResultWriterPort } from '../../../../regression-suite/domain/ports/ci-gate-result-writer-port.js';
import { ImportGuardService } from '../../../../regression-suite/domain/services/import-guard-service.js';
import type { ImportAnalyzerPort } from '../../../../regression-suite/domain/ports/import-analyzer-port.js';

const createKRequirementsDef = () =>
  RegressionSuiteDefinition.create({
    suiteId: SuiteId.create('k-requirements'),
    testCases: [KRequirementTest.create({ kNumber: 'K1', targetUnit: 'validator-system', verificationCondition: '正しく動作すること' })],
    description: 'K要件テスト',
  });

target('RegressionRunner', () => {
  let suiteRegistryPort: SuiteRegistryPort;
  let testRunnerPort: TestRunnerPort;
  let importAnalyzerPort: ImportAnalyzerPort;
  let importGuardService: ImportGuardService;
  let configQueryPort: ConfigQueryPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let runner: RegressionRunner;

  beforeEach(() => {
    suiteRegistryPort = { getDefinition: vi.fn() };
    testRunnerPort = { runSuite: vi.fn() };
    importAnalyzerPort = { analyzeImports: vi.fn().mockResolvedValue([]) };
    importGuardService = new ImportGuardService(importAnalyzerPort);
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(90) };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    runner = new RegressionRunner(
      suiteRegistryPort,
      testRunnerPort,
      importGuardService,
      configQueryPort,
      ciGateResultWriterPort
    );
  });

  // UT-RS-150
  describe('execute: k-requirementsスイートを実行してTestExecutionSummaryを返すこと', () => {
    context('SuiteRegistryPort と TestRunnerPort が正常に動作する場合', () => {
      it('TestExecutionSummary が返される', async () => {
        // Arrange
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(createKRequirementsDef());
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1,
          coverageRate: CoverageRate.create(95), failures: [],
        });

        // Act
        const actual = await runner.execute(SuiteId.create('k-requirements'));

        // Assert
        expect(actual.passedCount).toBe(1);
        expect(actual.failedCount).toBe(0);
      });
    });
  });

  // UT-RS-151
  describe('execute: CiGateResultWriterPort.write が呼ばれること', () => {
    context('正常実行の場合', () => {
      it('CiGateResultWriterPort.write が1回呼ばれる', async () => {
        // Arrange
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(createKRequirementsDef());
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1, coverageRate: null, failures: [],
        });

        // Act
        await runner.execute(SuiteId.create('k-requirements'));

        // Assert
        expect(ciGateResultWriterPort.write).toHaveBeenCalledTimes(1);
      });
    });
  });

  // UT-RS-152
  describe('execute: SuiteDefinitionNotFoundError がスローされること', () => {
    context('SuiteRegistryPort がエラーをスローする場合', () => {
      it('エラーが伝播する', async () => {
        // Arrange
        vi.mocked(suiteRegistryPort.getDefinition).mockRejectedValue(new Error('SuiteDefinitionNotFoundError'));

        // Act / Assert
        await expect(runner.execute(SuiteId.create('k-requirements'))).rejects.toThrow();
      });
    });
  });

  // UT-RS-153
  describe('execute: TestRunnerPortError がスローされること', () => {
    context('TestRunnerPort がエラーをスローする場合', () => {
      it('TestRunnerPortError が伝播する', async () => {
        // Arrange
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(createKRequirementsDef());
        vi.mocked(testRunnerPort.runSuite).mockRejectedValue(new Error('network error'));

        // Act / Assert
        await expect(runner.execute(SuiteId.create('k-requirements'))).rejects.toThrow('TestRunnerPortError');
      });
    });
  });

  // UT-RS-154
  describe('execute: agent-independenceスイートでImportGuardServiceが呼ばれること', () => {
    context('agent-independenceスイートが実行される場合', () => {
      it('importGuardService.verify が呼ばれる', async () => {
        // Arrange
        const { AgentIndependenceTest } = await import('../../../../regression-suite/domain/value-objects/agent-independence-test.js');
        const agentDef = RegressionSuiteDefinition.create({
          suiteId: SuiteId.create('agent-independence'),
          testCases: [AgentIndependenceTest.create({ targetModule: 'scripts/x.ts', forbiddenPatterns: ['@anthropic-ai'], allowedPaths: [] })],
          description: 'agent test',
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(agentDef);
        vi.spyOn(importGuardService, 'verify').mockResolvedValue([]);

        // Act
        await runner.execute(SuiteId.create('agent-independence'));

        // Assert
        expect(importGuardService.verify).toHaveBeenCalledTimes(1);
      });
    });
  });

  // UT-RS-155
  describe('execute: ImportAnalysisPortError がスローされること', () => {
    context('ImportGuardService がエラーをスローする場合', () => {
      it('ImportAnalysisPortError が伝播する', async () => {
        // Arrange
        const { AgentIndependenceTest } = await import('../../../../regression-suite/domain/value-objects/agent-independence-test.js');
        const agentDef = RegressionSuiteDefinition.create({
          suiteId: SuiteId.create('agent-independence'),
          testCases: [AgentIndependenceTest.create({ targetModule: 'scripts/x.ts', forbiddenPatterns: ['@anthropic-ai'], allowedPaths: [] })],
          description: 'agent test',
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(agentDef);
        vi.spyOn(importGuardService, 'verify').mockRejectedValue(new Error('ImportAnalysisPortError: analysis error'));

        // Act / Assert
        await expect(runner.execute(SuiteId.create('agent-independence'))).rejects.toThrow('ImportAnalysisPortError');
      });
    });
  });

  // UT-RS-156
  describe('execute: ConfigQueryPort が threshold を返すこと', () => {
    context('configQueryPort が threshold=80 を返す場合', () => {
      it('ConfigQueryPort が呼ばれる', async () => {
        // Arrange
        vi.mocked(configQueryPort.getCoverageThreshold).mockResolvedValue(80);
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(createKRequirementsDef());
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1, coverageRate: null, failures: [],
        });

        // Act
        await runner.execute(SuiteId.create('k-requirements'));

        // Assert
        expect(configQueryPort.getCoverageThreshold).toHaveBeenCalledTimes(1);
      });
    });
  });
});
