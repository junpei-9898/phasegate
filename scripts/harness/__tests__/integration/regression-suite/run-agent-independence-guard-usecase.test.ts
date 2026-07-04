// @layer test
// @unit regression-suite
// @story H14-02
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunAgentIndependenceGuardUseCase } from '../../../regression-suite/application/usecases/run-agent-independence-guard-usecase.js';
import { SuiteId } from '../../../regression-suite/domain/value-objects/suite-id.js';
import { AgentIndependenceTest } from '../../../regression-suite/domain/value-objects/agent-independence-test.js';
import { RegressionSuiteDefinition } from '../../../regression-suite/domain/value-objects/regression-suite-definition.js';
import type { SuiteRegistryPort } from '../../../regression-suite/domain/ports/suite-registry-port.js';
import type { ImportAnalyzerPort } from '../../../regression-suite/domain/ports/import-analyzer-port.js';
import type { CiGateResultWriterPort } from '../../../regression-suite/domain/ports/ci-gate-result-writer-port.js';

const createSuiteId = (value: 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence' = 'agent-independence') =>
  SuiteId.create(value);

const createAgentIndependenceTest = (overrides: Partial<{ targetModule: string; forbiddenPatterns: string[]; allowedPaths: string[] }> = {}) =>
  AgentIndependenceTest.create({
    targetModule: overrides.targetModule ?? 'scripts/harness/test-unit/domain/service.ts',
    forbiddenPatterns: overrides.forbiddenPatterns ?? ['@anthropic-ai/claude-code'],
    allowedPaths: overrides.allowedPaths ?? [],
  });

const createRegressionSuiteDefinition = (overrides: Partial<{ suiteId: SuiteId; testCases: AgentIndependenceTest[] }> = {}) =>
  RegressionSuiteDefinition.create({
    suiteId: overrides.suiteId ?? createSuiteId('agent-independence'),
    testCases: overrides.testCases ?? [createAgentIndependenceTest()],
    description: 'テスト用スイート定義',
  });

target('RunAgentIndependenceGuardUseCase', () => {
  let suiteRegistryPort: SuiteRegistryPort;
  let importAnalyzerPort: ImportAnalyzerPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let useCase: RunAgentIndependenceGuardUseCase;

  beforeEach(() => {
    suiteRegistryPort = { getDefinition: vi.fn() };
    importAnalyzerPort = { analyzeImports: vi.fn() };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    useCase = new RunAgentIndependenceGuardUseCase(suiteRegistryPort, importAnalyzerPort, ciGateResultWriterPort);
  });

  // IT-UC-AgentGuard-001
  describe('execute: import違反がない場合にpassedCount=件数を返すこと', () => {
    context('SuiteRegistryPortが AgentIndependenceTest[] 3件を返し・全モジュールで禁止import検出なしの場合', () => {
      it('RunRegressionSuiteOutput.failedCount=0・failures=[]', async () => {
        // Arrange
        const testCases = [
          createAgentIndependenceTest({ targetModule: 'scripts/harness/a/domain/service-a.ts' }),
          createAgentIndependenceTest({ targetModule: 'scripts/harness/b/domain/service-b.ts' }),
          createAgentIndependenceTest({ targetModule: 'scripts/harness/c/domain/service-c.ts' }),
        ];
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('agent-independence'), testCases });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue([]);

        // Act
        const actual = await useCase.execute({ suiteId: 'agent-independence' });

        // Assert
        expect(actual.failedCount).toBe(0);
        expect(actual.failures).toHaveLength(0);
      });
    });
  });

  // IT-UC-AgentGuard-002
  describe('execute: import違反が検出された場合にTestFailureDetailに変換されfailuresに含まれること', () => {
    context("ImportAnalyzerPortが domain/y.ts で '@anthropic-ai/claude-code' のimportを検出する場合", () => {
      it("failures[0].errorMessage に'Forbidden import detected'が含まれる・failedCount=1", async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest({
          targetModule: 'scripts/harness/x/domain/y.ts',
          forbiddenPatterns: ['@anthropic-ai/claude-code'],
          allowedPaths: [],
        });
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('agent-independence'), testCases: [agentTest] });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue(['@anthropic-ai/claude-code']);

        // Act
        const actual = await useCase.execute({ suiteId: 'agent-independence' });

        // Assert
        expect(actual.failedCount).toBe(1);
        expect(actual.failures[0].errorMessage).toContain('Forbidden import detected');
      });
    });
  });

  // IT-UC-AgentGuard-003
  describe('execute: allowedPathsに含まれるAdapter層のimportは違反として報告されないこと', () => {
    context("Adapter層パス（allowedPaths含む）で禁止パターン検出がある場合", () => {
      it('failures=[]（Adapter層の例外的許容が機能する）', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest({
          targetModule: 'scripts/harness/regression-suite/infrastructure/adapters/biome-ast.ts',
          forbiddenPatterns: ['@anthropic-ai/claude-code'],
          allowedPaths: ['infrastructure/adapters/'],
        });
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('agent-independence'), testCases: [agentTest] });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue(['@anthropic-ai/claude-code']);

        // Act
        const actual = await useCase.execute({ suiteId: 'agent-independence' });

        // Assert
        expect(actual.failures).toHaveLength(0);
      });
    });
  });

  // IT-UC-AgentGuard-004
  describe("execute: CiGateResultWriterPortにagent-independenceの結果が書き出されること", () => {
    context('違反なしの場合', () => {
      it("CiGateResultWriterPort.write('agent-independence', summary) が1回呼ばれる", async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('agent-independence') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue([]);

        // Act
        await useCase.execute({ suiteId: 'agent-independence' });

        // Assert
        expect(ciGateResultWriterPort.write).toHaveBeenCalledTimes(1);
        expect(vi.mocked(ciGateResultWriterPort.write).mock.calls[0][0]).toBe('agent-independence');
      });
    });
  });

  // IT-UC-AgentGuard-005
  describe('execute: ImportAnalyzerPortが失敗した場合にImportAnalysisPortErrorが伝播すること', () => {
    context('ImportAnalyzerPort.analyzeImports が Error をスローする場合', () => {
      it('ImportAnalysisPortError がスロー', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('agent-independence') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(importAnalyzerPort.analyzeImports).mockRejectedValue(new Error('analysis error'));

        // Act / Assert
        await expect(useCase.execute({ suiteId: 'agent-independence' }))
          .rejects.toThrow('ImportAnalysisPortError');
      });
    });
  });
});
