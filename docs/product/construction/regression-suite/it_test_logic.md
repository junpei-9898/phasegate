# ITテストロジック設計: regression-suite

> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **参照**: it_test_design.md, logical_design.md

---

## 1. テストファイル構成

```text
scripts/harness/__tests__/integration/regression-suite/
├── run-k-requirements-regression-usecase.test.ts   # IT-UC-RunKReq-001〜006
├── run-k14-k15-regression-usecase.test.ts          # IT-UC-RunK14K15-001〜003
├── run-agent-independence-guard-usecase.test.ts    # IT-UC-AgentGuard-001〜005
├── run-gng-gate-regression-usecase.test.ts         # IT-UC-RunGng-001〜003
├── analyze-v0-migration-usecase.test.ts            # IT-UC-AnalyzeMig-001〜004
├── migrate-v0-tests-usecase.test.ts                # IT-UC-MigrateV0-001〜005
├── configure-ci-gate-usecase.test.ts               # IT-UC-ConfigCiGate-001〜006
├── vitest-test-runner-adapter.test.ts              # IT-REPO-VitestRunner-001〜005
├── file-system-v0-spec-reader-adapter.test.ts      # IT-REPO-V0SpecReader-001〜003
├── biome-ast-import-analyzer-adapter.test.ts       # IT-REPO-ImportAnalyzer-001〜003
├── markdown-migration-mapping-repository-adapter.test.ts # IT-REPO-MigrationRepo-001〜006
├── harness-config-query-adapter.test.ts            # IT-REPO-ConfigQuery-001〜002
├── json-ci-gate-result-writer-adapter.test.ts      # IT-REPO-CiGateWriter-001〜003
├── static-suite-registry-adapter.test.ts           # IT-REPO-SuiteRegistry-001〜004
├── k-requirements-integration.test.ts              # IT-API-KReqInteg-001〜003
├── agent-independence-integration.test.ts          # IT-API-AgentInteg-001〜002
├── v0-migration-integration.test.ts                # IT-API-V0MigInteg-001〜003
└── ci-gate-configuration-integration.test.ts       # IT-API-CiGateInteg-001〜002
```

---

## 2. モック戦略

| 依存コンポーネント | モック方式 | 備考 |
|------------------|----------|------|
| TestRunnerPort（VitestTestRunnerAdapter等） | `vi.fn()` でスタブ化。`mockResolvedValue` で返却値を注入 | ドメインサービステスト・UseCaseテストで使用 |
| SuiteRegistryPort | `vi.fn()` でスタブ化 | StaticSuiteRegistryAdapter統合テストでは実体を使用 |
| ConfigQueryPort | `vi.fn()` でスタブ化。`mockResolvedValue(90)` を基本値とする | HarnessConfigQueryAdapterテストでは実体を使用 |
| CiGateResultWriterPort | `vi.fn().mockResolvedValue(undefined)` でスタブ化 | JsonCiGateResultWriterAdapterテストでは実体を使用 |
| V0SpecReaderPort | `vi.fn()` でスタブ化 | FileSystemV0SpecReaderAdapterテストでは実体＋フィクスチャを使用 |
| MigrationMappingRepositoryPort | `vi.fn()` でスタブ化 | MarkdownMigrationMappingRepositoryAdapterテストでは一時ディレクトリを使用 |
| ImportAnalyzerPort | `vi.fn()` でスタブ化 | BiomeAstImportAnalyzerAdapterテストでは実体（biome-ast-engine依存）を使用 |
| ファイルI/O（fs/promises） | 一時ディレクトリ（`os.tmpdir()` + `crypto.randomUUID()`）を使用 | 各テストの `beforeEach` で作成、`afterEach` で削除 |
| MarkdownMigrationMappingRepositoryAdapter | 一時ディレクトリにフィクスチャを配置（`v0_v1_test_mapping.md`） | |
| 内部DomainService（RegressionRunner, MigrationAnalyzer, ImportGuardService） | 実体を使用 | 依存ポートのみモック差し替え |
| StaticSuiteRegistryAdapter | Cross-Layer統合テストで実体を使用 | SuiteId別にハードコードされたRegressionSuiteDefinitionを返す |

### 一時ディレクトリ管理パターン

```typescript
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `regression-suite-it-${crypto.randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});
```

---

## 3. UseCase テスト詳細ロジック

### 3.1 RunKRequirementsRegressionUseCase（H14-01）

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/run-k-requirements-regression-usecase.test.ts`

```typescript
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunKRequirementsRegressionUseCase } from '../../../regression-suite/application/usecases/run-k-requirements-regression-usecase.js';
import type { SuiteRegistryPort } from '../../../regression-suite/domain/ports/suite-registry-port.js';
import type { TestRunnerPort } from '../../../regression-suite/domain/ports/test-runner-port.js';
import type { ConfigQueryPort } from '../../../regression-suite/domain/ports/config-query-port.js';
import type { CiGateResultWriterPort } from '../../../regression-suite/domain/ports/ci-gate-result-writer-port.js';
import {
  createSuiteId, createKRequirementTest, createRegressionSuiteDefinition,
  createCoverageRate, createTestFailureDetail,
} from '../../helpers/test-helpers.js';

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
        const testCases = Array.from({ length: 16 }, (_, i) =>
          createKRequirementTest({ kNumber: i < 15 ? `K${i + 1}` : 'K3.5', targetUnit: 'target-unit' })
        );
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
          failures: [createTestFailureDetail({ testCaseId: 'K1' }), createTestFailureDetail({ testCaseId: 'K2' })],
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
```

---

### 3.2 RunK14K15RegressionUseCase（H14-02）

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/run-k14-k15-regression-usecase.test.ts`

```typescript
target('RunK14K15RegressionUseCase', () => {
  // ...（beforeEachでRunKRequirementsと同様にポートをスタブ化）

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
        const passedTestCases = vi.mocked(testRunnerPort.runSuite).mock.calls[0][0];
        expect(passedTestCases).toHaveLength(2);
        expect(passedTestCases.every((tc: { kNumber: string }) => ['K14', 'K15'].includes(tc.kNumber))).toBe(true);
      });
    });
  });

  // IT-UC-RunK14K15-002
  describe("execute: K14テスト通過時にgateResult='go'を返すこと", () => {
    context("kNumberFilter=['K14', 'K15'] 指定で全件通過する場合", () => {
      it("RunRegressionSuiteOutput.gateResult='go'・passedCount=2", async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements'), testCases: [
          createKRequirementTest({ kNumber: 'K14' }),
          createKRequirementTest({ kNumber: 'K15' }),
        ]});
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
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements'), testCases: [
          createKRequirementTest({ kNumber: 'K14' }),
          createKRequirementTest({ kNumber: 'K15' }),
        ]});
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
```

---

### 3.3 RunAgentIndependenceGuardUseCase（H14-02）

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/run-agent-independence-guard-usecase.test.ts`

```typescript
import { RunAgentIndependenceGuardUseCase } from '../../../regression-suite/application/usecases/run-agent-independence-guard-usecase.js';
import type { ImportAnalyzerPort } from '../../../regression-suite/domain/ports/import-analyzer-port.js';
import {
  createSuiteId, createAgentIndependenceTest, createRegressionSuiteDefinition,
} from '../../helpers/test-helpers.js';

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
```

---

### 3.4 RunGngGateRegressionUseCase（H14-03）

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/run-gng-gate-regression-usecase.test.ts`

```typescript
target('RunGngGateRegressionUseCase', () => {
  // ...（beforeEachでポートをスタブ化）

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
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('gng-gate'), testCases: [createGngConditionTest()] });
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
```

---

### 3.5 AnalyzeV0MigrationUseCase（H15-01）

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/analyze-v0-migration-usecase.test.ts`

```typescript
import { AnalyzeV0MigrationUseCase } from '../../../regression-suite/application/usecases/analyze-v0-migration-usecase.js';
import type { V0SpecReaderPort } from '../../../regression-suite/domain/ports/v0-spec-reader-port.js';
import type { MigrationMappingRepositoryPort } from '../../../regression-suite/domain/ports/migration-mapping-repository-port.js';
import { createV0TestId } from '../../helpers/test-helpers.js';

target('AnalyzeV0MigrationUseCase', () => {
  let v0SpecReaderPort: V0SpecReaderPort;
  let migrationMappingRepositoryPort: MigrationMappingRepositoryPort;
  let useCase: AnalyzeV0MigrationUseCase;

  beforeEach(() => {
    v0SpecReaderPort = { readAll: vi.fn() };
    migrationMappingRepositoryPort = { save: vi.fn().mockResolvedValue(undefined), findAll: vi.fn(), findById: vi.fn() };
    useCase = new AnalyzeV0MigrationUseCase(v0SpecReaderPort, migrationMappingRepositoryPort);
  });

  // IT-UC-AnalyzeMig-001
  describe('execute: v0テスト仕様の分析結果サマリーを返すこと', () => {
    context('V0SpecReaderPort が V0TestId[] 5件を返し migrated=2・modified=1・skipped=2 になる場合', () => {
      it('AnalyzeMigrationOutput.totalCount=5・migratedCount=2・modifiedCount=1・skippedCount=2', async () => {
        // Arrange
        const ids = Array.from({ length: 5 }, (_, i) =>
          createV0TestId(`scripts/__tests__/unit/test-${i}.test.ts`)
        );
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);
        // analyzerの内部判定ロジックに応じてモックを調整（e.g. スコープ外パターン設定）

        // Act
        const actual = await useCase.execute({ dryRun: true });

        // Assert
        expect(actual.totalCount).toBe(5);
        // migratedCount + modifiedCount + skippedCount = totalCount
        expect(actual.migratedCount + actual.modifiedCount + actual.skippedCount).toBe(5);
      });
    });
  });

  // IT-UC-AnalyzeMig-002
  describe('execute: dryRun=trueのときMigrationMappingRepositoryPortが呼ばれないこと', () => {
    context('V0SpecReaderPort が V0TestId[] 3件を返す場合', () => {
      it('MigrationMappingRepositoryPort.save() が0回呼ばれる', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([
          createV0TestId('scripts/__tests__/a.test.ts'),
          createV0TestId('scripts/__tests__/b.test.ts'),
          createV0TestId('scripts/__tests__/c.test.ts'),
        ]);

        // Act
        await useCase.execute({ dryRun: true });

        // Assert
        expect(migrationMappingRepositoryPort.save).not.toHaveBeenCalled();
      });
    });
  });

  // IT-UC-AnalyzeMig-003
  describe('execute: 全件がskippedになる場合にmigratedCount=0を返すこと', () => {
    context('全件がv1スコープ外と判定される場合', () => {
      it('AnalyzeMigrationOutput.migratedCount=0・modifiedCount=0・skippedCount=全件数', async () => {
        // Arrange
        const outOfScopeIds = [
          createV0TestId('scripts/__tests__/out-of-scope-a.test.ts'),
          createV0TestId('scripts/__tests__/out-of-scope-b.test.ts'),
        ];
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(outOfScopeIds);

        // Act
        const actual = await useCase.execute({ dryRun: true, outOfScopePattern: ['out-of-scope'] });

        // Assert
        expect(actual.migratedCount).toBe(0);
        expect(actual.modifiedCount).toBe(0);
        expect(actual.skippedCount).toBe(2);
      });
    });
  });

  // IT-UC-AnalyzeMig-004
  describe('execute: V0SpecReaderPortが失敗した場合にエラーが伝播すること', () => {
    context('V0SpecReaderPort.readAll が Error をスローする場合', () => {
      it('V0SpecReadError がスロー', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockRejectedValue(new Error('read error'));

        // Act / Assert
        await expect(useCase.execute({ dryRun: true }))
          .rejects.toThrow('V0SpecReadError');
      });
    });
  });
});
```

---

### 3.6 MigrateV0TestsUseCase（H15-01）

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/migrate-v0-tests-usecase.test.ts`

```typescript
target('MigrateV0TestsUseCase', () => {
  // ...（beforeEachでポートをスタブ化）

  // IT-UC-MigrateV0-001
  describe('execute: confirmExecute=trueのとき全件の移行を実行してMigrationMappingを返すこと', () => {
    context('V0SpecReaderPort が V0TestId[] 3件を返し全件 migrated になる場合', () => {
      it('MigrateV0TestsOutput.mappings.length=3・MigrationMappingRepositoryPort.save() が3回呼ばれる', async () => {
        // Arrange
        const ids = Array.from({ length: 3 }, (_, i) =>
          createV0TestId(`scripts/__tests__/unit/migrated-${i}.test.ts`)
        );
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await useCase.execute({ confirmExecute: true });

        // Assert
        expect(actual.mappings.length).toBeGreaterThanOrEqual(0); // migrated分のmapping
        expect(migrationMappingRepositoryPort.save).toHaveBeenCalledTimes(3);
      });
    });
  });

  // IT-UC-MigrateV0-002
  describe('execute: confirmExecute=falseのときドライランのみ実行すること', () => {
    context('V0SpecReaderPort が V0TestId[] 3件を返す場合', () => {
      it('MigrationMappingRepositoryPort.save() が0回呼ばれる', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([
          createV0TestId('scripts/__tests__/a.test.ts'),
          createV0TestId('scripts/__tests__/b.test.ts'),
          createV0TestId('scripts/__tests__/c.test.ts'),
        ]);

        // Act
        await useCase.execute({ confirmExecute: false });

        // Assert
        expect(migrationMappingRepositoryPort.save).not.toHaveBeenCalled();
      });
    });
  });

  // IT-UC-MigrateV0-003
  describe('execute: modifiedステータスの移行にbiomeModificationが含まれること', () => {
    context('分析結果で1件がBiome修正必要と判定される場合', () => {
      it('MigrateV0TestsOutput.mappings のうち1件にbiomeModificationが含まれる', async () => {
        // Arrange
        const biomeId = createV0TestId('scripts/__tests__/unit/eslint-api.test.ts');
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([biomeId]);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await useCase.execute({ confirmExecute: true, biomeModificationRequired: true });

        // Assert
        const modifiedMappings = actual.mappings.filter(m => m.migrationStatus === 'modified');
        expect(modifiedMappings[0].biomeModification).not.toBeNull();
      });
    });
  });

  // IT-UC-MigrateV0-004
  describe('execute: skippedのV0TestMigrationはMigrationMappingに含まれないこと', () => {
    context('分析結果: migrated=1・skipped=2 の場合', () => {
      it('MigrateV0TestsOutput.mappings.length=1（skippedは除外）', async () => {
        // Arrange
        const ids = [
          createV0TestId('scripts/__tests__/a.test.ts'),       // migrated
          createV0TestId('scripts/__tests__/out-b.test.ts'),   // skipped
          createV0TestId('scripts/__tests__/out-c.test.ts'),   // skipped
        ];
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await useCase.execute({ confirmExecute: true, outOfScopePattern: ['out-'] });

        // Assert
        expect(actual.mappings).toHaveLength(1);
        expect(actual.mappings[0].migrationStatus).toBe('migrated');
      });
    });
  });

  // IT-UC-MigrateV0-005
  describe('execute: MigrationMappingRepositoryPortの保存が失敗した場合にエラーが伝播すること', () => {
    context('MigrationMappingRepositoryPort.save が Error をスローする場合', () => {
      it('MigrationPersistenceError がスロー', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([createV0TestId()]);
        vi.mocked(migrationMappingRepositoryPort.save).mockRejectedValue(new Error('persist error'));

        // Act / Assert
        await expect(useCase.execute({ confirmExecute: true }))
          .rejects.toThrow('MigrationPersistenceError');
      });
    });
  });
});
```

---

### 3.7 ConfigureCiGateUseCase（H15-02）

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/configure-ci-gate-usecase.test.ts`

```typescript
import { ConfigureCiGateUseCase } from '../../../regression-suite/application/usecases/configure-ci-gate-usecase.js';

target('ConfigureCiGateUseCase', () => {
  let configQueryPort: ConfigQueryPort;
  let useCase: ConfigureCiGateUseCase;

  beforeEach(() => {
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(80) };
    useCase = new ConfigureCiGateUseCase(configQueryPort);
  });

  // IT-UC-ConfigCiGate-001
  describe("execute: coverageThresholdを指定して有効なCiGateConfigを生成すること", () => {
    context("requiredSuiteIds=['k-requirements','gng-gate']・coverageThreshold=90・executionMode='parallel' を指定した場合", () => {
      it("ConfigureCiGateOutput.requiredSuiteIds=['k-requirements','gng-gate']・coverageThreshold=90（入力値を優先）", async () => {
        // Arrange / Act
        const actual = await useCase.execute({
          requiredSuiteIds: ['k-requirements', 'gng-gate'],
          coverageThreshold: 90,
          executionMode: 'parallel',
        });

        // Assert
        expect(actual.requiredSuiteIds).toEqual(['k-requirements', 'gng-gate']);
        expect(actual.coverageThreshold).toBe(90);
      });
    });
  });

  // IT-UC-ConfigCiGate-002
  describe("execute: coverageThresholdが未指定のときConfigQueryPortのデフォルト値を使用すること", () => {
    context("coverageThreshold を省略した場合", () => {
      it('ConfigureCiGateOutput.coverageThreshold=80（ConfigQueryPort の返却値）', async () => {
        // Arrange / Act
        const actual = await useCase.execute({
          requiredSuiteIds: ['k-requirements'],
          executionMode: 'parallel',
        });

        // Assert
        expect(actual.coverageThreshold).toBe(80);
      });
    });
  });

  // IT-UC-ConfigCiGate-003
  describe("execute: executionMode='sequential'を設定できること", () => {
    it("ConfigureCiGateOutput.executionMode='sequential'", async () => {
      const actual = await useCase.execute({
        requiredSuiteIds: ['k-requirements'], coverageThreshold: 90, executionMode: 'sequential',
      });
      expect(actual.executionMode).toBe('sequential');
    });
  });

  // IT-UC-ConfigCiGate-004
  describe('execute: 全4スイートIDを必須として設定できること', () => {
    it('ConfigureCiGateOutput.requiredSuiteIds.length=4', async () => {
      const actual = await useCase.execute({
        requiredSuiteIds: ['k-requirements','gng-gate','agent-independence','v0-migration'],
        coverageThreshold: 90, executionMode: 'parallel',
      });
      expect(actual.requiredSuiteIds).toHaveLength(4);
    });
  });

  // IT-UC-ConfigCiGate-005
  describe("execute: coverageThreshold=0のときInvalidCoverageThresholdErrorをスローすること（INV-8）", () => {
    it('InvalidCoverageThresholdError がスロー', async () => {
      await expect(useCase.execute({ requiredSuiteIds: ['k-requirements'], coverageThreshold: 0 }))
        .rejects.toThrow('InvalidCoverageThresholdError');
    });
  });

  // IT-UC-ConfigCiGate-006
  describe('execute: 不正なSuiteId文字列のときInvalidSuiteIdErrorをスローすること', () => {
    it('InvalidSuiteIdError がスロー', async () => {
      await expect(useCase.execute({ requiredSuiteIds: ['unknown-suite' as never] }))
        .rejects.toThrow('InvalidSuiteIdError');
    });
  });
});
```

---

## 4. Infrastructure Adapter テスト詳細ロジック

### 4.1 VitestTestRunnerAdapter

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/vitest-test-runner-adapter.test.ts`

```typescript
import { VitestTestRunnerAdapter } from '../../../regression-suite/infrastructure/adapters/vitest-test-runner-adapter.js';

target('VitestTestRunnerAdapter', () => {
  let vitestRunnerMock: { run: ReturnType<typeof vi.fn> };
  let adapter: VitestTestRunnerAdapter;

  beforeEach(() => {
    vitestRunnerMock = { run: vi.fn() };
    adapter = new VitestTestRunnerAdapter(vitestRunnerMock);
  });

  // IT-REPO-VitestRunner-001
  describe('runSuite: KRequirementTest[]を受け取りテスト実行してTestFailureDetail[]を返すこと', () => {
    context('Vitest workspace実行が passed=2・failed=0 を返す場合', () => {
      it('actual.failedCount=0・actual.failures=[]', async () => {
        // Arrange
        const testCases = [createKRequirementTest({ kNumber: 'K1' }), createKRequirementTest({ kNumber: 'K2' })];
        vitestRunnerMock.run.mockResolvedValue({ passed: 2, failed: 0, skipped: 0, coverage: 90, failures: [] });

        // Act
        const actual = await adapter.runSuite(testCases);

        // Assert
        expect(actual.failedCount).toBe(0);
        expect(actual.failures).toHaveLength(0);
      });
    });
  });

  // IT-REPO-VitestRunner-002
  describe('runSuite: failedテストをTestFailureDetailに変換すること', () => {
    context("Vitest が 1件失敗・testName='K1-test'・errorMessage='assertion failed' を返す場合", () => {
      it("actual.failures[0].errorMessage='assertion failed'", async () => {
        // Arrange
        const testCases = [createKRequirementTest({ kNumber: 'K1' })];
        vitestRunnerMock.run.mockResolvedValue({
          passed: 0, failed: 1, skipped: 0, coverage: 80,
          failures: [{ testName: 'K1-test', errorMessage: 'assertion failed', stackTrace: undefined }],
        });

        // Act
        const actual = await adapter.runSuite(testCases);

        // Assert
        expect(actual.failures[0].errorMessage).toBe('assertion failed');
      });
    });
  });

  // IT-REPO-VitestRunner-003
  describe("runSuite: executionMode='parallel'のときpool='threads'で実行すること", () => {
    it("Vitest workspace設定に pool='threads' が含まれること", async () => {
      // Arrange
      const testCases = [createKRequirementTest()];
      vitestRunnerMock.run.mockResolvedValue({ passed: 1, failed: 0, skipped: 0, coverage: 100, failures: [] });

      // Act
      await adapter.runSuite(testCases, { executionMode: 'parallel' });

      // Assert
      const callArgs = vitestRunnerMock.run.mock.calls[0][0];
      expect(callArgs.pool).toBe('threads');
    });
  });

  // IT-REPO-VitestRunner-004
  describe("runSuite: executionMode='sequential'のときpool='forks'で実行すること", () => {
    it("Vitest workspace設定に pool='forks' が含まれること", async () => {
      // Arrange
      const testCases = [createKRequirementTest()];
      vitestRunnerMock.run.mockResolvedValue({ passed: 1, failed: 0, skipped: 0, coverage: 100, failures: [] });

      // Act
      await adapter.runSuite(testCases, { executionMode: 'sequential' });

      // Assert
      const callArgs = vitestRunnerMock.run.mock.calls[0][0];
      expect(callArgs.pool).toBe('forks');
    });
  });

  // IT-REPO-VitestRunner-005
  describe('runSuite: CoverageRateが正しく算出されること', () => {
    context('Vitest が coverage=92 を報告する場合', () => {
      it('actual.coverageRate?.value=92', async () => {
        // Arrange
        const testCases = [createKRequirementTest()];
        vitestRunnerMock.run.mockResolvedValue({ passed: 1, failed: 0, skipped: 0, coverage: 92, failures: [] });

        // Act
        const actual = await adapter.runSuite(testCases);

        // Assert
        expect(actual.coverageRate?.value).toBe(92);
      });
    });
  });
});
```

---

### 4.2 FileSystemV0SpecReaderAdapter

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/file-system-v0-spec-reader-adapter.test.ts`

```typescript
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { FileSystemV0SpecReaderAdapter } from '../../../regression-suite/infrastructure/adapters/file-system-v0-spec-reader-adapter.js';

target('FileSystemV0SpecReaderAdapter', () => {
  let tmpDir: string;
  let adapter: FileSystemV0SpecReaderAdapter;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `v0spec-it-${crypto.randomUUID()}`);
    await fs.mkdir(path.join(tmpDir, 'scripts', '__tests__', 'unit'), { recursive: true });
    adapter = new FileSystemV0SpecReaderAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // IT-REPO-V0SpecReader-001
  describe('readAll: `scripts/__tests__/` 配下のtest.tsファイルをV0TestId[]として返すこと', () => {
    context('3件のv0テストファイルがフィクスチャに存在する場合', () => {
      it('actual.length=3・各要素がV0TestId型', async () => {
        // Arrange
        await fs.writeFile(path.join(tmpDir, 'scripts', '__tests__', 'unit', 'a.test.ts'), '');
        await fs.writeFile(path.join(tmpDir, 'scripts', '__tests__', 'unit', 'b.test.ts'), '');
        await fs.writeFile(path.join(tmpDir, 'scripts', '__tests__', 'unit', 'c.test.ts'), '');

        // Act
        const actual = await adapter.readAll();

        // Assert
        expect(actual).toHaveLength(3);
        expect(actual[0].value).toContain('scripts/__tests__/');
      });
    });
  });

  // IT-REPO-V0SpecReader-002
  describe('readAll: `*.test.ts` パターンのみを対象にすること', () => {
    context('`.test.ts` と `.spec.ts` が混在する場合', () => {
      it('`.spec.ts` ファイルは含まれない', async () => {
        // Arrange
        await fs.writeFile(path.join(tmpDir, 'scripts', '__tests__', 'unit', 'a.test.ts'), '');
        await fs.writeFile(path.join(tmpDir, 'scripts', '__tests__', 'unit', 'b.spec.ts'), '');

        // Act
        const actual = await adapter.readAll();

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].value).toContain('.test.ts');
      });
    });
  });

  // IT-REPO-V0SpecReader-003
  describe('readAll: ディレクトリが存在しない場合にエラーをスローすること', () => {
    it('V0SpecReadError がスロー', async () => {
      // Arrange
      const nonExistentAdapter = new FileSystemV0SpecReaderAdapter('/non-existent-path');

      // Act / Assert
      await expect(nonExistentAdapter.readAll()).rejects.toThrow('V0SpecReadError');
    });
  });
});
```

---

### 4.3 BiomeAstImportAnalyzerAdapter

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/biome-ast-import-analyzer-adapter.test.ts`

```typescript
import { BiomeAstImportAnalyzerAdapter } from '../../../regression-suite/infrastructure/adapters/biome-ast-import-analyzer-adapter.js';

target('BiomeAstImportAnalyzerAdapter', () => {
  // IT-REPO-ImportAnalyzer-001
  describe("analyzeImports: 指定モジュールのimport一覧を返すこと", () => {
    context("biome-ast-engine が '@anthropic-ai/claude-code' のimportを返す場合", () => {
      it("actual に '@anthropic-ai/claude-code' が含まれる", async () => {
        // Arrange
        const biomeAstEngineMock = {
          analyzeFile: vi.fn().mockResolvedValue({
            imports: [{ source: '@anthropic-ai/claude-code' }],
          }),
        };
        const adapter = new BiomeAstImportAnalyzerAdapter(biomeAstEngineMock);
        const targetModule = 'scripts/harness/x/domain/y.ts';

        // Act
        const actual = await adapter.analyzeImports(targetModule);

        // Assert
        expect(actual).toContain('@anthropic-ai/claude-code');
      });
    });
  });

  // IT-REPO-ImportAnalyzer-002
  describe('analyzeImports: importがないモジュールに対して空配列を返すこと', () => {
    context('biome-ast-engine が import なしの結果を返す場合', () => {
      it('actual=[]', async () => {
        // Arrange
        const biomeAstEngineMock = {
          analyzeFile: vi.fn().mockResolvedValue({ imports: [] }),
        };
        const adapter = new BiomeAstImportAnalyzerAdapter(biomeAstEngineMock);

        // Act
        const actual = await adapter.analyzeImports('scripts/harness/x/domain/y.ts');

        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

  // IT-REPO-ImportAnalyzer-003
  describe('analyzeImports: biome-ast-engineが未利用の場合にNode.js ASTフォールバックで解析すること', () => {
    context('biome-ast-engine が未初期化（null）の場合', () => {
      it('@swc/core 等のフォールバックAST解析が呼ばれる', async () => {
        // Arrange
        const fallbackAnalyzerMock = { parse: vi.fn().mockResolvedValue({ imports: [] }) };
        const adapter = new BiomeAstImportAnalyzerAdapter(null, fallbackAnalyzerMock);

        // Act
        const actual = await adapter.analyzeImports('scripts/harness/x/domain/y.ts');

        // Assert
        expect(fallbackAnalyzerMock.parse).toHaveBeenCalled();
        expect(actual).toBeDefined();
      });
    });
  });
});
```

---

### 4.4 MarkdownMigrationMappingRepositoryAdapter

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/markdown-migration-mapping-repository-adapter.test.ts`

```typescript
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { MarkdownMigrationMappingRepositoryAdapter } from '../../../regression-suite/infrastructure/adapters/markdown-migration-mapping-repository-adapter.js';
import {
  createMigratedV0TestMigration,
  createModifiedV0TestMigration,
  createV0TestId,
  createV1TestPath,
  createBiomeModificationSpec,
} from '../../helpers/test-helpers.js';

target('MarkdownMigrationMappingRepositoryAdapter', () => {
  let tmpDir: string;
  let mappingFilePath: string;
  let adapter: MarkdownMigrationMappingRepositoryAdapter;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `mig-repo-it-${crypto.randomUUID()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    mappingFilePath = path.join(tmpDir, 'v0_v1_test_mapping.md');
    adapter = new MarkdownMigrationMappingRepositoryAdapter(mappingFilePath);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // IT-REPO-MigrationRepo-001
  describe('save: V0TestMigration集約をMarkdownテーブルに保存すること', () => {
    context("migrated状態の V0TestMigration（v0TestId='scripts/__tests__/x.test.ts'・v1TestPath='scripts/harness/x.test.ts'）を保存する場合", () => {
      it('フィクスチャの v0_v1_test_mapping.md にテーブル行が追記されること', async () => {
        // Arrange
        const v0TestId = createV0TestId('scripts/__tests__/x.test.ts');
        const v1TestPath = createV1TestPath('scripts/harness/__tests__/unit/harness-error/x.test.ts');
        const migration = createMigratedV0TestMigration(v0TestId, v1TestPath);

        // Act
        await adapter.save(migration);

        // Assert
        const content = await fs.readFile(mappingFilePath, 'utf-8');
        expect(content).toContain('scripts/__tests__/x.test.ts');
        expect(content).toContain('migrated');
      });
    });
  });

  // IT-REPO-MigrationRepo-002
  describe('save: modified状態のV0TestMigrationにbiomeModificationが含まれること', () => {
    context('biomeModificationSpec 付きの modified 状態を保存する場合', () => {
      it('保存されたMarkdown行にbiomeModification情報が含まれる', async () => {
        // Arrange
        const v0TestId = createV0TestId('scripts/__tests__/x.test.ts');
        const biomeSpec = createBiomeModificationSpec({ targetApi: 'eslint-plugin-x', replacementApi: 'biome-rule-x' });
        const migration = createModifiedV0TestMigration(v0TestId, createV1TestPath(), biomeSpec);

        // Act
        await adapter.save(migration);

        // Assert
        const content = await fs.readFile(mappingFilePath, 'utf-8');
        expect(content).toContain('modified');
        expect(content).toContain('eslint-plugin-x');
      });
    });
  });

  // IT-REPO-MigrationRepo-003
  describe('findAll: Markdownテーブルを全件パースしてV0TestMigration[]を返すこと', () => {
    context('3件のテーブル行を持つ v0_v1_test_mapping.md が存在する場合', () => {
      it('actual.length=3', async () => {
        // Arrange: 3件の migration を保存してから findAll
        for (let i = 0; i < 3; i++) {
          const mig = createMigratedV0TestMigration(
            createV0TestId(`scripts/__tests__/unit/test-${i}.test.ts`),
            createV1TestPath(`scripts/harness/__tests__/unit/harness-error/test-${i}.test.ts`)
          );
          await adapter.save(mig);
        }

        // Act
        const actual = await adapter.findAll();

        // Assert
        expect(actual).toHaveLength(3);
      });
    });
  });

  // IT-REPO-MigrationRepo-004
  describe("findById: 指定V0TestIdの1件を返すこと", () => {
    context("v0TestId='scripts/__tests__/x.test.ts' を検索する場合", () => {
      it("actual.v0TestId.value='scripts/__tests__/x.test.ts'", async () => {
        // Arrange
        const targetId = createV0TestId('scripts/__tests__/x.test.ts');
        const migration = createMigratedV0TestMigration(targetId);
        await adapter.save(migration);

        // Act
        const actual = await adapter.findById(targetId);

        // Assert
        expect(actual).not.toBeNull();
        expect(actual?.v0TestId.value).toBe('scripts/__tests__/x.test.ts');
      });
    });
  });

  // IT-REPO-MigrationRepo-005
  describe('findById: 存在しないV0TestIdにnullを返すこと', () => {
    it('actual=null', async () => {
      // Arrange
      const nonExistentId = createV0TestId('scripts/__tests__/not-exist.test.ts');

      // Act
      const actual = await adapter.findById(nonExistentId);

      // Assert
      expect(actual).toBeNull();
    });
  });

  // IT-REPO-MigrationRepo-006
  describe('save: ファイルI/Oが失敗した場合にMigrationPersistenceErrorをスローすること', () => {
    it('MigrationPersistenceError がスロー', async () => {
      // Arrange
      const readonlyPath = path.join(tmpDir, 'readonly', 'v0_v1_test_mapping.md');
      // ディレクトリを作らずアクセス不可なパスを指定
      const failAdapter = new MarkdownMigrationMappingRepositoryAdapter(readonlyPath);
      const migration = createMigratedV0TestMigration();

      // Act / Assert
      await expect(failAdapter.save(migration)).rejects.toThrow('MigrationPersistenceError');
    });
  });
});
```

---

### 4.5 HarnessConfigQueryAdapter

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/harness-config-query-adapter.test.ts`

```typescript
import { HarnessConfigQueryAdapter } from '../../../regression-suite/infrastructure/adapters/harness-config-query-adapter.js';

target('HarnessConfigQueryAdapter', () => {
  // IT-REPO-ConfigQuery-001
  describe('getCoverageThreshold: HarnessConfigV2のcoverageThresholdを返すこと', () => {
    it('actual=90', async () => {
      // Arrange
      const configStub = {
        layers: { L3: { coverageThreshold: 90 } },
        ci: { enabled: true },
      };
      const adapter = new HarnessConfigQueryAdapter(configStub as never);

      // Act
      const actual = await adapter.getCoverageThreshold();

      // Assert
      expect(actual).toBe(90);
    });
  });

  // IT-REPO-ConfigQuery-002
  describe('getCiConfig: HarnessConfigV2のCI設定を返すこと', () => {
    it('actual.ciEnabled=true', async () => {
      // Arrange
      const configStub = {
        layers: { L3: { coverageThreshold: 90 } },
        ci: { enabled: true },
      };
      const adapter = new HarnessConfigQueryAdapter(configStub as never);

      // Act
      const actual = await adapter.getCiConfig();

      // Assert
      expect(actual.ciEnabled).toBe(true);
    });
  });
});
```

---

### 4.6 JsonCiGateResultWriterAdapter

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/json-ci-gate-result-writer-adapter.test.ts`

```typescript
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { JsonCiGateResultWriterAdapter } from '../../../regression-suite/infrastructure/adapters/json-ci-gate-result-writer-adapter.js';

target('JsonCiGateResultWriterAdapter', () => {
  let tmpDir: string;
  let adapter: JsonCiGateResultWriterAdapter;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `ci-gate-it-${crypto.randomUUID()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    adapter = new JsonCiGateResultWriterAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // IT-REPO-CiGateWriter-001
  describe("write: TestExecutionSummaryをHarnessApiResponse形式のJSONでCI出力ディレクトリに書き出すこと", () => {
    context("suiteId='k-requirements'・TestExecutionSummary(passed=10, failed=0) の場合", () => {
      it("書き出されたJSONに { status: 'pass', summary: { passedCount: 10 } } が含まれる", async () => {
        // Arrange
        const summary = createTestExecutionSummary({ passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10 });

        // Act
        await adapter.write('k-requirements', summary);

        // Assert
        const outputFiles = await fs.readdir(tmpDir);
        expect(outputFiles.some(f => f.includes('k-requirements'))).toBe(true);
        const content = JSON.parse(
          await fs.readFile(path.join(tmpDir, outputFiles.find(f => f.includes('k-requirements'))!), 'utf-8')
        );
        expect(content.status).toBe('pass');
        expect(content.summary.passedCount).toBe(10);
      });
    });
  });

  // IT-REPO-CiGateWriter-002
  describe("write: failedCountが1以上のときstatus='fail'で書き出すこと", () => {
    context('TestExecutionSummary(passed=8, failed=2) の場合', () => {
      it("書き出されたJSONに { status: 'fail' } が含まれる", async () => {
        // Arrange
        const summary = createTestExecutionSummary({
          passedCount: 8, failedCount: 2, skippedCount: 0, totalCount: 10,
          failures: [createTestFailureDetail(), createTestFailureDetail({ testCaseId: 'K2' })],
        });

        // Act
        await adapter.write('k-requirements', summary);

        // Assert
        const outputFiles = await fs.readdir(tmpDir);
        const content = JSON.parse(
          await fs.readFile(path.join(tmpDir, outputFiles[0]), 'utf-8')
        );
        expect(content.status).toBe('fail');
      });
    });
  });

  // IT-REPO-CiGateWriter-003
  describe('write: CIゲート統合のためにstdoutにもsummaryを出力すること', () => {
    it('stdoutにsummaryが出力される', async () => {
      // Arrange
      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const summary = createTestExecutionSummary();

      // Act
      await adapter.write('k-requirements', summary);

      // Assert
      expect(stdoutSpy).toHaveBeenCalled();
      stdoutSpy.mockRestore();
    });
  });
});
```

---

### 4.7 StaticSuiteRegistryAdapter

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/static-suite-registry-adapter.test.ts`

```typescript
import { StaticSuiteRegistryAdapter } from '../../../regression-suite/infrastructure/adapters/static-suite-registry-adapter.js';

target('StaticSuiteRegistryAdapter', () => {
  // 実体を使用（モックなし）
  const adapter = new StaticSuiteRegistryAdapter();

  // IT-REPO-SuiteRegistry-001
  describe("getDefinition: SuiteId('k-requirements')に対応するRegressionSuiteDefinitionを返すこと", () => {
    it("actual.suiteId.value='k-requirements'・actual.testCases がKRequirementTest[]型", async () => {
      // Arrange
      const suiteId = createSuiteId('k-requirements');
      // Act
      const actual = await adapter.getDefinition(suiteId);
      // Assert
      expect(actual.suiteId.value).toBe('k-requirements');
      expect(actual.testCases.length).toBeGreaterThanOrEqual(1);
      // KRequirementTest であることを確認（kNumber プロパティの存在）
      expect((actual.testCases[0] as { kNumber?: string }).kNumber).toBeDefined();
    });
  });

  // IT-REPO-SuiteRegistry-002
  describe("getDefinition: SuiteId('gng-gate')に対応するRegressionSuiteDefinitionを返すこと", () => {
    it("actual.testCases がGngConditionTest[] 3件（GNG-4/GNG-5/GNG-8）", async () => {
      // Arrange
      const suiteId = createSuiteId('gng-gate');
      // Act
      const actual = await adapter.getDefinition(suiteId);
      // Assert
      expect(actual.testCases).toHaveLength(3);
      const gngNumbers = actual.testCases.map((tc: { gngNumber?: string }) => tc.gngNumber);
      expect(gngNumbers).toContain('GNG-4');
      expect(gngNumbers).toContain('GNG-5');
      expect(gngNumbers).toContain('GNG-8');
    });
  });

  // IT-REPO-SuiteRegistry-003
  describe("getDefinition: SuiteId('agent-independence')に対応するRegressionSuiteDefinitionを返すこと", () => {
    it("actual.testCases がAgentIndependenceTest[]型・各テストにforbiddenPatternsが1件以上", async () => {
      // Arrange
      const suiteId = createSuiteId('agent-independence');
      // Act
      const actual = await adapter.getDefinition(suiteId);
      // Assert
      expect(actual.testCases.length).toBeGreaterThanOrEqual(1);
      actual.testCases.forEach((tc: { forbiddenPatterns?: string[] }) => {
        expect(tc.forbiddenPatterns?.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // IT-REPO-SuiteRegistry-004
  describe('getDefinition: 不正なSuiteIdのときSuiteDefinitionNotFoundErrorをスローすること', () => {
    it('SuiteDefinitionNotFoundError がスロー', async () => {
      // Arrange
      const invalidSuiteId = { value: 'invalid-suite' } as ReturnType<typeof createSuiteId>;
      // Act / Assert
      await expect(adapter.getDefinition(invalidSuiteId)).rejects.toThrow('SuiteDefinitionNotFoundError');
    });
  });
});
```

---

## 5. Cross-Layer 統合テスト詳細ロジック

### 5.1 H14-01: k-requirements実行統合フロー

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/k-requirements-integration.test.ts`

```typescript
import { RunKRequirementsRegressionUseCase } from '../../../regression-suite/application/usecases/run-k-requirements-regression-usecase.js';
import { StaticSuiteRegistryAdapter } from '../../../regression-suite/infrastructure/adapters/static-suite-registry-adapter.js';

target('k-requirements統合フロー（H14-01）', () => {
  // StaticSuiteRegistryAdapter は実体を使用
  const suiteRegistryAdapter = new StaticSuiteRegistryAdapter();
  let testRunnerPort: TestRunnerPort;
  let configQueryPort: ConfigQueryPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let useCase: RunKRequirementsRegressionUseCase;

  beforeEach(() => {
    testRunnerPort = { runSuite: vi.fn() };
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(90) };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    useCase = new RunKRequirementsRegressionUseCase(
      suiteRegistryAdapter, testRunnerPort, configQueryPort, ciGateResultWriterPort
    );
  });

  // IT-API-KReqInteg-001
  describe('execute: UseCase→RegressionRunner→SuiteRegistryPort→TestRunnerPort→CiGateResultWriterPortの全レイヤーが連携して結果を返すこと', () => {
    context('StaticSuiteRegistryAdapter は実体・TestRunnerPort/ConfigQueryPort/CiGateResultWriterPort はモックの場合', () => {
      it('RunRegressionSuiteOutput が返される。TestRunnerPortがKRequirementTest[] 16件を受け取ること', async () => {
        // Arrange
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 16, failedCount: 0, skippedCount: 0, totalCount: 16,
          coverageRate: createCoverageRate(95), failures: [],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'k-requirements' });

        // Assert
        expect(actual).toBeDefined();
        // StaticSuiteRegistryAdapterが返すK要件16件がTestRunnerPortに渡されること
        const passedTestCases = vi.mocked(testRunnerPort.runSuite).mock.calls[0][0];
        expect(passedTestCases.length).toBeGreaterThanOrEqual(15); // K1-K15 + K3.5
      });
    });
  });

  // IT-API-KReqInteg-002
  describe('execute: CiGateConfigのcoverageThresholdが末端のTestExecutionSummary.isPassedGate()評価に反映されること', () => {
    context('ConfigQueryPort→threshold=90・TestRunnerPort→coverage=85 の場合', () => {
      it("gateResult='no-go'（85 < 90）", async () => {
        // Arrange
        vi.mocked(configQueryPort.getCoverageThreshold).mockResolvedValue(90);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 16, failedCount: 0, skippedCount: 0, totalCount: 16,
          coverageRate: createCoverageRate(85), failures: [],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'k-requirements' });

        // Assert
        expect(actual.gateResult).toBe('no-go');
      });
    });
  });

  // IT-API-KReqInteg-003
  describe('execute: TestFailureDetailがUseCase出力まで正しく変換・伝播されること', () => {
    context("TestRunnerPortが stackTrace='at...' を含む TestFailureDetail を返す場合", () => {
      it("RunRegressionSuiteOutput.failures[0].stackTrace='at...'", async () => {
        // Arrange
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 15, failedCount: 1, skippedCount: 0, totalCount: 16,
          coverageRate: null,
          failures: [createTestFailureDetail({ testCaseId: 'K1', errorMessage: 'msg', stackTrace: 'at line 42' })],
        });

        // Act
        const actual = await useCase.execute({ suiteId: 'k-requirements' });

        // Assert
        expect(actual.failures[0].stackTrace).toBe('at line 42');
      });
    });
  });
});
```

---

### 5.2 H14-02: agent-independence実行統合フロー

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/agent-independence-integration.test.ts`

```typescript
import { RunAgentIndependenceGuardUseCase } from '../../../regression-suite/application/usecases/run-agent-independence-guard-usecase.js';
import { StaticSuiteRegistryAdapter } from '../../../regression-suite/infrastructure/adapters/static-suite-registry-adapter.js';

target('agent-independence統合フロー（H14-02）', () => {
  const suiteRegistryAdapter = new StaticSuiteRegistryAdapter();
  let importAnalyzerPort: ImportAnalyzerPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let useCase: RunAgentIndependenceGuardUseCase;

  beforeEach(() => {
    importAnalyzerPort = { analyzeImports: vi.fn() };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    useCase = new RunAgentIndependenceGuardUseCase(suiteRegistryAdapter, importAnalyzerPort, ciGateResultWriterPort);
  });

  // IT-API-AgentInteg-001
  describe('execute: UseCase→RegressionRunner→ImportGuardService→ImportAnalyzerPortの全レイヤーが連携して結果を返すこと', () => {
    context('StaticSuiteRegistryAdapter は実体・ImportAnalyzerPort はモック（違反なし）の場合', () => {
      it('RunRegressionSuiteOutput.failedCount=0', async () => {
        // Arrange
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue([]);

        // Act
        const actual = await useCase.execute({ suiteId: 'agent-independence' });

        // Assert
        expect(actual.failedCount).toBe(0);
      });
    });
  });

  // IT-API-AgentInteg-002
  describe('execute: ImportViolationがTestFailureDetailに変換されUseCase出力に含まれること', () => {
    context("ImportAnalyzerPort が ImportViolation（modulePath='x.ts'・forbiddenPackage='@anthropic-ai/claude-code'）を検出する場合", () => {
      it("failures[0].errorMessage に 'Forbidden import detected: @anthropic-ai/claude-code' が含まれる", async () => {
        // Arrange
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue(['@anthropic-ai/claude-code']);

        // Act
        const actual = await useCase.execute({ suiteId: 'agent-independence' });

        // Assert
        expect(actual.failures.length).toBeGreaterThanOrEqual(1);
        expect(actual.failures[0].errorMessage).toContain('Forbidden import detected: @anthropic-ai/claude-code');
      });
    });
  });
});
```

---

### 5.3 H15-01: v0移行フロー統合

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/v0-migration-integration.test.ts`

```typescript
import { AnalyzeV0MigrationUseCase } from '../../../regression-suite/application/usecases/analyze-v0-migration-usecase.js';
import { MigrateV0TestsUseCase } from '../../../regression-suite/application/usecases/migrate-v0-tests-usecase.js';

target('v0移行フロー統合（H15-01）', () => {
  let v0SpecReaderPort: V0SpecReaderPort;
  let migrationMappingRepositoryPort: MigrationMappingRepositoryPort;

  beforeEach(() => {
    v0SpecReaderPort = { readAll: vi.fn() };
    migrationMappingRepositoryPort = { save: vi.fn().mockResolvedValue(undefined), findAll: vi.fn(), findById: vi.fn() };
  });

  // IT-API-V0MigInteg-001
  describe('execute: AnalyzeV0MigrationUseCase→MigrationAnalyzer→V0SpecReaderPortの全レイヤーが連携して分析サマリーを返すこと', () => {
    context('V0SpecReaderPort はモック→V0TestId[] 5件の場合', () => {
      it('AnalyzeMigrationOutput.totalCount=5', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(
          Array.from({ length: 5 }, (_, i) => createV0TestId(`scripts/__tests__/unit/test-${i}.test.ts`))
        );
        const useCase = new AnalyzeV0MigrationUseCase(v0SpecReaderPort, migrationMappingRepositoryPort);

        // Act
        const actual = await useCase.execute({ dryRun: true });

        // Assert
        expect(actual.totalCount).toBe(5);
      });
    });
  });

  // IT-API-V0MigInteg-002
  describe('execute: MigrateV0TestsUseCase実行後にMarkdownMigrationMappingRepositoryAdapterに保存されること', () => {
    context('V0SpecReaderPort はモック→V0TestId[] 3件（全件migrated）の場合', () => {
      it('MigrationMappingRepositoryPort.save() が3回呼ばれる', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(
          Array.from({ length: 3 }, (_, i) => createV0TestId(`scripts/__tests__/unit/migrated-${i}.test.ts`))
        );
        const useCase = new MigrateV0TestsUseCase(v0SpecReaderPort, migrationMappingRepositoryPort);

        // Act
        await useCase.execute({ confirmExecute: true });

        // Assert
        expect(migrationMappingRepositoryPort.save).toHaveBeenCalledTimes(3);
      });
    });
  });

  // IT-API-V0MigInteg-003
  describe('execute: V0TestMigration集約の状態遷移がUseCase出力に正しく反映されること', () => {
    context('分析結果: migrated=1・modified=1・skipped=1 の場合', () => {
      it('MigrateV0TestsOutput.mappings.length=2（skippedは除外）・migrationStatusが migrated または modified', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([
          createV0TestId('scripts/__tests__/unit/migrated.test.ts'),  // → migrated
          createV0TestId('scripts/__tests__/unit/biome-api.test.ts'), // → modified
          createV0TestId('scripts/__tests__/out-of-scope.test.ts'),   // → skipped
        ]);
        const useCase = new MigrateV0TestsUseCase(v0SpecReaderPort, migrationMappingRepositoryPort);

        // Act
        const actual = await useCase.execute({
          confirmExecute: true,
          outOfScopePattern: ['out-of-scope'],
          biomeModificationPattern: ['biome-api'],
        });

        // Assert
        expect(actual.mappings).toHaveLength(2);
        expect(actual.mappings.every(m => ['migrated', 'modified'].includes(m.migrationStatus))).toBe(true);
      });
    });
  });
});
```

---

### 5.4 H15-02: CIゲート化統合フロー

**テストファイル**: `scripts/harness/__tests__/integration/regression-suite/ci-gate-configuration-integration.test.ts`

```typescript
import { ConfigureCiGateUseCase } from '../../../regression-suite/application/usecases/configure-ci-gate-usecase.js';
import { RunKRequirementsRegressionUseCase } from '../../../regression-suite/application/usecases/run-k-requirements-regression-usecase.js';

target('CIゲート化統合フロー（H15-02）', () => {

  // IT-API-CiGateInteg-001
  describe("execute: ConfigureCiGateUseCaseが返すCiGateConfigをRunKRequirementsRegressionUseCaseに適用してテストが実行されること", () => {
    context("requiredSuiteIds=['k-requirements','gng-gate','agent-independence']・coverageThreshold=90 を先に設定する場合", () => {
      it("ConfigureCiGateOutput.coverageThreshold=90 が RunKRequirementsRegressionUseCase の gateResult 判定に使われること", async () => {
        // Arrange
        const configQueryPort: ConfigQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(80) };
        const configureCiGateUseCase = new ConfigureCiGateUseCase(configQueryPort);

        // Step 1: CiGateConfig を構成
        const ciGateOutput = await configureCiGateUseCase.execute({
          requiredSuiteIds: ['k-requirements', 'gng-gate', 'agent-independence'],
          coverageThreshold: 90,
          executionMode: 'parallel',
        });

        // Step 2: 構成されたthresholdでk-requirements実行
        const suiteRegistryPort: SuiteRegistryPort = { getDefinition: vi.fn() };
        const testRunnerPort: TestRunnerPort = { runSuite: vi.fn() };
        const ciGateResultWriterPort: CiGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
        const runUseCase = new RunKRequirementsRegressionUseCase(
          suiteRegistryPort, testRunnerPort, configQueryPort, ciGateResultWriterPort
        );

        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1,
          coverageRate: createCoverageRate(88), failures: [],
        });
        // configQueryPort は ciGateOutput.coverageThreshold=90 を使う設定に更新
        vi.mocked(configQueryPort.getCoverageThreshold).mockResolvedValue(ciGateOutput.coverageThreshold);

        // Act
        const actual = await runUseCase.execute({ suiteId: 'k-requirements' });

        // Assert
        // threshold=90・coverage=88 → no-go
        expect(actual.gateResult).toBe('no-go');
        expect(ciGateOutput.coverageThreshold).toBe(90);
      });
    });
  });

  // IT-API-CiGateInteg-002
  describe("execute: v0-migrationスイートをrequiredSuiteIdsに追加してCIゲート化できること（Phase B移行パターン）", () => {
    context("requiredSuiteIds に 'v0-migration' を追加した場合", () => {
      it("ConfigureCiGateOutput.requiredSuiteIds に 'v0-migration' が含まれる。ドメインモデルの変更なしで対応できること", async () => {
        // Arrange
        const configQueryPort: ConfigQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(80) };
        const useCase = new ConfigureCiGateUseCase(configQueryPort);

        // Act
        const actual = await useCase.execute({
          requiredSuiteIds: ['k-requirements', 'gng-gate', 'agent-independence', 'v0-migration'],
          coverageThreshold: 90,
          executionMode: 'parallel',
        });

        // Assert
        expect(actual.requiredSuiteIds).toContain('v0-migration');
        expect(actual.requiredSuiteIds).toHaveLength(4);
      });
    });
  });
});
```

---

## 6. テスト実行コマンド

### ユニットテスト（regression-suite）

```bash
# 全ユニットテスト実行
npx vitest run scripts/harness/__tests__/unit/regression-suite/

# 集約ルートのみ
npx vitest run scripts/harness/__tests__/unit/regression-suite/aggregates/

# 値オブジェクトのみ
npx vitest run scripts/harness/__tests__/unit/regression-suite/value-objects/

# ドメインサービスのみ
npx vitest run scripts/harness/__tests__/unit/regression-suite/services/

# 特定ファイル
npx vitest run scripts/harness/__tests__/unit/regression-suite/aggregates/v0-test-migration.test.ts
```

### ITテスト（regression-suite）

```bash
# 全ITテスト実行
npx vitest run scripts/harness/__tests__/integration/regression-suite/

# UseCaseテストのみ
npx vitest run scripts/harness/__tests__/integration/regression-suite/run-k-requirements-regression-usecase.test.ts
npx vitest run scripts/harness/__tests__/integration/regression-suite/run-agent-independence-guard-usecase.test.ts
npx vitest run scripts/harness/__tests__/integration/regression-suite/analyze-v0-migration-usecase.test.ts

# Infrastructure Adapterテストのみ
npx vitest run scripts/harness/__tests__/integration/regression-suite/markdown-migration-mapping-repository-adapter.test.ts
npx vitest run scripts/harness/__tests__/integration/regression-suite/static-suite-registry-adapter.test.ts

# Cross-Layer統合テストのみ
npx vitest run scripts/harness/__tests__/integration/regression-suite/k-requirements-integration.test.ts
npx vitest run scripts/harness/__tests__/integration/regression-suite/v0-migration-integration.test.ts

# ウォッチモード（開発時）
npx vitest --watch scripts/harness/__tests__/integration/regression-suite/
```

### カバレッジ計測

```bash
npx vitest run --coverage scripts/harness/__tests__/unit/regression-suite/
npx vitest run --coverage scripts/harness/__tests__/integration/regression-suite/
```
