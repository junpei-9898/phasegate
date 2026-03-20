# ITテストロジック設計: harness-api

> **Unit ID**: harness-api
> **作成日**: 2026-03-19
> **対応設計**: `docs/product/construction/harness-api/it_test_design.md`
> **参照計画**: `docs/inception/harness-api/it_test_logic_plan.md`

---


## 1. テストファイル構成

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/harness-api/initialize-command-registry-usecase.test.ts` | InitializeCommandRegistryUseCase | 5 |
| `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts` | DispatchCommandUseCase | 11 |
| `scripts/harness/__tests__/integration/harness-api/decide-exit-code-usecase.test.ts` | DecideExitCodeUseCase | 6 |
| `scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts` | DeriveHarnessStatusUseCase | 6 |
| `scripts/harness/__tests__/integration/harness-api/validator-system-execution-adapter.test.ts` | ValidatorSystemExecutionAdapter | 6 |
| `scripts/harness/__tests__/integration/harness-api/phase-dependency-model-query-adapter.test.ts` | PhaseDependencyModelQueryAdapter | 5 |
| `scripts/harness/__tests__/integration/harness-api/biome-ast-engine-lint-adapter.test.ts` | BiomeAstEngineLintAdapter | 4 |
| `scripts/harness/__tests__/integration/harness-api/nyquist-validation-impact-analysis-adapter.test.ts` | NyquistValidationImpactAnalysisAdapter | 5 |
| `scripts/harness/__tests__/integration/harness-api/file-system-artifact-scanner-adapter.test.ts` | FileSystemArtifactScannerAdapter | 5 |
| `scripts/harness/__tests__/integration/harness-api/harness-config-query-adapter.test.ts` | HarnessConfigQueryAdapter | 4 |
| `scripts/harness/__tests__/integration/harness-api/check-ready-handler.test.ts` | CheckReadyHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/check-phase-handler.test.ts` | CheckPhaseHandler | 5 |
| `scripts/harness/__tests__/integration/harness-api/ci-check-handler.test.ts` | CiCheckHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/detect-drift-handler.test.ts` | DetectDriftHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/status-handler.test.ts` | StatusHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/lint-handler.test.ts` | LintHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/complete-check-handler.test.ts` | CompleteCheckHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/impact-analysis-handler.test.ts` | ImpactAnalysisHandler | 5 |
| `scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts` | CommandDispatch統合フロー | 5 |
| `scripts/harness/__tests__/integration/harness-api/status-derivation-integration.test.ts` | StatusDerivation統合フロー | 4 |
| `scripts/harness/__tests__/integration/harness-api/shared-kernel-contract.test.ts` | SharedKernel Contract検証 | 3 |

**合計**: 103件

---

## 2. テストヘルパー・シードデータ

### 2.1 共通ファクトリ・ヘルパー（createMockPorts等）

全テストファイルの先頭インポートは以下で統一する。

```typescript
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
```

#### createMockPorts()

全6ポートをvi.fn()でまとめて生成する共通ファクトリ。
DispatchCommandUseCaseを構築するすべてのテストで再利用する。

```typescript
function createMockPorts() {
  return {
    validatorExecutionPort: {
      runL3Validators: vi.fn(),
      runAllValidators: vi.fn(),
      runDriftDetection: vi.fn(),
    },
    phaseGateQueryPort: {
      queryAllStories: vi.fn(),
      queryUnit: vi.fn(),
    },
    biomeLintPort: {
      runLint: vi.fn(),
    },
    impactAnalysisPort: {
      analyze: vi.fn(),
    },
    artifactScannerPort: {
      scan: vi.fn(),
    },
    configQueryPort: {
      getPresetInfo: vi.fn(),
      getConfigSummary: vi.fn(),
    },
  };
}
```

#### createDispatchCommandUseCase(ports)

ポートを注入した DispatchCommandUseCase を生成するファクトリ。
CommandRegistry実体・CommandDispatchService実体・StatusDerivationService実体を使用する。

```typescript
function createDispatchCommandUseCase(
  ports: ReturnType<typeof createMockPorts>,
) {
  const registry = new CommandRegistry();
  const commandDispatchService = new CommandDispatchService(registry);
  const statusDerivationService = new StatusDerivationService();
  return new DispatchCommandUseCase({
    commandDispatchService,
    statusDerivationService,
    validatorExecutionPort: ports.validatorExecutionPort,
    phaseGateQueryPort: ports.phaseGateQueryPort,
    biomeLintPort: ports.biomeLintPort,
    impactAnalysisPort: ports.impactAnalysisPort,
    artifactScannerPort: ports.artifactScannerPort,
    configQueryPort: ports.configQueryPort,
  });
}
```

#### buildDefaultCliCommandDefinitions()

InitializeCommandRegistryUseCaseテストで使用する8コマンドのデフォルト入力配列を返す。

```typescript
function buildDefaultCliCommandDefinitions(): CliCommandDefinitionInput[] {
  return [
    { commandName: 'harness:check-ready',    handler: vi.fn(), description: 'check ready' },
    { commandName: 'harness:check-phase',    handler: vi.fn(), description: 'check phase' },
    { commandName: 'harness:ci-check',       handler: vi.fn(), description: 'ci check' },
    { commandName: 'harness:detect-drift',   handler: vi.fn(), description: 'detect drift' },
    { commandName: 'harness:status',         handler: vi.fn(), description: 'status' },
    { commandName: 'harness:lint',           handler: vi.fn(), description: 'lint' },
    { commandName: 'harness:complete-check', handler: vi.fn(), description: 'complete check' },
    { commandName: 'harness:impact-analysis',handler: vi.fn(), description: 'impact analysis' },
  ];
}
```

#### buildHarnessApiResponse(overrides?)

HarnessApiResponseのデフォルト pass インスタンスを構築するユーティリティ。

```typescript
function buildHarnessApiResponse(overrides?: Partial<HarnessApiResponseShape>) {
  return {
    status: 'pass',
    errors: [],
    summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
    data: null,
    ...overrides,
  };
}
```

---

### 2.2 Portモックパターン

各ポートのモックメソッド戻り値設定パターンを示す。
実際のテストではbeforeEachで初期化し、ケースごとにmockResolvedValue/mockRejectedValueを上書きする。

```typescript
// PhaseGateQueryPort — 全通過パターン
ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
  { storyId: 'H09-01', passed: true, missingPhases: [] },
  { storyId: 'H09-02', passed: true, missingPhases: [] },
  { storyId: 'H09-03', passed: true, missingPhases: [] },
]);

// ValidatorExecutionPort — 全通過パターン
ports.validatorExecutionPort.runL3Validators.mockResolvedValue([
  { validatorId: 'L3-001', passed: true, errors: [] },
  { validatorId: 'L3-002', passed: true, errors: [] },
  { validatorId: 'L3-003', passed: true, errors: [] },
  { validatorId: 'L3-004', passed: true, errors: [] },
]);

// BiomeLintPort — 通過パターン
ports.biomeLintPort.runLint.mockResolvedValue({
  passed: true,
  errors: [],
  warnings: [],
});

// ImpactAnalysisPort — 結果返却パターン
ports.impactAnalysisPort.analyze.mockResolvedValue({
  storyId: 'H09-01',
  affectedTestCases: ['IT-UC-DispatchCmd-001'],
  affectedFiles: ['dispatch-command-usecase.ts'],
});

// ArtifactScannerPort — 全成果物ありパターン
ports.artifactScannerPort.scan.mockResolvedValue({
  foundArtifacts: [
    { layer: 'L1', present: true, path: 'docs/product/construction/harness-api/domain_model.md' },
    { layer: 'L2', present: true, path: 'docs/product/construction/harness-api/logical_design.md' },
    { layer: 'L3', present: true, path: 'scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts' },
    { layer: 'L4', present: true, path: 'scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts' },
  ],
  scannedPaths: ['docs/product/construction/harness-api', 'scripts/harness/__tests__'],
});

// ConfigQueryPort — standardプリセットパターン
ports.configQueryPort.getPresetInfo.mockResolvedValue({
  name: 'standard',
  enabledLayers: ['L1', 'L2', 'L3'],
});
```

---

### 2.3 fixtureファイル一覧

```
scripts/harness/__tests__/fixtures/harness-api/
├── artifact-scan/
│   ├── full-artifacts/
│   │   ├── docs/
│   │   │   └── product/
│   │   │       └── construction/
│   │   │           └── harness-api/
│   │   │               ├── domain_model.md          # L1成果物stub
│   │   │               ├── logical_design.md        # L2成果物stub
│   │   │               └── it_test_design.md        # L3設計stub
│   │   └── scripts/
│   │       └── harness/
│   │           └── __tests__/
│   │               └── integration/
│   │                   └── harness-api/
│   │                       ├── dispatch-command-usecase.test.ts   # L3テストstub
│   │                       └── command-dispatch-integration.test.ts # L4テストstub
│   └── missing-l3/
│       ├── docs/
│       │   └── product/
│       │       └── construction/
│       │           └── harness-api/
│       │               ├── domain_model.md          # L1成果物stub
│       │               └── logical_design.md        # L2成果物stub
│       └── scripts/
│           └── harness/
│               └── __tests__/
│                   └── integration/
│                       └── harness-api/
│                           └── (L3テストファイルなし)
└── config/
    ├── harness-config-standard.json    # project.preset='standard'
    ├── harness-config-strict.json      # project.preset='strict'
    └── harness-config-minimal.json     # project.preset='minimal'
```

**harness-config-standard.json（内容）**:
```json
{
  "version": 2,
  "project": {
    "name": "harness-api-test",
    "preset": "standard"
  },
  "paths": {
    "designDocs": "docs/product/construction",
    "integrationTests": "scripts/harness/__tests__/integration"
  }
}
```

**harness-config-strict.json（内容）**:
```json
{
  "version": 2,
  "project": {
    "name": "harness-api-test",
    "preset": "strict"
  },
  "paths": {
    "designDocs": "docs/product/construction",
    "integrationTests": "scripts/harness/__tests__/integration"
  }
}
```

**harness-config-minimal.json（内容）**:
```json
{
  "version": 2,
  "project": {
    "name": "harness-api-test",
    "preset": "minimal"
  },
  "paths": {
    "designDocs": "docs/product/construction",
    "integrationTests": "scripts/harness/__tests__/integration"
  }
}
```

---

## 3. UseCaseテスト詳細ロジック

### 3.1 InitializeCommandRegistryUseCase（IT-UC-InitRegistry-001〜005）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/initialize-command-registry-usecase.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { InitializeCommandRegistryUseCase } from '../../../harness-api/application/usecases/initialize-command-registry-usecase';
import { CommandRegistry } from '../../../harness-api/domain/command-registry';

function buildDefaultCliCommandDefinitions() { /* 2.1参照 */ }

target('InitializeCommandRegistryUseCase.execute', () => {

  // ─── IT-UC-InitRegistry-001 ───
  describe('8コマンドを一括登録できること', () => {
    context('正常な8コマンドのCliCommandDefinitionInput配列を渡した場合', () => {
      it('registeredCount=8かつfailedRegistrations=[]が返される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        const commands = buildDefaultCliCommandDefinitions();

        // Act
        const actual = await useCase.execute({ commands });

        // Assert
        expect(actual.registeredCount).toBe(8);
        expect(actual.failedRegistrations).toHaveLength(0);
        expect(actual.commandNames).toHaveLength(8);
      });
    });
  });

  // ─── IT-UC-InitRegistry-002 ───
  describe('登録済みコマンド名が昇順で返されること', () => {
    context('順序不定の8コマンド配列を渡した場合', () => {
      it('commandNamesがアルファベット昇順で返される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        // 意図的にアルファベット逆順で並べる
        const commands = buildDefaultCliCommandDefinitions().reverse();

        // Act
        const actual = await useCase.execute({ commands });

        // Assert
        const sorted = [...actual.commandNames].sort();
        expect(actual.commandNames).toEqual(sorted);
        expect(actual.commandNames[0]).toBe('harness:check-phase');
        expect(actual.commandNames[1]).toBe('harness:check-ready');
      });
    });
  });

  // ─── IT-UC-InitRegistry-003 ───
  describe('重複コマンド名がある場合の挙動', () => {
    context('同一commandNameのInputを2件含む配列（計9件）を渡した場合', () => {
      it('成功した8件はregisteredCountに反映され、failedRegistrationsに1件記録される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        const commands = [
          ...buildDefaultCliCommandDefinitions(),
          { commandName: 'harness:check-ready', handler: vi.fn(), description: '重複' },
        ];

        // Act
        const actual = await useCase.execute({ commands });

        // Assert
        expect(actual.registeredCount).toBe(8);
        expect(actual.failedRegistrations).toHaveLength(1);
        expect(actual.failedRegistrations[0].commandName).toBe('harness:check-ready');
        expect(actual.failedRegistrations[0].reason).toMatch(/DuplicateCommandName/i);
      });
    });
  });

  // ─── IT-UC-InitRegistry-004 ───
  describe('harness:プレフィックスのないコマンド名はエラーになること', () => {
    context("commandName='invalid-cmd'を渡した場合", () => {
      it('InvalidCommandNameErrorがスローされる', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });
        const commands = [
          { commandName: 'invalid-cmd', handler: vi.fn(), description: 'プレフィックスなし' },
        ];

        // Act & Assert
        await expect(useCase.execute({ commands })).rejects.toThrow('InvalidCommandNameError');
      });
    });
  });

  // ─── IT-UC-InitRegistry-005 ───
  describe('空配列の場合、正常完了すること', () => {
    context('commands=[]を渡した場合', () => {
      it('registeredCount=0・commandNames=[]・failedRegistrations=[]が返される', async () => {
        // Arrange
        const registry = new CommandRegistry();
        const useCase = new InitializeCommandRegistryUseCase({ registry });

        // Act
        const actual = await useCase.execute({ commands: [] });

        // Assert
        expect(actual.registeredCount).toBe(0);
        expect(actual.commandNames).toEqual([]);
        expect(actual.failedRegistrations).toEqual([]);
      });
    });
  });

});
```

---

### 3.2 DispatchCommandUseCase（IT-UC-DispatchCmd-001〜011）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`

```typescript
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { DispatchCommandUseCase } from '../../../harness-api/application/usecases/dispatch-command-usecase';
import { CommandRegistry } from '../../../harness-api/domain/command-registry';
import { CommandDispatchService } from '../../../harness-api/domain/services/command-dispatch-service';
import { StatusDerivationService } from '../../../harness-api/domain/services/status-derivation-service';

function createMockPorts() { /* 2.1参照 */ }
function createDispatchCommandUseCase(ports) { /* 2.1参照 */ }

target('DispatchCommandUseCase.execute', () => {

  let ports: ReturnType<typeof createMockPorts>;
  let useCase: DispatchCommandUseCase;

  beforeEach(() => {
    ports = createMockPorts();
    useCase = createDispatchCommandUseCase(ports);
  });

  // ─── IT-UC-DispatchCmd-001 ───
  describe('check-readyコマンドが全ストーリー通過状態を返すこと', () => {
    context('PhaseGateQueryPortが3件全通過のPhaseGateStoryResult[]を返す場合', () => {
      it('response.status=pass・exitCode=0・data.allPassed=trueが返される', async () => {
        // Arrange
        ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
          { storyId: 'H09-01', passed: true, missingPhases: [] },
          { storyId: 'H09-02', passed: true, missingPhases: [] },
          { storyId: 'H09-03', passed: true, missingPhases: [] },
        ]);

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:check-ready',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data.allPassed).toBe(true);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-002 ───
  describe('check-phaseコマンドが指定UnitのPhaseInfoを返すこと', () => {
    context("PhaseGateQueryPortがPhaseInfo(currentLevel=2)を返す場合", () => {
      it('response.status=pass・response.data.unitId=harness-errorが返される', async () => {
        // Arrange
        ports.phaseGateQueryPort.queryUnit.mockResolvedValue({
          unitId: 'harness-error',
          currentLevel: 2,
          completedPhases: ['domain-design', 'logical-design'],
          nextRequiredPhase: 'unit-test',
        });

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:check-phase',
          args: { unit: 'harness-error' },
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data.unitId).toBe('harness-error');
      });
    });
  });

  // ─── IT-UC-DispatchCmd-003 ───
  describe('ci-checkコマンドが全L3バリデータ通過を返すこと', () => {
    context('ValidatorExecutionPortが4件全通過のValidatorCheckItem[]を返す場合', () => {
      it('response.status=pass・data.allPassed=trueが返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runL3Validators.mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
          { validatorId: 'L3-002', passed: true, errors: [] },
          { validatorId: 'L3-003', passed: true, errors: [] },
          { validatorId: 'L3-004', passed: true, errors: [] },
        ]);

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:ci-check',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data.allPassed).toBe(true);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-004 ───
  describe('detect-driftコマンドが乖離なしを返すこと', () => {
    context('ValidatorExecutionPortのrunDriftDetectionが空配列を返す場合', () => {
      it('response.status=pass・data.totalCount=0が返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([]);

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:detect-drift',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data.totalCount).toBe(0);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-005 ───
  describe('lintコマンドがpass結果を返すこと', () => {
    context('BiomeLintPortが{passed:true, errors:[], warnings:[]}を返す場合', () => {
      it('response.status=pass・exitCode=0が返される', async () => {
        // Arrange
        ports.biomeLintPort.runLint.mockResolvedValue({
          passed: true,
          errors: [],
          warnings: [],
        });

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:lint',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-006 ───
  describe('impact-analysisコマンドが影響テストケースを返すこと', () => {
    context("ImpactAnalysisPortがstoryId='H09-01'のImpactAnalysisResultを返す場合", () => {
      it('response.status=pass・response.data!=nullが返される', async () => {
        // Arrange
        ports.impactAnalysisPort.analyze.mockResolvedValue({
          storyId: 'H09-01',
          affectedTestCases: ['IT-UC-DispatchCmd-001'],
          affectedFiles: ['dispatch-command-usecase.ts'],
        });

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:impact-analysis',
          args: { storyId: 'H09-01' },
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data).not.toBeNull();
      });
    });
  });

  // ─── IT-UC-DispatchCmd-007 ───
  describe('未登録コマンド名の場合、exitCode=2のerror responseを返すこと', () => {
    context("commandName='harness:unknown-cmd'（CommandRegistryに未登録）を渡した場合", () => {
      it('response.status=error・exitCode=2・errors.length>=1が返される', async () => {
        // Arrange
        // CommandRegistry実体を使用（初期化なし＝未登録状態）

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:unknown-cmd',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('error');
        expect(actual.exitCode).toBe(2);
        expect(actual.response.errors.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-008 ───
  describe('check-phaseで存在しないUnit名を指定した場合、exitCode=1のfail responseを返すこと', () => {
    context("PhaseGateQueryPortのqueryUnitがnullを返す場合", () => {
      it('response.status=fail・exitCode=1が返される', async () => {
        // Arrange
        ports.phaseGateQueryPort.queryUnit.mockResolvedValue(null);

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:check-phase',
          args: { unit: 'non-existent-unit' },
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-009 ───
  describe('ポート呼び出しが例外をスローした場合、exitCode=2のerror responseを返すこと', () => {
    context('ValidatorExecutionPortがnetwork errorをスローする場合', () => {
      it('response.status=error・exitCode=2が返され、UseCase外に例外が伝播しない', async () => {
        // Arrange
        ports.validatorExecutionPort.runL3Validators.mockRejectedValue(
          new Error('network error'),
        );

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:ci-check',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('error');
        expect(actual.exitCode).toBe(2);
        // 例外が外に伝播していないことの確認（awaitが解決できた事実そのものが証拠）
      });
    });
  });

  // ─── IT-UC-DispatchCmd-010 ───
  describe('detect-driftで乖離が検出された場合、exitCode=1のfail responseを返すこと', () => {
    context('ValidatorExecutionPortが1件のDriftItemを返す場合', () => {
      it('response.status=fail・exitCode=1・data.totalCount=1が返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([
          {
            direction: 'design-to-code',
            unit: 'harness-api',
            element: 'CliCommand',
            recommendation: 'CommandRegistryへの登録を確認してください',
          },
        ]);

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:detect-drift',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
        expect(actual.response.data.totalCount).toBe(1);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-011 ───
  describe('complete-checkコマンドがValidatorExecutionPortとBiomeLintPortの両方を呼び出すこと', () => {
    context('両ポートが正常値を返す場合', () => {
      it('両ポートがそれぞれ1回ずつ呼び出され、response.status=passが返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runAllValidators.mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
        ]);
        ports.biomeLintPort.runLint.mockResolvedValue({
          passed: true,
          errors: [],
          warnings: [],
        });

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:complete-check',
          args: {},
          flags: {},
        });

        // Assert
        expect(ports.validatorExecutionPort.runAllValidators).toHaveBeenCalledTimes(1);
        expect(ports.biomeLintPort.runLint).toHaveBeenCalledTimes(1);
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
      });
    });
  });

});
```

---

### 3.3 DecideExitCodeUseCase（IT-UC-DecideExit-001〜006）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/decide-exit-code-usecase.test.ts`

> 純粋関数のため、モック不要。AAAパターン内のArrangeは入力値の設定のみ。

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { DecideExitCodeUseCase } from '../../../harness-api/application/usecases/decide-exit-code-usecase';

target('DecideExitCodeUseCase.execute', () => {

  const useCase = new DecideExitCodeUseCase();

  // ─── IT-UC-DecideExit-001 ───
  describe("status='pass'のコマンドはexitCode=0を返すこと", () => {
    context("commandName='harness:check-ready'・status='pass'の場合", () => {
      it('exitCode=0が返される', () => {
        // Arrange
        const input = { status: 'pass' as const, commandName: 'harness:check-ready' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });
  });

  // ─── IT-UC-DecideExit-002 ───
  describe("status='fail'の通常コマンドはexitCode=1を返すこと", () => {
    context("commandName='harness:ci-check'・status='fail'の場合", () => {
      it('exitCode=1が返される', () => {
        // Arrange
        const input = { status: 'fail' as const, commandName: 'harness:ci-check' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(1);
      });
    });
  });

  // ─── IT-UC-DecideExit-003 ───
  describe("status='error'のコマンドはexitCode=2を返すこと", () => {
    context("commandName='harness:lint'・status='error'の場合", () => {
      it('exitCode=2が返される', () => {
        // Arrange
        const input = { status: 'error' as const, commandName: 'harness:lint' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });

  // ─── IT-UC-DecideExit-004 ───
  // D5ルール: harness:status は fail でも exitCode=0 を返す
  describe("D5ルール: harness:statusでstatus='fail'でもexitCode=0を返すこと", () => {
    context("commandName='harness:status'・status='fail'の場合（D5ルール適用）", () => {
      it('exitCode=0が返され、reasonにD5ルール適用の旨が含まれる', () => {
        // Arrange
        // D5ルール: statusコマンドはハーネスの健全性表示専用であり、
        // failはCIを止める理由にならない。exitCode=0で情報提供のみ行う。
        const input = { status: 'fail' as const, commandName: 'harness:status' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.reason).toMatch(/D5|status.*fail.*0|情報提供/i);
      });
    });
  });

  // ─── IT-UC-DecideExit-005 ───
  describe("D5ルール: harness:statusでstatus='pass'はexitCode=0を返すこと", () => {
    context("commandName='harness:status'・status='pass'の場合", () => {
      it('exitCode=0が返される', () => {
        // Arrange
        const input = { status: 'pass' as const, commandName: 'harness:status' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });
  });

  // ─── IT-UC-DecideExit-006 ───
  describe("D5ルール例外: harness:statusでstatus='error'はexitCode=2を返すこと", () => {
    context("commandName='harness:status'・status='error'の場合", () => {
      it('D5ルールは適用されず、exitCode=2が返される', () => {
        // Arrange
        // D5ルールはfailにのみ適用。errorはインフラ/設定異常であり、
        // statusコマンドであっても exitCode=2 を返す。
        const input = { status: 'error' as const, commandName: 'harness:status' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });

});
```

---

### 3.4 DeriveHarnessStatusUseCase（IT-UC-DeriveStatus-001〜006）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts`

```typescript
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { DeriveHarnessStatusUseCase } from '../../../harness-api/application/usecases/derive-harness-status-usecase';
import { StatusDerivationService } from '../../../harness-api/domain/services/status-derivation-service';

function createStatusDeps() {
  const artifactScannerPort = { scan: vi.fn() };
  const configQueryPort = {
    getPresetInfo: vi.fn(),
    getConfigSummary: vi.fn(),
  };
  const statusDerivationService = new StatusDerivationService();
  const useCase = new DeriveHarnessStatusUseCase({
    artifactScannerPort,
    configQueryPort,
    statusDerivationService,
  });
  return { useCase, artifactScannerPort, configQueryPort };
}

target('DeriveHarnessStatusUseCase.execute', () => {

  // ─── IT-UC-DeriveStatus-001 ───
  describe('全レイヤー成果物が揃っている場合、全LayerHealth.lastResult=passを返すこと', () => {
    context('standardプリセット・全レイヤー成果物ありの場合', () => {
      it('L1-L3のlastResult=pass・L4のenabled=falseが返される', async () => {
        // Arrange
        const { useCase, artifactScannerPort, configQueryPort } = createStatusDeps();
        artifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true, path: 'docs/product/construction/harness-api/domain_model.md' },
            { layer: 'L2', present: true, path: 'docs/product/construction/harness-api/logical_design.md' },
            { layer: 'L3', present: true, path: 'scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts' },
            { layer: 'L4', present: true, path: 'scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts' },
          ],
          scannedPaths: ['docs/product/construction/harness-api', 'scripts/harness/__tests__/integration/harness-api'],
        });
        configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'standard',
          enabledLayers: ['L1', 'L2', 'L3'],
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        const l1 = actual.layers.find((l) => l.layerId === 'L1');
        const l2 = actual.layers.find((l) => l.layerId === 'L2');
        const l3 = actual.layers.find((l) => l.layerId === 'L3');
        const l4 = actual.layers.find((l) => l.layerId === 'L4');
        expect(l1?.lastResult).toBe('pass');
        expect(l2?.lastResult).toBe('pass');
        expect(l3?.lastResult).toBe('pass');
        expect(l4?.enabled).toBe(false);
      });
    });
  });

  // ─── IT-UC-DeriveStatus-002 ───
  describe('strictプリセットで全成果物が揃っている場合、L1-L4全てenabledかつlastResult=passを返すこと', () => {
    context('strictプリセット・全4レイヤー成果物ありの場合', () => {
      it('全4レイヤーのlastResult=pass・enabled=trueが返される', async () => {
        // Arrange
        const { useCase, artifactScannerPort, configQueryPort } = createStatusDeps();
        artifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true, path: 'docs/product/construction/harness-api/domain_model.md' },
            { layer: 'L2', present: true, path: 'docs/product/construction/harness-api/logical_design.md' },
            { layer: 'L3', present: true, path: 'scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts' },
            { layer: 'L4', present: true, path: 'scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts' },
          ],
          scannedPaths: [],
        });
        configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'strict',
          enabledLayers: ['L1', 'L2', 'L3', 'L4'],
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        expect(actual.layers).toHaveLength(4);
        for (const layer of actual.layers) {
          expect(layer.enabled).toBe(true);
          expect(layer.lastResult).toBe('pass');
        }
      });
    });
  });

  // ─── IT-UC-DeriveStatus-003 ───
  describe('有効なレイヤーの成果物が存在しない場合、lastResult=unknownを返すこと', () => {
    context('standardプリセットでL3成果物がない場合', () => {
      it('L3のLayerHealth.lastResult=unknownが返される', async () => {
        // Arrange
        const { useCase, artifactScannerPort, configQueryPort } = createStatusDeps();
        artifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true, path: 'docs/product/construction/harness-api/domain_model.md' },
            { layer: 'L2', present: true, path: 'docs/product/construction/harness-api/logical_design.md' },
            { layer: 'L3', present: false, path: null },
          ],
          scannedPaths: [],
        });
        configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'standard',
          enabledLayers: ['L1', 'L2', 'L3'],
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        const l3 = actual.layers.find((l) => l.layerId === 'L3');
        expect(l3?.lastResult).toBe('unknown');
      });
    });
  });

  // ─── IT-UC-DeriveStatus-004 ───
  describe('ArtifactScannerPortが例外をスローした場合、HarnessApiDomainErrorがスローされること', () => {
    context('ArtifactScannerPort.scanがfs errorをスローする場合', () => {
      it('HarnessApiDomainErrorがスローされる', async () => {
        // Arrange
        const { useCase, artifactScannerPort, configQueryPort } = createStatusDeps();
        artifactScannerPort.scan.mockRejectedValue(new Error('fs error'));
        configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'standard',
          enabledLayers: ['L1', 'L2', 'L3'],
        });

        // Act & Assert
        await expect(useCase.execute({})).rejects.toThrow('HarnessApiDomainError');
      });
    });
  });

  // ─── IT-UC-DeriveStatus-005 ───
  describe('ConfigQueryPortが例外をスローした場合、HarnessApiDomainErrorがスローされること', () => {
    context('ConfigQueryPort.getPresetInfoがconfig errorをスローする場合', () => {
      it('HarnessApiDomainErrorがスローされる', async () => {
        // Arrange
        const { useCase, artifactScannerPort, configQueryPort } = createStatusDeps();
        artifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [],
          scannedPaths: [],
        });
        configQueryPort.getPresetInfo.mockRejectedValue(new Error('config error'));

        // Act & Assert
        await expect(useCase.execute({})).rejects.toThrow('HarnessApiDomainError');
      });
    });
  });

  // ─── IT-UC-DeriveStatus-006 ───
  describe('minimalプリセットの場合、L2-L4がdisabledとして返されること', () => {
    context('minimalプリセット（enabledLayers=[L1]）の場合', () => {
      it('L1のみenabled=true、L2-L4はenabled=falseが返される', async () => {
        // Arrange
        const { useCase, artifactScannerPort, configQueryPort } = createStatusDeps();
        artifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true, path: 'docs/product/construction/harness-api/domain_model.md' },
            { layer: 'L2', present: true, path: 'docs/product/construction/harness-api/logical_design.md' },
            { layer: 'L3', present: true, path: 'scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts' },
            { layer: 'L4', present: true, path: 'scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts' },
          ],
          scannedPaths: [],
        });
        configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'minimal',
          enabledLayers: ['L1'],
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        const l1 = actual.layers.find((l) => l.layerId === 'L1');
        const l2 = actual.layers.find((l) => l.layerId === 'L2');
        const l3 = actual.layers.find((l) => l.layerId === 'L3');
        const l4 = actual.layers.find((l) => l.layerId === 'L4');
        expect(l1?.enabled).toBe(true);
        expect(l2?.enabled).toBe(false);
        expect(l3?.enabled).toBe(false);
        expect(l4?.enabled).toBe(false);
      });
    });
  });

});
```

---

## 4. Infrastructure Adapterテスト詳細ロジック

### 4.1 ValidatorSystemExecutionAdapter（IT-REPO-ValidatorExec-001〜006）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/validator-system-execution-adapter.test.ts`

```typescript
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

// @stub: wave2-pending - validator-system の正式インターフェース確定後に差し替え
vi.mock('validator-system', () => ({
  runL3Validators: vi.fn(),
  runAllValidators: vi.fn(),
  runDriftDetection: vi.fn(),
}));

import * as validatorSystem from 'validator-system';
import { ValidatorSystemExecutionAdapter } from '../../../harness-api/infrastructure/adapters/validator-system-execution-adapter';

target('ValidatorSystemExecutionAdapter', () => {

  let adapter: ValidatorSystemExecutionAdapter;

  beforeEach(() => {
    adapter = new ValidatorSystemExecutionAdapter();
    vi.clearAllMocks();
  });

  // ─── IT-REPO-ValidatorExec-001 ───
  describe('runL3Validators実行で全バリデータ通過結果を返すこと', () => {
    context('validator-systemスタブがL3-001〜L3-004を全通過で返す場合', () => {
      it('ValidatorCheckItem[]の長さ=4、全てpassed=trueが返される', async () => {
        // Arrange
        vi.mocked(validatorSystem.runL3Validators).mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
          { validatorId: 'L3-002', passed: true, errors: [] },
          { validatorId: 'L3-003', passed: true, errors: [] },
          { validatorId: 'L3-004', passed: true, errors: [] },
        ]);

        // Act
        const actual = await adapter.runL3Validators();

        // Assert
        expect(actual).toHaveLength(4);
        expect(actual.every((item) => item.passed)).toBe(true);
      });
    });
  });

  // ─── IT-REPO-ValidatorExec-002 ───
  describe('runL3Validatorsでバリデータ失敗がある場合', () => {
    context('L3-003（coverage）がfailed+HarnessError1件を返す場合', () => {
      it('ValidatorCheckItem[]内にpassed=falseが1件、errors.length=1が返される', async () => {
        // Arrange
        vi.mocked(validatorSystem.runL3Validators).mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
          { validatorId: 'L3-002', passed: true, errors: [] },
          {
            validatorId: 'L3-003',
            passed: false,
            errors: [{ code: 'COVERAGE_INSUFFICIENT', message: 'カバレッジが閾値を下回っています', severity: 'error' }],
          },
          { validatorId: 'L3-004', passed: true, errors: [] },
        ]);

        // Act
        const actual = await adapter.runL3Validators();

        // Assert
        const failed = actual.filter((item) => !item.passed);
        expect(failed).toHaveLength(1);
        expect(failed[0].validatorId).toBe('L3-003');
        expect(failed[0].errors).toHaveLength(1);
      });
    });
  });

  // ─── IT-REPO-ValidatorExec-003 ───
  describe('runDriftDetection実行（乖離なし）', () => {
    context('validator-systemスタブが空配列を返す場合', () => {
      it('DriftItem[].length=0が返される', async () => {
        // Arrange
        vi.mocked(validatorSystem.runDriftDetection).mockResolvedValue([]);

        // Act
        const actual = await adapter.runDriftDetection();

        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

  // ─── IT-REPO-ValidatorExec-004 ───
  describe('runDriftDetection実行（乖離あり）', () => {
    context('validator-systemスタブが2件のDriftItemを返す場合', () => {
      it('DriftItem[].length=2、各DriftItemに必須フィールドが含まれる', async () => {
        // Arrange
        vi.mocked(validatorSystem.runDriftDetection).mockResolvedValue([
          {
            direction: 'design-to-code',
            unit: 'harness-api',
            element: 'CliCommand',
            recommendation: 'CommandRegistryへの登録を確認してください',
          },
          {
            direction: 'code-to-design',
            unit: 'harness-api',
            element: 'ValidatorPort',
            recommendation: '設計文書への反映が必要です',
          },
        ]);

        // Act
        const actual = await adapter.runDriftDetection();

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0]).toHaveProperty('direction');
        expect(actual[0]).toHaveProperty('unit');
        expect(actual[0]).toHaveProperty('element');
        expect(actual[0]).toHaveProperty('recommendation');
      });
    });
  });

  // ─── IT-REPO-ValidatorExec-005 ───
  describe('validator-systemが例外をスローした場合、ValidatorCheckItemのpassed=falseにラップされること', () => {
    context('runL3ValidatorsがErrorをスローする場合', () => {
      it('例外は再スローされず、passed=falseのアイテムが返される', async () => {
        // Arrange
        vi.mocked(validatorSystem.runL3Validators).mockRejectedValue(
          new Error('unexpected error from validator-system'),
        );

        // Act
        const actual = await adapter.runL3Validators();

        // Assert
        // 例外は外に伝播せず、failed アイテムとして吸収される
        const failed = actual.filter((item) => !item.passed);
        expect(failed.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ─── IT-REPO-ValidatorExec-006 ───
  describe('runAllValidatorsはL1-L4全バリデータの結果を集約して返すこと', () => {
    context('validator-systemスタブがL1×8・L2×3・L3×4・L4×3の合計18件を返す場合', () => {
      it('ValidatorCheckItem[].length>=4（全レイヤー分の集約）が返される', async () => {
        // Arrange
        const allItems = [
          ...Array.from({ length: 8 }, (_, i) => ({ validatorId: `L1-00${i + 1}`, passed: true, errors: [] })),
          ...Array.from({ length: 3 }, (_, i) => ({ validatorId: `L2-00${i + 1}`, passed: true, errors: [] })),
          ...Array.from({ length: 4 }, (_, i) => ({ validatorId: `L3-00${i + 1}`, passed: true, errors: [] })),
          ...Array.from({ length: 3 }, (_, i) => ({ validatorId: `L4-00${i + 1}`, passed: true, errors: [] })),
        ];
        vi.mocked(validatorSystem.runAllValidators).mockResolvedValue(allItems);

        // Act
        const actual = await adapter.runAllValidators();

        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(4);
        // L1〜L4すべてのvalidatorIdが存在する
        const ids = actual.map((i) => i.validatorId);
        expect(ids.some((id) => id.startsWith('L1'))).toBe(true);
        expect(ids.some((id) => id.startsWith('L3'))).toBe(true);
      });
    });
  });

});
```

---

### 4.2 PhaseDependencyModelQueryAdapter（IT-REPO-PhaseGateQuery-001〜005）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/phase-dependency-model-query-adapter.test.ts`

```typescript
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

// @stub: wave2-pending - phase-dependency-model の正式インターフェース確定後に差し替え
vi.mock('phase-dependency-model', () => ({
  queryAllStories: vi.fn(),
  queryUnit: vi.fn(),
}));

import * as phaseDependencyModel from 'phase-dependency-model';
import { PhaseDependencyModelQueryAdapter } from '../../../harness-api/infrastructure/adapters/phase-dependency-model-query-adapter';

target('PhaseDependencyModelQueryAdapter', () => {

  let adapter: PhaseDependencyModelQueryAdapter;

  beforeEach(() => {
    adapter = new PhaseDependencyModelQueryAdapter();
    vi.clearAllMocks();
  });

  // ─── IT-REPO-PhaseGateQuery-001 ───
  describe('queryAllStories実行（全ストーリー通過）', () => {
    context('phase-dependency-modelスタブが3件全通過のPhaseGateStoryResult[]を返す場合', () => {
      it('PhaseGateStoryResult[].length=3・全てpassed=trueが返される', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.queryAllStories).mockResolvedValue([
          { storyId: 'H09-01', passed: true, missingPhases: [] },
          { storyId: 'H09-02', passed: true, missingPhases: [] },
          { storyId: 'H09-03', passed: true, missingPhases: [] },
        ]);

        // Act
        const actual = await adapter.queryAllStories();

        // Assert
        expect(actual).toHaveLength(3);
        expect(actual.every((r) => r.passed)).toBe(true);
      });
    });
  });

  // ─── IT-REPO-PhaseGateQuery-002 ───
  describe('queryAllStories実行（一部未通過）', () => {
    context('スタブが1件missingPhases=[domain-design]を含む結果を返す場合', () => {
      it('passed=falseのResult.missingPhases=[domain-design]が含まれる', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.queryAllStories).mockResolvedValue([
          { storyId: 'H09-01', passed: false, missingPhases: ['domain-design'] },
          { storyId: 'H09-02', passed: true, missingPhases: [] },
          { storyId: 'H09-03', passed: true, missingPhases: [] },
        ]);

        // Act
        const actual = await adapter.queryAllStories();

        // Assert
        const failed = actual.find((r) => !r.passed);
        expect(failed).toBeDefined();
        expect(failed?.missingPhases).toContain('domain-design');
      });
    });
  });

  // ─── IT-REPO-PhaseGateQuery-003 ───
  describe("queryUnit実行（存在するUnit）", () => {
    context("unitId='harness-error'を渡した場合", () => {
      it('PhaseInfo.unitId=harness-error・currentLevel=2が返される', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.queryUnit).mockResolvedValue({
          unitId: 'harness-error',
          currentLevel: 2,
          completedPhases: ['domain-design', 'logical-design'],
          nextRequiredPhase: 'unit-test',
        });

        // Act
        const actual = await adapter.queryUnit('harness-error');

        // Assert
        expect(actual?.unitId).toBe('harness-error');
        expect(actual?.currentLevel).toBe(2);
      });
    });
  });

  // ─── IT-REPO-PhaseGateQuery-004 ───
  describe("queryUnit実行（存在しないUnit）", () => {
    context("unitId='non-existent'を渡した場合", () => {
      it('nullが返される（例外はスローしない）', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.queryUnit).mockResolvedValue(null);

        // Act
        const actual = await adapter.queryUnit('non-existent');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  // ─── IT-REPO-PhaseGateQuery-005 ───
  describe('phase-dependency-modelが例外をスローした場合、呼び出し元に伝播すること', () => {
    context('queryAllStoriesがError(query failed)をスローする場合', () => {
      it('Errorが呼び出し元にスローされる', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.queryAllStories).mockRejectedValue(
          new Error('query failed'),
        );

        // Act & Assert
        await expect(adapter.queryAllStories()).rejects.toThrow('query failed');
      });
    });
  });

});
```

---

### 4.3 BiomeAstEngineLintAdapter（IT-REPO-BiomeLint-001〜004）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/biome-ast-engine-lint-adapter.test.ts`

```typescript
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

// @stub: wave2-pending - biome-ast-engine の正式インターフェース確定後に差し替え
vi.mock('biome-ast-engine', () => ({
  runLint: vi.fn(),
}));

import * as biomeAstEngine from 'biome-ast-engine';
import { BiomeAstEngineLintAdapter } from '../../../harness-api/infrastructure/adapters/biome-ast-engine-lint-adapter';

target('BiomeAstEngineLintAdapter', () => {

  let adapter: BiomeAstEngineLintAdapter;

  beforeEach(() => {
    adapter = new BiomeAstEngineLintAdapter();
    vi.clearAllMocks();
  });

  // ─── IT-REPO-BiomeLint-001 ───
  describe('runLint実行（全通過）', () => {
    context('biome-ast-engineスタブが全L1ルール通過の結果を返す場合', () => {
      it('{passed:true, errors:[], warnings:[]}が返される', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.runLint).mockResolvedValue({
          violations: [],
        });

        // Act
        const actual = await adapter.runLint();

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
        expect(actual.warnings).toHaveLength(0);
      });
    });
  });

  // ─── IT-REPO-BiomeLint-002 ───
  describe('runLint実行（エラーあり）', () => {
    context('biome-ast-engineスタブがL1-001違反のRuleViolation 2件を返す場合', () => {
      it('passed=false・errors.length=2・各errorにcode/severity/message/suggestionが含まれる', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.runLint).mockResolvedValue({
          violations: [
            {
              filePath: 'scripts/harness/harness-api/domain/command-registry.ts',
              line: 10,
              column: 5,
              ruleName: 'L1-001',
              message: 'any型の使用は禁止されています',
              severity: 'error',
            },
            {
              filePath: 'scripts/harness/harness-api/application/usecases/dispatch-command-usecase.ts',
              line: 23,
              column: 12,
              ruleName: 'L1-002',
              message: 'non-null assertionの使用は禁止されています',
              severity: 'error',
            },
          ],
        });

        // Act
        const actual = await adapter.runLint();

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors).toHaveLength(2);
        expect(actual.errors[0]).toHaveProperty('code');
        expect(actual.errors[0]).toHaveProperty('severity');
        expect(actual.errors[0]).toHaveProperty('message');
      });
    });
  });

  // ─── IT-REPO-BiomeLint-003 ───
  describe('runLint実行（warningのみ）', () => {
    context('biome-ast-engineスタブがseverity=warningのRuleViolation 1件を返す場合', () => {
      it('passed=true（warningはpassed判定に影響しない）・warnings.length=1が返される', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.runLint).mockResolvedValue({
          violations: [
            {
              filePath: 'scripts/harness/harness-api/domain/command-registry.ts',
              line: 5,
              column: 1,
              ruleName: 'L1-010',
              message: 'コメントの記述を推奨します',
              severity: 'warning',
            },
          ],
        });

        // Act
        const actual = await adapter.runLint();

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.warnings).toHaveLength(1);
        expect(actual.errors).toHaveLength(0);
      });
    });
  });

  // ─── IT-REPO-BiomeLint-004 ───
  describe('RuleViolationがHarnessError形式に正しく変換されること', () => {
    context('RuleViolationにfilePath/line/column/ruleName/message/severity/fix_exampleが含まれる場合', () => {
      it('errors[0].code=ruleName・severity=error・messageが含まれる', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.runLint).mockResolvedValue({
          violations: [
            {
              filePath: 'scripts/harness/harness-api/domain/command-registry.ts',
              line: 10,
              column: 5,
              ruleName: 'L1-001',
              message: 'any型の使用は禁止されています',
              severity: 'error',
              fix_example: 'unknown を使用してください',
            },
          ],
        });

        // Act
        const actual = await adapter.runLint();

        // Assert
        expect(actual.errors[0].code).toBe('L1-001');
        expect(actual.errors[0].severity).toBe('error');
        expect(actual.errors[0].message).toContain('any型');
      });
    });
  });

});
```

---

### 4.4 NyquistValidationImpactAnalysisAdapter（IT-REPO-ImpactAnalysis-001〜005）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/nyquist-validation-impact-analysis-adapter.test.ts`

```typescript
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

// @stub: wave2-pending - nyquist-validation の正式インターフェース確定後に差し替え
vi.mock('nyquist-validation', () => ({
  analyzeImpact: vi.fn(),
}));

import * as nyquistValidation from 'nyquist-validation';
import { NyquistValidationImpactAnalysisAdapter } from '../../../harness-api/infrastructure/adapters/nyquist-validation-impact-analysis-adapter';

target('NyquistValidationImpactAnalysisAdapter', () => {

  let adapter: NyquistValidationImpactAnalysisAdapter;

  beforeEach(() => {
    adapter = new NyquistValidationImpactAnalysisAdapter();
    vi.clearAllMocks();
  });

  // ─── IT-REPO-ImpactAnalysis-001 ───
  describe("analyze実行（storyId存在）", () => {
    context("storyId='H09-01'を渡し、スタブがImpactAnalysisResultを返す場合", () => {
      it('ImpactAnalysisResultが返される', async () => {
        // Arrange
        vi.mocked(nyquistValidation.analyzeImpact).mockResolvedValue({
          storyId: 'H09-01',
          affectedTestCases: ['IT-UC-DispatchCmd-001'],
          affectedFiles: ['dispatch-command-usecase.ts'],
        });

        // Act
        const actual = await adapter.analyze('H09-01');

        // Assert
        expect(actual).not.toBeNull();
        expect(actual?.storyId).toBe('H09-01');
      });
    });
  });

  // ─── IT-REPO-ImpactAnalysis-002 ───
  describe("analyze実行（storyId未存在）", () => {
    context("storyId='H99-99'を渡し、スタブがnullを返す場合", () => {
      it('nullが返される', async () => {
        // Arrange
        vi.mocked(nyquistValidation.analyzeImpact).mockResolvedValue(null);

        // Act
        const actual = await adapter.analyze('H99-99');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  // ─── IT-REPO-ImpactAnalysis-003 ───
  describe("storyId形式が不正な場合HarnessApiDomainErrorをスローすること", () => {
    context("storyId='invalid-id'（HXX-XX形式でない）を渡した場合", () => {
      it('HarnessApiDomainErrorがスローされる', async () => {
        // Arrange
        // モック不要（Adapterがバリデーションをポート呼び出し前に行う）

        // Act & Assert
        await expect(adapter.analyze('invalid-id')).rejects.toThrow('HarnessApiDomainError');
      });
    });
  });

  // ─── IT-REPO-ImpactAnalysis-004 ───
  describe("requirement-test-matrix.jsonが存在しない場合nullを返すこと", () => {
    context("nyquist-validationスタブがmatrix未存在シミュレーション（null返却）をする場合", () => {
      it('nullが返される', async () => {
        // Arrange
        vi.mocked(nyquistValidation.analyzeImpact).mockResolvedValue(null);

        // Act
        const actual = await adapter.analyze('H09-01');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  // ─── IT-REPO-ImpactAnalysis-005 ───
  describe('nyquist-validationが例外をスローした場合、呼び出し元に伝播すること', () => {
    context("storyId='H09-01'でスタブがErrorをスローする場合", () => {
      it('Errorが呼び出し元にスローされる', async () => {
        // Arrange
        vi.mocked(nyquistValidation.analyzeImpact).mockRejectedValue(
          new Error('nyquist internal error'),
        );

        // Act & Assert
        await expect(adapter.analyze('H09-01')).rejects.toThrow('nyquist internal error');
      });
    });
  });

});
```

---

### 4.5 FileSystemArtifactScannerAdapter（IT-REPO-ArtifactScan-001〜005）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/file-system-artifact-scanner-adapter.test.ts`

> このAdapterはフィクスチャディレクトリの実ファイルを使用する。vi.mock不使用。

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers';
import { FileSystemArtifactScannerAdapter } from '../../../harness-api/infrastructure/adapters/file-system-artifact-scanner-adapter';

const FIXTURES_BASE = path.resolve(
  __dirname,
  '../../fixtures/harness-api/artifact-scan',
);

target('FileSystemArtifactScannerAdapter', () => {

  // ─── IT-REPO-ArtifactScan-001 ───
  describe('scan実行（全成果物あり）', () => {
    context('フィクスチャにL1-L4全成果物が配置されている場合', () => {
      it('ArtifactScanResult.foundArtifacts全件のpresent=trueが返される', async () => {
        // Arrange
        const fixtureDir = path.join(FIXTURES_BASE, 'full-artifacts');
        const adapter = new FileSystemArtifactScannerAdapter({ basePath: fixtureDir });

        // Act
        const actual = await adapter.scan();

        // Assert
        expect(actual.foundArtifacts.every((a) => a.present)).toBe(true);
      });
    });
  });

  // ─── IT-REPO-ArtifactScan-002 ───
  describe('scan実行（L3テストファイルなし）', () => {
    context('フィクスチャにL3統合テストファイルが配置されていない場合', () => {
      it('foundArtifactsにL3のArtifactPresence.present=falseが含まれる', async () => {
        // Arrange
        const fixtureDir = path.join(FIXTURES_BASE, 'missing-l3');
        const adapter = new FileSystemArtifactScannerAdapter({ basePath: fixtureDir });

        // Act
        const actual = await adapter.scan();

        // Assert
        const l3Artifact = actual.foundArtifacts.find((a) => a.layer === 'L3');
        expect(l3Artifact?.present).toBe(false);
      });
    });
  });

  // ─── IT-REPO-ArtifactScan-003 ───
  describe('scan実行（空ディレクトリ）', () => {
    context('対象ディレクトリが空の場合', () => {
      it('ArtifactScanResult.foundArtifactsが空またはpresent=falseのみ返される', async () => {
        // Arrange
        // 存在するが成果物ファイルが一切ないディレクトリを使用
        const fixtureDir = path.join(FIXTURES_BASE, 'empty');
        const adapter = new FileSystemArtifactScannerAdapter({ basePath: fixtureDir });

        // Act
        const actual = await adapter.scan();

        // Assert
        const presentCount = actual.foundArtifacts.filter((a) => a.present).length;
        expect(presentCount).toBe(0);
      });
    });
  });

  // ─── IT-REPO-ArtifactScan-004 ───
  describe('harness.config.jsonのpathsを参照してスキャン対象を決定すること', () => {
    context('テスト用harness.config.json（paths.designDocs=docs/product/construction）を参照する場合', () => {
      it('scannedPathsにdesignDocsパスが含まれる', async () => {
        // Arrange
        const configFixturePath = path.resolve(
          __dirname,
          '../../fixtures/harness-api/config/harness-config-standard.json',
        );
        const adapter = new FileSystemArtifactScannerAdapter({
          configPath: configFixturePath,
        });

        // Act
        const actual = await adapter.scan();

        // Assert
        expect(actual.scannedPaths.some((p) => p.includes('docs/product/construction'))).toBe(true);
      });
    });
  });

  // ─── IT-REPO-ArtifactScan-005 ───
  describe('ファイルシステムアクセス失敗時に例外をスローすること', () => {
    context('アクセス不可なパス（存在しないルートパス）を設定した場合', () => {
      it('Errorがスローされる', async () => {
        // Arrange
        const adapter = new FileSystemArtifactScannerAdapter({
          basePath: '/non-existent-root-path-for-test-12345',
        });

        // Act & Assert
        await expect(adapter.scan()).rejects.toThrow();
      });
    });
  });

});
```

---

### 4.6 HarnessConfigQueryAdapter（IT-REPO-ConfigQuery-001〜004）

**ファイル**: `scripts/harness/__tests__/integration/harness-api/harness-config-query-adapter.test.ts`

> このAdapterはフィクスチャJSONの実ファイルを使用する。vi.mock不使用。

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers';
import { HarnessConfigQueryAdapter } from '../../../harness-api/infrastructure/adapters/harness-config-query-adapter';

const CONFIG_FIXTURES = path.resolve(
  __dirname,
  '../../fixtures/harness-api/config',
);

target('HarnessConfigQueryAdapter', () => {

  // ─── IT-REPO-ConfigQuery-001 ───
  describe('getPresetInfo実行（standard）', () => {
    context('project.preset=standardのharness.config.jsonを参照する場合', () => {
      it('PresetInfo{name:standard, enabledLayers:[L1,L2,L3]}が返される', async () => {
        // Arrange
        const configPath = path.join(CONFIG_FIXTURES, 'harness-config-standard.json');
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getPresetInfo();

        // Assert
        expect(actual.name).toBe('standard');
        expect(actual.enabledLayers).toEqual(['L1', 'L2', 'L3']);
      });
    });
  });

  // ─── IT-REPO-ConfigQuery-002 ───
  describe('getPresetInfo実行（strict）', () => {
    context('project.preset=strictのharness.config.jsonを参照する場合', () => {
      it('PresetInfo{name:strict, enabledLayers:[L1,L2,L3,L4]}が返される', async () => {
        // Arrange
        const configPath = path.join(CONFIG_FIXTURES, 'harness-config-strict.json');
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getPresetInfo();

        // Assert
        expect(actual.name).toBe('strict');
        expect(actual.enabledLayers).toEqual(['L1', 'L2', 'L3', 'L4']);
      });
    });
  });

  // ─── IT-REPO-ConfigQuery-003 ───
  describe('getConfigSummary実行', () => {
    context('既知のconfigPathを持つadapterを使用する場合', () => {
      it('ConfigSummary.configPathが正しいパス・lastModifiedがISO 8601形式が返される', async () => {
        // Arrange
        const configPath = path.join(CONFIG_FIXTURES, 'harness-config-standard.json');
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getConfigSummary();

        // Assert
        expect(actual.configPath).toBe(configPath);
        // ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ 形式
        expect(actual.lastModified).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });
    });
  });

  // ─── IT-REPO-ConfigQuery-004 ───
  describe('harness.config.jsonが存在しない場合に例外をスローすること', () => {
    context('存在しないconfigPathを持つadapterを使用する場合', () => {
      it('Errorがスローされる', async () => {
        // Arrange
        const adapter = new HarnessConfigQueryAdapter({
          configPath: '/non-existent-path/harness.config.json',
        });

        // Act & Assert
        await expect(adapter.getPresetInfo()).rejects.toThrow();
      });
    });
  });

});
```

## 5. Handler（Presentation）テスト詳細ロジック

### 共通インポート・セットアップ規約

全 Handler テストファイルで以下のインポートパターンを使用する。

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
```

DispatchCommandUseCase はテストファイルの先頭で `vi.fn()` によりモックする。
`process.exitCode` はテスト実行中に設定されるため、各テストの `beforeEach` でリセット（`process.exitCode = 0`）し、`afterEach` でも元に戻す。

---

### 5.1 CheckReadyHandler（IT-API-CheckReady-001〜004）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/check-ready-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { CheckReadyHandler } from '../../../harness/harness-api/presentation/check-ready-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('CheckReadyHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context('全ストーリーが通過している場合', () => {
      it('IT-API-CheckReady-001: stdout に status=pass の JSON を出力し、process.exitCode=0 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 3, passed: 3, failed: 0, warnings: 0 },
            data: { allPassed: true, stories: [] },
          },
          exitCode: 0,
        });
        const handler = new CheckReadyHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(actual.data.allPassed).toBe(true);
        expect(process.exitCode).toBe(0);
      });
    });

    context('未通過ストーリーが存在する場合', () => {
      it('IT-API-CheckReady-002: stdout に status=fail の JSON を出力し、process.exitCode=1 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [{ code: 'PHASE_NOT_PASSED', message: 'story H09-01 failed' }],
            summary: { totalChecks: 3, passed: 2, failed: 1, warnings: 0 },
            data: { allPassed: false, stories: [{ storyId: 'H09-01', passed: false }] },
          },
          exitCode: 1,
        });
        const handler = new CheckReadyHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(actual.errors.length).toBe(1);
        expect(process.exitCode).toBe(1);
      });
    });

    context('不明な引数が渡された場合', () => {
      it('IT-API-CheckReady-003: 引数を無視してデフォルト動作（check-ready は引数不要）になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: { status: 'pass', errors: [], summary: {}, data: { allPassed: true, stories: [] } },
          exitCode: 0,
        });
        const handler = new CheckReadyHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ unit: 'xxx' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        // 不明な引数は無視され、DispatchCommandUseCase が正常に呼び出されたことを確認
        expect(mockDispatchCommandUseCase.execute).toHaveBeenCalledTimes(1);
        expect(process.exitCode).toBe(0);
      });
    });

    context('UseCase が error ステータスを返す場合', () => {
      it('IT-API-CheckReady-004: stdout に status=error の JSON を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'unexpected failure' }],
            summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
            data: null,
          },
          exitCode: 2,
        });
        const handler = new CheckReadyHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });
  });
});
```

---

### 5.2 CheckPhaseHandler（IT-API-CheckPhase-001〜005）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/check-phase-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { CheckPhaseHandler } from '../../../harness/harness-api/presentation/check-phase-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('CheckPhaseHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context('unit 引数が正しく指定されている場合', () => {
      it("IT-API-CheckPhase-001: stdout に status=pass・data.unitId='harness-error' の JSON を出力し、process.exitCode=0 になること", async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 1, passed: 1, failed: 0, warnings: 0 },
            data: { unitId: 'harness-error', currentLevel: 2 },
          },
          exitCode: 0,
        });
        const handler = new CheckPhaseHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ unit: 'harness-error' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(actual.data.unitId).toBe('harness-error');
        expect(process.exitCode).toBe(0);
      });
    });

    context('unit 引数が省略された場合（必須引数の欠落）', () => {
      it('IT-API-CheckPhase-002: stdout に status=error を出力し、errors[0].message に引数不足の旨が含まれ、process.exitCode=2 になること', async () => {
        // Arrange
        const handler = new CheckPhaseHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(actual.errors[0].message).toMatch(/unit/i);
        expect(process.exitCode).toBe(2);
      });
    });

    context('unit 引数が空文字の場合', () => {
      it('IT-API-CheckPhase-003: stdout に status=error を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        const handler = new CheckPhaseHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ unit: '' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });

    context('存在しない unit 名を指定した場合', () => {
      it('IT-API-CheckPhase-004: stdout に status=fail の JSON を出力し、process.exitCode=1 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [{ code: 'UNIT_NOT_FOUND', message: 'unit non-existent not found' }],
            summary: { totalChecks: 1, passed: 0, failed: 1, warnings: 0 },
            data: null,
          },
          exitCode: 1,
        });
        const handler = new CheckPhaseHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ unit: 'non-existent' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(process.exitCode).toBe(1);
      });
    });

    context('UseCase が例外をスローした場合', () => {
      it('IT-API-CheckPhase-005: stdout に status=error の JSON を出力し、process.exitCode=2 になり、例外がプロセス外に伝播しないこと', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockRejectedValue(new Error('unexpected error'));
        const handler = new CheckPhaseHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ unit: 'harness-error' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
        // 例外がプロセス外に伝播していないことはテストが正常完了することで確認できる
      });
    });
  });
});
```

---

### 5.3 CiCheckHandler（IT-API-CiCheck-001〜004）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/ci-check-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { CiCheckHandler } from '../../../harness/harness-api/presentation/ci-check-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('CiCheckHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context('全バリデータが通過した場合', () => {
      it('IT-API-CiCheck-001: stdout に status=pass・data.allPassed=true の JSON を出力し、process.exitCode=0 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 4, passed: 4, failed: 0, warnings: 0 },
            data: {
              allPassed: true,
              validatorResults: [
                { validatorId: 'L3-001', passed: true, errors: [] },
                { validatorId: 'L3-002', passed: true, errors: [] },
              ],
            },
          },
          exitCode: 0,
        });
        const handler = new CiCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(actual.data.allPassed).toBe(true);
        expect(process.exitCode).toBe(0);
      });
    });

    context('一部バリデータが失敗した場合', () => {
      it('IT-API-CiCheck-002: stdout に status=fail・errors.length>=1 の JSON を出力し、process.exitCode=1 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [{ code: 'L3_VALIDATOR_FAILED', message: 'coverage check failed' }],
            summary: { totalChecks: 4, passed: 3, failed: 1, warnings: 0 },
            data: { allPassed: false, validatorResults: [] },
          },
          exitCode: 1,
        });
        const handler = new CiCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(process.exitCode).toBe(1);
      });
    });

    context('--pretty フラグが指定された場合', () => {
      it('IT-API-CiCheck-003: stdout の JSON がインデント付き整形出力になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 4, passed: 4, failed: 0, warnings: 0 },
            data: { allPassed: true, validatorResults: [] },
          },
          exitCode: 0,
        });
        const handler = new CiCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, { pretty: true });

        // Assert
        const actual = stdoutSpy.mock.calls[0][0] as string;
        // インデント付きの場合は改行文字を含む
        expect(actual).toContain('\n');
        expect(JSON.parse(actual).status).toBe('pass');
      });
    });

    context('UseCase が error ステータスを返す場合', () => {
      it('IT-API-CiCheck-004: stdout に status=error の JSON を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'unexpected failure' }],
            summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
            data: null,
          },
          exitCode: 2,
        });
        const handler = new CiCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });
  });
});
```

---

### 5.4 DetectDriftHandler（IT-API-DetectDrift-001〜004）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/detect-drift-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { DetectDriftHandler } from '../../../harness/harness-api/presentation/detect-drift-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('DetectDriftHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context('乖離が検出されなかった場合', () => {
      it('IT-API-DetectDrift-001: stdout に status=pass・data.totalCount=0 の JSON を出力し、process.exitCode=0 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 1, passed: 1, failed: 0, warnings: 0 },
            data: { drifts: [], totalCount: 0 },
          },
          exitCode: 0,
        });
        const handler = new DetectDriftHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(actual.data.totalCount).toBe(0);
        expect(process.exitCode).toBe(0);
      });
    });

    context('--json フラグあり・乖離が 2 件検出された場合', () => {
      it('IT-API-DetectDrift-002: stdout の JSON 構造が正しく、process.exitCode=1 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [],
            summary: { totalChecks: 1, passed: 0, failed: 1, warnings: 0 },
            data: {
              drifts: [
                {
                  direction: 'design-to-code',
                  unit: 'harness-api',
                  element: 'CliCommand',
                  recommendation: 'align implementation',
                },
                {
                  direction: 'code-to-design',
                  unit: 'harness-api',
                  element: 'Handler',
                  recommendation: 'update design doc',
                },
              ],
              totalCount: 2,
            },
          },
          exitCode: 1,
        });
        const handler = new DetectDriftHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, { json: true });

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(actual.data.totalCount).toBe(2);
        expect(actual.data.drifts[0]).toHaveProperty('direction');
        expect(actual.data.drifts[0]).toHaveProperty('unit');
        expect(actual.data.drifts[0]).toHaveProperty('element');
        expect(actual.data.drifts[0]).toHaveProperty('recommendation');
        expect(process.exitCode).toBe(1);
      });
    });

    context('不明なフラグが渡された場合', () => {
      it('IT-API-DetectDrift-003: フラグを無視または引数エラーとして処理されること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 1, passed: 1, failed: 0, warnings: 0 },
            data: { drifts: [], totalCount: 0 },
          },
          exitCode: 0,
        });
        const handler = new DetectDriftHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, { unknownFlag: true });

        // Assert
        // フラグ無視の場合は正常に動作する
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(['pass', 'error']).toContain(actual.status);
      });
    });

    context('UseCase が error ステータスを返す場合', () => {
      it('IT-API-DetectDrift-004: stdout に status=error の JSON を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'unexpected failure' }],
            summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
            data: null,
          },
          exitCode: 2,
        });
        const handler = new DetectDriftHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });
  });
});
```

---

### 5.5 StatusHandler（IT-API-Status-001〜004）D5ルール含む

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/status-handler.test.ts`

> **D5ルール**: `harness:status` コマンドは `status='fail'` であっても `process.exitCode=0` を設定する。
> このルールは DecideExitCodeUseCase が適用するが、Handler テストでは UseCase モックの `exitCode=0` として表現し、
> Handler 自体が D5 ルールの結果（exitCode=0）を正しく使用することを検証する。

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { StatusHandler } from '../../../harness/harness-api/presentation/status-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('StatusHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context('全レイヤーが健全な場合', () => {
      it('IT-API-Status-001: stdout に status=pass・data.layers.length=4 の JSON を出力し、process.exitCode=0 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 4, passed: 4, failed: 0, warnings: 0 },
            data: {
              layers: [
                { layerId: 'L1', lastResult: 'pass', enabled: true },
                { layerId: 'L2', lastResult: 'pass', enabled: true },
                { layerId: 'L3', lastResult: 'pass', enabled: true },
                { layerId: 'L4', lastResult: 'pass', enabled: false },
              ],
            },
          },
          exitCode: 0,
        });
        const handler = new StatusHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(actual.data.layers.length).toBe(4);
        expect(process.exitCode).toBe(0);
      });
    });

    context('一部レイヤーの健全性が unknown の場合', () => {
      it('IT-API-Status-002: stdout に status=pass の JSON を出力し、process.exitCode=0 になること（status コマンドは fail でも 0）', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 4, passed: 3, failed: 0, warnings: 1 },
            data: {
              layers: [
                { layerId: 'L1', lastResult: 'pass', enabled: true },
                { layerId: 'L2', lastResult: 'pass', enabled: true },
                { layerId: 'L3', lastResult: 'unknown', enabled: true },
                { layerId: 'L4', lastResult: 'pass', enabled: false },
              ],
            },
          },
          exitCode: 0,
        });
        const handler = new StatusHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(process.exitCode).toBe(0);
      });
    });

    context('D5ルール: UseCase が status=fail・exitCode=0 を返す場合', () => {
      it('IT-API-Status-003: process.exitCode=0 になること（fail でも statusコマンドは exitCode=0 / D5ルール）', async () => {
        // Arrange
        // DecideExitCodeUseCase が D5 ルールを適用し、exitCode=0 を返す
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [],
            summary: { totalChecks: 4, passed: 2, failed: 2, warnings: 0 },
            data: {
              layers: [
                { layerId: 'L1', lastResult: 'fail', enabled: true },
                { layerId: 'L2', lastResult: 'fail', enabled: true },
              ],
            },
          },
          exitCode: 0, // D5ルール適用済み: fail でも exitCode=0
        });
        const handler = new StatusHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        // D5ルール: harness:status は fail であっても process.exitCode=0 になる
        expect(process.exitCode).toBe(0);
      });
    });

    context('UseCase が error ステータスを返す場合', () => {
      it('IT-API-Status-004: stdout に status=error の JSON を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'unexpected failure' }],
            summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
            data: null,
          },
          exitCode: 2,
        });
        const handler = new StatusHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });
  });
});
```

---

### 5.6 LintHandler（IT-API-Lint-001〜004）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/lint-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { LintHandler } from '../../../harness/harness-api/presentation/lint-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('LintHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context('全ルールが通過した場合', () => {
      it('IT-API-Lint-001: stdout に status=pass の JSON を出力し、process.exitCode=0 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 8, passed: 8, failed: 0, warnings: 0 },
            data: { passed: true, violations: [] },
          },
          exitCode: 0,
        });
        const handler = new LintHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(process.exitCode).toBe(0);
      });
    });

    context('L1 違反が存在する場合', () => {
      it('IT-API-Lint-002: stdout に status=fail・errors.length>=1 の JSON を出力し、process.exitCode=1 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [
              { code: 'L1-001', message: 'variable naming violation', severity: 'error' },
              { code: 'L1-002', message: 'import order violation', severity: 'error' },
            ],
            summary: { totalChecks: 8, passed: 6, failed: 2, warnings: 0 },
            data: { passed: false, violations: [] },
          },
          exitCode: 1,
        });
        const handler = new LintHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(process.exitCode).toBe(1);
      });
    });

    context('不明な引数が渡された場合', () => {
      it('IT-API-Lint-003: 引数を無視してデフォルト動作になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 8, passed: 8, failed: 0, warnings: 0 },
            data: { passed: true, violations: [] },
          },
          exitCode: 0,
        });
        const handler = new LintHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ unknown: 'arg' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(['pass', 'error']).toContain(actual.status);
        expect(mockDispatchCommandUseCase.execute).toHaveBeenCalledTimes(1);
      });
    });

    context('UseCase が error ステータスを返す場合', () => {
      it('IT-API-Lint-004: stdout に status=error の JSON を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'unexpected failure' }],
            summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
            data: null,
          },
          exitCode: 2,
        });
        const handler = new LintHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });
  });
});
```

---

### 5.7 CompleteCheckHandler（IT-API-CompleteCheck-001〜004）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/complete-check-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { CompleteCheckHandler } from '../../../harness/harness-api/presentation/complete-check-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('CompleteCheckHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context('全バリデータが通過した場合', () => {
      it('IT-API-CompleteCheck-001: stdout に status=pass の JSON を出力し、process.exitCode=0 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 15, passed: 15, failed: 0, warnings: 0 },
            data: { allPassed: true },
          },
          exitCode: 0,
        });
        const handler = new CompleteCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(process.exitCode).toBe(0);
      });
    });

    context('一部のチェックが失敗した場合', () => {
      it('IT-API-CompleteCheck-002: stdout に status=fail・errors.length>=1 の JSON を出力し、process.exitCode=1 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [
              { code: 'L3_VALIDATOR_FAILED', message: 'validator failed' },
              { code: 'L1_LINT_FAILED', message: 'lint failed' },
              { code: 'L2_TEST_FAILED', message: 'test failed' },
            ],
            summary: { totalChecks: 15, passed: 12, failed: 3, warnings: 0 },
            data: { allPassed: false },
          },
          exitCode: 1,
        });
        const handler = new CompleteCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(process.exitCode).toBe(1);
      });
    });

    context('不明な引数が渡された場合', () => {
      it('IT-API-CompleteCheck-003: 引数を無視してデフォルト動作になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 15, passed: 15, failed: 0, warnings: 0 },
            data: { allPassed: true },
          },
          exitCode: 0,
        });
        const handler = new CompleteCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ unknown: 'arg' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(['pass', 'error']).toContain(actual.status);
        expect(mockDispatchCommandUseCase.execute).toHaveBeenCalledTimes(1);
      });
    });

    context('UseCase が error ステータスを返す場合', () => {
      it('IT-API-CompleteCheck-004: stdout に status=error の JSON を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'unexpected failure' }],
            summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
            data: null,
          },
          exitCode: 2,
        });
        const handler = new CompleteCheckHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });
  });
});
```

---

### 5.8 ImpactAnalysisHandler（IT-API-ImpactAnalysis-001〜005）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/impact-analysis-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DispatchCommandUseCaseの正式インターフェース確定後に差し替え
import { ImpactAnalysisHandler } from '../../../harness/harness-api/presentation/impact-analysis-handler';

const mockDispatchCommandUseCase = { execute: vi.fn() };

target('ImpactAnalysisHandler', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('handle()', () => {
    context("storyId='H09-01' が正しく指定された場合", () => {
      it("IT-API-ImpactAnalysis-001: stdout に status=pass・data.storyId='H09-01' の JSON を出力し、process.exitCode=0 になること", async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'pass',
            errors: [],
            summary: { totalChecks: 1, passed: 1, failed: 0, warnings: 0 },
            data: {
              storyId: 'H09-01',
              impactedTestCases: ['TC-001', 'TC-002'],
              totalImpacted: 2,
            },
          },
          exitCode: 0,
        });
        const handler = new ImpactAnalysisHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ storyId: 'H09-01' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(actual.data.storyId).toBe('H09-01');
        expect(process.exitCode).toBe(0);
      });
    });

    context('storyId 引数が省略された場合（必須引数の欠落）', () => {
      it('IT-API-ImpactAnalysis-002: stdout に status=error・errors[0].message に引数不足の旨を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        const handler = new ImpactAnalysisHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(actual.errors[0].message).toMatch(/storyId/i);
        expect(process.exitCode).toBe(2);
      });
    });

    context("storyId='invalid'（HXX-XX 形式でない）が指定された場合", () => {
      it('IT-API-ImpactAnalysis-003: stdout に status=error・errors[0].message にフォーマット不正の旨を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        const handler = new ImpactAnalysisHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ storyId: 'invalid' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(actual.errors[0].message).toMatch(/format|フォーマット|HXX-XX/i);
        expect(process.exitCode).toBe(2);
      });
    });

    context("storyId='H99-99'（存在しないストーリー）が指定された場合", () => {
      it('IT-API-ImpactAnalysis-004: stdout に status=fail の JSON を出力し、process.exitCode=1 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'fail',
            errors: [{ code: 'STORY_NOT_FOUND', message: 'story H99-99 not found' }],
            summary: { totalChecks: 1, passed: 0, failed: 1, warnings: 0 },
            data: null,
          },
          exitCode: 1,
        });
        const handler = new ImpactAnalysisHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ storyId: 'H99-99' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(process.exitCode).toBe(1);
      });
    });

    context('UseCase が error ステータスを返す場合', () => {
      it('IT-API-ImpactAnalysis-005: stdout に status=error の JSON を出力し、process.exitCode=2 になること', async () => {
        // Arrange
        mockDispatchCommandUseCase.execute.mockResolvedValue({
          response: {
            status: 'error',
            errors: [{ code: 'INTERNAL_ERROR', message: 'unexpected failure' }],
            summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 },
            data: null,
          },
          exitCode: 2,
        });
        const handler = new ImpactAnalysisHandler(mockDispatchCommandUseCase as any);

        // Act
        await handler.handle({ storyId: 'H09-01' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('error');
        expect(process.exitCode).toBe(2);
      });
    });
  });
});
```

---

## 6. Cross-Layer統合テスト詳細ロジック

Cross-Layer 統合テストは **UseCase 実体 + Port モック** の組み合わせで検証する。
Handler のモックは使用せず、実際のコンポーネント連携を検証する。

---

### 6.1 CommandDispatch統合フロー（IT-API-DispatchInteg-001〜005）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - 各 UseCase・Handler の正式インターフェース確定後に差し替え
import { CheckReadyHandler } from '../../../harness/harness-api/presentation/check-ready-handler';
import { CheckPhaseHandler } from '../../../harness/harness-api/presentation/check-phase-handler';
import { CompleteCheckHandler } from '../../../harness/harness-api/presentation/complete-check-handler';
import { StatusHandler } from '../../../harness/harness-api/presentation/status-handler';
import { InitializeCommandRegistryUseCase } from '../../../harness/harness-api/application/initialize-command-registry-usecase';
import { DispatchCommandUseCase } from '../../../harness/harness-api/application/dispatch-command-usecase';
import { CommandRegistry } from '../../../harness/harness-api/domain/command-registry';

// ポートモック（各テストで vi.fn() により差し替え）
const mockPhaseGateQueryPort = { queryAllStories: vi.fn(), queryUnit: vi.fn() };
const mockValidatorExecutionPort = { runL3Validators: vi.fn(), runDriftDetection: vi.fn(), runAllValidators: vi.fn() };
const mockBiomeLintPort = { runLint: vi.fn() };
const mockImpactAnalysisPort = { analyze: vi.fn() };
const mockArtifactScannerPort = { scan: vi.fn() };
const mockConfigQueryPort = { getPresetInfo: vi.fn(), getConfigSummary: vi.fn() };

function createDispatchCommandUseCase(): DispatchCommandUseCase {
  return new DispatchCommandUseCase(
    new CommandRegistry(),
    mockPhaseGateQueryPort as any,
    mockValidatorExecutionPort as any,
    mockBiomeLintPort as any,
    mockImpactAnalysisPort as any,
    mockArtifactScannerPort as any,
    mockConfigQueryPort as any,
  );
}

target('CommandDispatch 統合フロー', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('check-ready コマンド全フロー', () => {
    context('2 件通過・1 件未通過のストーリーが存在する場合', () => {
      it('IT-API-DispatchInteg-001: Presentation→Application→Domain→Port が正しく連携し、stdout に status=fail・data.allPassed=false を出力し、process.exitCode=1 になること', async () => {
        // Arrange
        mockPhaseGateQueryPort.queryAllStories.mockResolvedValue([
          { storyId: 'H09-01', passed: true, missingPhases: [] },
          { storyId: 'H09-02', passed: true, missingPhases: [] },
          { storyId: 'H09-03', passed: false, missingPhases: ['domain-design'] },
        ]);
        const useCase = createDispatchCommandUseCase();
        const handler = new CheckReadyHandler(useCase);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('fail');
        expect(actual.data.allPassed).toBe(false);
        expect(actual.data.stories.length).toBe(3);
        expect(process.exitCode).toBe(1);
      });
    });
  });

  describe('check-phase コマンド全フロー（CommandRegistry 初期化込み）', () => {
    context('InitializeCommandRegistryUseCase で 8 コマンドを登録後に CheckPhaseHandler を呼び出す場合', () => {
      it('IT-API-DispatchInteg-002: CommandRegistry 初期化→DispatchCommandUseCase 実行が正しく連携し、PhaseInfo が返されること', async () => {
        // Arrange
        mockPhaseGateQueryPort.queryUnit.mockResolvedValue({
          unitId: 'harness-error',
          currentLevel: 2,
        });
        const registry = new CommandRegistry();
        const initUseCase = new InitializeCommandRegistryUseCase(registry);
        const dispatchUseCase = new DispatchCommandUseCase(
          registry,
          mockPhaseGateQueryPort as any,
          mockValidatorExecutionPort as any,
          mockBiomeLintPort as any,
          mockImpactAnalysisPort as any,
          mockArtifactScannerPort as any,
          mockConfigQueryPort as any,
        );
        // 8 コマンドを事前登録
        await initUseCase.execute({ commands: [
          { commandName: 'harness:check-ready', description: 'Check ready' },
          { commandName: 'harness:check-phase', description: 'Check phase' },
          { commandName: 'harness:ci-check', description: 'CI check' },
          { commandName: 'harness:detect-drift', description: 'Detect drift' },
          { commandName: 'harness:status', description: 'Status' },
          { commandName: 'harness:lint', description: 'Lint' },
          { commandName: 'harness:complete-check', description: 'Complete check' },
          { commandName: 'harness:impact-analysis', description: 'Impact analysis' },
        ]});
        const handler = new CheckPhaseHandler(dispatchUseCase);

        // Act
        await handler.handle({ unit: 'harness-error' }, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        expect(actual.status).toBe('pass');
        expect(actual.data.unitId).toBe('harness-error');
      });
    });
  });

  describe('未登録コマンドのディスパッチ全フロー', () => {
    context('CommandRegistry に登録されていないコマンド名を DispatchCommandUseCase に直接渡す場合', () => {
      it('IT-API-DispatchInteg-003: 全フローを通じて response.status=error・exitCode=2 で返されること', async () => {
        // Arrange
        const useCase = createDispatchCommandUseCase();
        // CommandRegistry を初期化せずに未登録コマンドを実行

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:unknown-cmd',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('error');
        expect(actual.exitCode).toBe(2);
      });
    });
  });

  describe('complete-check コマンド全フロー', () => {
    context('ValidatorExecutionPort と BiomeLintPort の両方が呼ばれる場合', () => {
      it('IT-API-DispatchInteg-004: 両ポートが正確に 1 回ずつ呼ばれること', async () => {
        // Arrange
        mockValidatorExecutionPort.runAllValidators.mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
        ]);
        mockBiomeLintPort.runLint.mockResolvedValue({ passed: true, errors: [], warnings: [] });
        const useCase = createDispatchCommandUseCase();
        const handler = new CompleteCheckHandler(useCase);

        // Act
        await handler.handle({}, {});

        // Assert
        expect(mockValidatorExecutionPort.runAllValidators).toHaveBeenCalledTimes(1);
        expect(mockBiomeLintPort.runLint).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('status コマンド全フロー', () => {
    context('ArtifactScannerPort・ConfigQueryPort・StatusDerivationService が連携する場合', () => {
      it('IT-API-DispatchInteg-005: response.status が pass または error になり、exitCode=0 になること（D5 ルール）', async () => {
        // Arrange
        mockArtifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true },
            { layer: 'L2', present: true },
            { layer: 'L3', present: true },
            { layer: 'L4', present: false },
          ],
        });
        mockConfigQueryPort.getPresetInfo.mockResolvedValue({
          name: 'standard',
          enabledLayers: ['L1', 'L2', 'L3'],
        });
        const useCase = createDispatchCommandUseCase();
        const handler = new StatusHandler(useCase);

        // Act
        await handler.handle({}, {});

        // Assert
        const actual = JSON.parse((stdoutSpy.mock.calls[0][0] as string));
        // D5 ルール: status コマンドは pass/fail いずれも exitCode=0
        expect(['pass', 'fail', 'error']).toContain(actual.status);
        expect(process.exitCode).toBe(0);
      });
    });
  });
});
```

---

### 6.2 StatusDerivation統合フロー（IT-API-StatusInteg-001〜004）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/status-derivation-integration.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - DeriveHarnessStatusUseCaseの正式インターフェース確定後に差し替え
import { DeriveHarnessStatusUseCase } from '../../../harness/harness-api/application/derive-harness-status-usecase';
import { DispatchCommandUseCase } from '../../../harness/harness-api/application/dispatch-command-usecase';
import { CommandRegistry } from '../../../harness/harness-api/domain/command-registry';

// ポートモック
const mockArtifactScannerPort = { scan: vi.fn() };
const mockConfigQueryPort = { getPresetInfo: vi.fn(), getConfigSummary: vi.fn() };
const mockPhaseGateQueryPort = { queryAllStories: vi.fn(), queryUnit: vi.fn() };
const mockValidatorExecutionPort = { runL3Validators: vi.fn(), runDriftDetection: vi.fn(), runAllValidators: vi.fn() };
const mockBiomeLintPort = { runLint: vi.fn() };
const mockImpactAnalysisPort = { analyze: vi.fn() };

target('StatusDerivation 統合フロー', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DeriveHarnessStatusUseCase（実体）+ StatusDerivationService（実体）+ Port モック', () => {
    context('strict プリセットで全 4 レイヤー成果物が揃っている場合', () => {
      it('IT-API-StatusInteg-001: HarnessStatusSummary の isAllLayersHealthy()=true・layers.length=4 が導出されること', async () => {
        // Arrange
        mockArtifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true },
            { layer: 'L2', present: true },
            { layer: 'L3', present: true },
            { layer: 'L4', present: true },
          ],
        });
        mockConfigQueryPort.getPresetInfo.mockResolvedValue({
          name: 'strict',
          enabledLayers: ['L1', 'L2', 'L3', 'L4'],
        });
        mockPhaseGateQueryPort.queryAllStories.mockResolvedValue([
          { storyId: 'H09-01', passed: true, missingPhases: [] },
          { storyId: 'H09-02', passed: true, missingPhases: [] },
          { storyId: 'H09-03', passed: true, missingPhases: [] },
          { storyId: 'H09-04', passed: true, missingPhases: [] },
          { storyId: 'H09-05', passed: true, missingPhases: [] },
        ]);
        const useCase = new DeriveHarnessStatusUseCase(
          mockArtifactScannerPort as any,
          mockConfigQueryPort as any,
        );

        // Act
        const actual = await useCase.execute({});

        // Assert
        expect(actual.layers.length).toBe(4);
        expect(actual.isAllLayersHealthy()).toBe(true);
      });
    });

    context('L4 成果物がない strict プリセット環境の場合', () => {
      it('IT-API-StatusInteg-002: L4 の LayerHealth.lastResult=unknown が正しく導出されること', async () => {
        // Arrange
        mockArtifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true },
            { layer: 'L2', present: true },
            { layer: 'L3', present: true },
            { layer: 'L4', present: false },
          ],
        });
        mockConfigQueryPort.getPresetInfo.mockResolvedValue({
          name: 'strict',
          enabledLayers: ['L1', 'L2', 'L3', 'L4'],
        });
        const useCase = new DeriveHarnessStatusUseCase(
          mockArtifactScannerPort as any,
          mockConfigQueryPort as any,
        );

        // Act
        const actual = await useCase.execute({});

        // Assert
        const l4Layer = actual.layers.find((l: { layerId: string }) => l.layerId === 'L4');
        expect(l4Layer).toBeDefined();
        expect(l4Layer!.lastResult).toBe('unknown');
      });
    });

    context('ArtifactScannerPort がエラーを投げた場合', () => {
      it('IT-API-StatusInteg-003: CommandDispatchService が HarnessApiResponse.error() に変換し、response.status=error・exitCode=2 になること', async () => {
        // Arrange
        mockArtifactScannerPort.scan.mockRejectedValue(new Error('fs error'));
        mockConfigQueryPort.getPresetInfo.mockResolvedValue({
          name: 'standard',
          enabledLayers: ['L1', 'L2', 'L3'],
        });
        const useCase = new DispatchCommandUseCase(
          new CommandRegistry(),
          mockPhaseGateQueryPort as any,
          mockValidatorExecutionPort as any,
          mockBiomeLintPort as any,
          mockImpactAnalysisPort as any,
          mockArtifactScannerPort as any,
          mockConfigQueryPort as any,
        );

        // Act
        const actual = await useCase.execute({
          commandName: 'harness:status',
          args: {},
          flags: {},
        });

        // Assert
        expect(actual.response.status).toBe('error');
        expect(actual.exitCode).toBe(2);
      });
    });

    context('minimal プリセットで L2-L4 が disabled の場合', () => {
      it('IT-API-StatusInteg-004: L2-L4 の LayerHealth.isActionable()=false になること', async () => {
        // Arrange
        mockArtifactScannerPort.scan.mockResolvedValue({
          foundArtifacts: [
            { layer: 'L1', present: true },
            { layer: 'L2', present: false },
            { layer: 'L3', present: false },
            { layer: 'L4', present: false },
          ],
        });
        mockConfigQueryPort.getPresetInfo.mockResolvedValue({
          name: 'minimal',
          enabledLayers: ['L1'],
        });
        const useCase = new DeriveHarnessStatusUseCase(
          mockArtifactScannerPort as any,
          mockConfigQueryPort as any,
        );

        // Act
        const actual = await useCase.execute({});

        // Assert
        const disabledLayers = actual.layers.filter(
          (l: { layerId: string; isActionable: () => boolean }) => ['L2', 'L3', 'L4'].includes(l.layerId)
        );
        for (const layer of disabledLayers) {
          expect(layer.isActionable()).toBe(false);
        }
      });
    });
  });
});
```

---

### 6.3 SharedKernel Contract検証（IT-API-SharedKernel-001〜003）

**テストファイル**: `scripts/harness/__tests__/integration/harness-api/shared-kernel-contract.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
// @stub: wave2-pending - HarnessApiResponseの正式インターフェース確定後に差し替え
import { HarnessApiResponse } from '../../../harness/harness-api/domain/harness-api-response';
import { HarnessApiResponseMapper } from '../../../harness/harness-api/application/harness-api-response-mapper';

target('SharedKernel Contract', () => {
  describe('HarnessApiResponse<T> JSON 出力構造', () => {
    context('pass()・fail()・error() の各静的メソッドで生成したレスポンスの場合', () => {
      it('IT-API-SharedKernel-001: JSON に {status, errors[], summary{totalChecks, passed, failed, warnings}, data?} が全て含まれること', () => {
        // Arrange
        const passResponse = HarnessApiResponse.pass({ result: 'ok' });
        const failResponse = HarnessApiResponse.fail(
          [{ code: 'ERR', message: 'fail' }],
          { result: 'ng' },
        );
        const errorResponse = HarnessApiResponse.error(
          [{ code: 'ERR', message: 'error' }],
        );

        // Act
        const actualPass = passResponse.toJSON();
        const actualFail = failResponse.toJSON();
        const actualError = errorResponse.toJSON();

        // Assert - pass
        expect(actualPass).toHaveProperty('status', 'pass');
        expect(actualPass).toHaveProperty('errors');
        expect(Array.isArray(actualPass.errors)).toBe(true);
        expect(actualPass).toHaveProperty('summary');
        expect(actualPass.summary).toHaveProperty('totalChecks');
        expect(actualPass.summary).toHaveProperty('passed');
        expect(actualPass.summary).toHaveProperty('failed');
        expect(actualPass.summary).toHaveProperty('warnings');
        expect(actualPass).toHaveProperty('data');

        // Assert - fail
        expect(actualFail).toHaveProperty('status', 'fail');
        expect(Array.isArray(actualFail.errors)).toBe(true);
        expect(actualFail).toHaveProperty('summary');

        // Assert - error
        expect(actualError).toHaveProperty('status', 'error');
        expect(Array.isArray(actualError.errors)).toBe(true);
        expect(actualError).toHaveProperty('summary');
      });
    });
  });

  describe('HarnessApiResponseContract の読取専用（frozen）検証', () => {
    context('HarnessApiResponseMapper で contract に変換した場合', () => {
      it('IT-API-SharedKernel-002: Object.isFrozen(contract)=true になり、contract のプロパティへの書き込み試行が TypeError または無視されること', () => {
        // Arrange
        const response = HarnessApiResponse.pass({ result: 'ok' });
        const mapper = new HarnessApiResponseMapper();

        // Act
        const actual = mapper.toContract(response);

        // Assert
        expect(Object.isFrozen(actual)).toBe(true);

        // プロパティへの書き込みが無視される（strict モードでは TypeError）ことを確認
        const assignAttempt = () => {
          (actual as any).status = 'fail';
        };
        // strict モードでは TypeError が発生し、非 strict モードでは無視される
        // いずれの場合も元の値が変わらないことを確認
        try {
          assignAttempt();
        } catch {
          // TypeError は許容
        }
        expect(actual.status).toBe('pass');
      });
    });
  });

  describe('具体化型の HarnessApiResponse<T> 型パラメータ検証', () => {
    context('各コマンド応答の Data 型を設定した HarnessApiResponse の場合', () => {
      it('IT-API-SharedKernel-003: TypeScript 型検証（コンパイル時）が通過し、data フィールドの型が指定通りであること', () => {
        // Arrange
        // CheckReadyResponse 型の data を持つ HarnessApiResponse
        type CheckReadyData = { allPassed: boolean; stories: { storyId: string; passed: boolean }[] };
        const checkReadyResponse = HarnessApiResponse.pass<CheckReadyData>({
          allPassed: true,
          stories: [{ storyId: 'H09-01', passed: true }],
        });

        // CiCheckResponse 型の data を持つ HarnessApiResponse
        type CiCheckData = { allPassed: boolean; validatorResults: { validatorId: string; passed: boolean }[] };
        const ciCheckResponse = HarnessApiResponse.pass<CiCheckData>({
          allPassed: true,
          validatorResults: [{ validatorId: 'L3-001', passed: true }],
        });

        // Act
        const actualCheckReady = checkReadyResponse.toJSON();
        const actualCiCheck = ciCheckResponse.toJSON();

        // Assert - data フィールドの型が指定通りであること（TypeScript が型チェック済み）
        expect(actualCheckReady.data).toBeDefined();
        expect(actualCheckReady.data!.allPassed).toBe(true);
        expect(Array.isArray(actualCheckReady.data!.stories)).toBe(true);

        expect(actualCiCheck.data).toBeDefined();
        expect(actualCiCheck.data!.allPassed).toBe(true);
        expect(Array.isArray(actualCiCheck.data!.validatorResults)).toBe(true);
      });
    });
  });
});
```

---

## 7. テスト実行コマンド

### 7.1 全統合テスト実行（harness-api）

```bash
# harness-api 統合テストのみ実行
npx vitest run scripts/harness/__tests__/integration/harness-api/

# ウォッチモード（開発中）
npx vitest scripts/harness/__tests__/integration/harness-api/
```

### 7.2 テストグループ別実行

```bash
# Handler テストのみ
npx vitest run scripts/harness/__tests__/integration/harness-api/check-ready-handler.test.ts \
  scripts/harness/__tests__/integration/harness-api/check-phase-handler.test.ts \
  scripts/harness/__tests__/integration/harness-api/ci-check-handler.test.ts \
  scripts/harness/__tests__/integration/harness-api/detect-drift-handler.test.ts \
  scripts/harness/__tests__/integration/harness-api/status-handler.test.ts \
  scripts/harness/__tests__/integration/harness-api/lint-handler.test.ts \
  scripts/harness/__tests__/integration/harness-api/complete-check-handler.test.ts \
  scripts/harness/__tests__/integration/harness-api/impact-analysis-handler.test.ts

# Cross-Layer 統合テストのみ
npx vitest run scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts \
  scripts/harness/__tests__/integration/harness-api/status-derivation-integration.test.ts \
  scripts/harness/__tests__/integration/harness-api/shared-kernel-contract.test.ts

# D5 ルール検証テストのみ（StatusHandler）
npx vitest run scripts/harness/__tests__/integration/harness-api/status-handler.test.ts \
  --reporter=verbose
```

### 7.3 特定ケースの実行

```bash
# IT-API-Status-003 (D5 ルール) のみ実行
npx vitest run scripts/harness/__tests__/integration/harness-api/status-handler.test.ts \
  -t "D5ルール"

# SharedKernel Contract 検証のみ
npx vitest run scripts/harness/__tests__/integration/harness-api/shared-kernel-contract.test.ts \
  --reporter=verbose
```

### 7.4 テスト実行設定（vitest.config.ts 抜粋）

統合テストは `vitest.config.ts` の `integration` プロジェクト設定で実行される。

| 設定項目 | 値 | 備考 |
|---------|---|------|
| タイムアウト | 10000ms | ファイルシステムアクセスを含む Handler テストに対応 |
| テストパターン | `**/__tests__/integration/**/*.test.ts` | 統合テスト対象パス |
| globals | true | `describe`/`it`/`expect` のグローバルインポート |
| environment | node | CLI ツールのため Node.js 環境を使用 |

### 7.5 カバレッジ計測

```bash
# harness-api 統合テストのカバレッジ計測
npx vitest run --coverage \
  scripts/harness/__tests__/integration/harness-api/

# カバレッジ対象ソース（presentation レイヤー）
# --coverage.include="scripts/harness/harness-api/presentation/**/*.ts"
```

### 7.6 Wave 2 スタブ確認コマンド

```bash
# @stub: wave2-pending コメントが付いたテストを一覧表示
grep -rn "@stub: wave2-pending" \
  scripts/harness/__tests__/integration/harness-api/
```
