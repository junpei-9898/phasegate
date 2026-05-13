# ITテストロジック設計: validator-system

@story-id H08-01
@story-id H08-02
@story-id H08-03
@story-id H08-04
@story-id H08-05
@story-id H08-06
## 1. テストファイル構成

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/validator-system/usecases/run-l2-validators-usecase.test.ts` | RunL2ValidatorsUseCase | 7 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-l3-validators-usecase.test.ts` | RunL3ValidatorsUseCase | 7 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts` | RunL4ValidatorsUseCase | 6 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-quick-mode-usecase.test.ts` | RunQuickModeUseCase | 5 |
| `scripts/harness/__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts` | AggregateValidationResultsUseCase | 8 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-full-validation-usecase.test.ts` | RunFullValidationUseCase | 5 |
| `scripts/harness/__tests__/integration/validator-system/adapters/harness-config-validator-config-adapter.test.ts` | HarnessConfigValidatorConfigAdapter | 8 |
| `scripts/harness/__tests__/integration/validator-system/adapters/phase-dependency-phase-gate-policy-adapter.test.ts` | PhaseDependencyPhaseGatePolicyAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/traceability-metadata-policy-adapter.test.ts` | TraceabilityMetadataPolicyAdapter | 6 |
| `scripts/harness/__tests__/integration/validator-system/adapters/biome-ast-test-quality-analyzer-adapter.test.ts` | BiomeAstTestQualityAnalyzerAdapter | 7 |
| `scripts/harness/__tests__/integration/validator-system/adapters/file-system-security-pattern-scanner-adapter.test.ts` | FileSystemSecurityPatternScannerAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/ast-performance-scanner-adapter.test.ts` | AstPerformanceScannerAdapter | 3 |
| `scripts/harness/__tests__/integration/validator-system/adapters/json-coverage-report-adapter.test.ts` | JsonCoverageReportAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/nyquist-ac-coverage-policy-adapter.test.ts` | NyquistAcCoveragePolicyAdapter | 2 |
| `scripts/harness/__tests__/integration/validator-system/adapters/markdown-design-document-adapter.test.ts` | MarkdownDesignDocumentAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/biome-ast-source-code-analyzer-adapter.test.ts` | BiomeAstSourceCodeAnalyzerAdapter | 2 |
| `scripts/harness/__tests__/integration/validator-system/adapters/import-graph-source-analysis-adapter.test.ts` | ImportGraphSourceAnalysisAdapter | 2 |
| `scripts/harness/__tests__/integration/validator-system/adapters/adr-foundation-reference-adapter.test.ts` | AdrFoundationReferenceAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/handlers/run-validators-handler.test.ts` | RunValidatorsHandler | 10 |
| `scripts/harness/__tests__/integration/validator-system/handlers/run-quick-mode-handler.test.ts` | RunQuickModeHandler | 7 |
| `scripts/harness/__tests__/integration/validator-system/handlers/report-validation-results-handler.test.ts` | ReportValidationResultsHandler | 5 |

---

## 2. テストヘルパー・シードデータ

### 2.1 共通ファクトリ・ヘルパー

```ts
// scripts/harness/__tests__/integration/validator-system/helpers.ts

function createLayerConfig(layer: 'L2' | 'L3' | 'L4', overrides?: Partial<LayerConfig>): LayerConfig {
  return {
    layer,
    enabled: true,
    validatorIds: layer === 'L2' ? ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015']
                : layer === 'L3' ? ['L3-001', 'L3-002', 'L3-003', 'L3-004']
                : ['L4-001', 'L4-002', 'L4-003'],
    thresholds: layer === 'L3' ? { coverageThreshold: 90, bundleSizeLimit: 512000 } : {},
    strictOnly: false,
    ...overrides,
  };
}

function createValidationResultContract(overrides?: Partial<ValidationResultContract>): ValidationResultContract {
  return {
    validatorId: 'L2-001',
    passed: true,
    errors: [],
    durationMs: 10,
    skipped: false,
    ...overrides,
  };
}

function createAggregatedReport(overrides?: Partial<AggregatedValidationReport>): AggregatedValidationReport {
  return {
    overallPassed: true,
    totalValidators: 3,
    failedValidators: 0,
    skippedValidators: 0,
    allErrors: [],
    errorsByLayer: { L2: 0, L3: 0, L4: 0 },
    ...overrides,
  };
}

function createRelaxationProfile(overrides?: Partial<RelaxationProfile>): RelaxationProfile {
  return {
    l2: { maintained: ['L2-002'], skipped: ['L2-001', 'L2-003'] },
    l3: { maintained: [], skipped: ['L3-001', 'L3-002', 'L3-003', 'L3-004'] },
    l4: { all: false },
    phaseExecution: { twoPhaseRequired: false },
    ...overrides,
  };
}

function captureOutput(run: () => Promise<void>): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // process.stdout.write / process.stderr.write / process.exit をspyでキャプチャして返す
}
```

### 2.2 Portモックパターン

```ts
const mockValidatorConfigPort = {
  getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
};

const mockPhaseGatePolicyPort = {
  checkPrerequisites: vi.fn().mockResolvedValue({ satisfied: true, violations: [] }),
};

const mockMetadataPolicyPort = {
  validateMetadata: vi.fn().mockResolvedValue({ passed: true, errors: [] }),
};

const mockTestQualityAnalyzerPort = {
  analyzeTestFiles: vi.fn().mockResolvedValue([createValidationResultContract()]),
};

const mockSecurityPatternScannerPort = {
  scan: vi.fn().mockResolvedValue({ passed: true, findings: [] }),
};

const mockPerformanceScannerPort = {
  scan: vi.fn().mockResolvedValue({ passed: true, findings: [] }),
};

const mockCoverageReportPort = {
  getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
};

const mockAcCoveragePolicyPort = {
  getPolicy: vi.fn().mockResolvedValue({ check: vi.fn().mockResolvedValue({ passed: true, errors: [] }) }),
};

const mockRunL2UseCase = { execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L2-001' })]) };
const mockRunL3UseCase = { execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L3-001' })]) };
const mockRunL4UseCase = { execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L4-001' })]) };
```

### 2.3 fixtureファイル一覧

| ファイルパス | 内容 |
|---|---|
| `scripts/harness/__tests__/fixtures/validator-system/valid-harness-config.json` | preset="standard"、全L2/L3/L4有効、coverageThreshold=90、bundleSizeLimit=512000 |
| `scripts/harness/__tests__/fixtures/validator-system/strict-harness-config.json` | preset="strict"、全レイヤー有効、strictOnly=true |
| `scripts/harness/__tests__/fixtures/validator-system/minimal-harness-config.json` | preset="minimal"、L3 enabled=false |
| `scripts/harness/__tests__/fixtures/validator-system/valid-metadata-file.ts` | `// @unit harness-error`、`// @layer domain`、`// @story-id H01-01` を含む |
| `scripts/harness/__tests__/fixtures/validator-system/missing-unit-file.ts` | `// @layer domain` のみ（@unitなし） |
| `scripts/harness/__tests__/fixtures/validator-system/valid-test-file.test.ts` | AAAコメント・actual変数・日本語テスト名・describe-it構造を持つ正常テストファイル |
| `scripts/harness/__tests__/fixtures/validator-system/invalid-test-file.test.ts` | `const result = await ...`（actual未使用）、英語テスト名 |
| `scripts/harness/__tests__/fixtures/validator-system/secure-source.ts` | セキュリティ問題なしの通常ソース |
| `scripts/harness/__tests__/fixtures/validator-system/insecure-source.ts` | `const API_KEY = "sk-hardcoded"` を含む |
| `scripts/harness/__tests__/fixtures/validator-system/coverage-summary.json` | Istanbul形式（overallCoverage=92） |
| `scripts/harness/__tests__/fixtures/validator-system/low-coverage-summary.json` | overallCoverage=85 |
| `scripts/harness/__tests__/fixtures/validator-system/domain_model.md` | ADR参照・概念定義を含む最小限のdomain_model.md |
| `scripts/harness/__tests__/fixtures/validator-system/relaxation-profile.json` | l2.maintained=["L2-002"]、l4.all=false |
| `scripts/harness/__tests__/fixtures/validator-system/validation-results.json` | 全passの`ValidationResultContract[]` JSON |

fixtureファクトリ疑似コード:

```ts
// valid-harness-config.json の内容
function createValidHarnessConfigFixture() {
  return {
    preset: 'standard',
    layers: {
      L2: { enabled: true, validators: ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015'] },
      L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'], coverageThreshold: 90, bundleSizeLimit: 512000 },
      L4: { enabled: true, validators: ['L4-001', 'L4-002', 'L4-003'] },
    },
  };
}

// coverage-summary.json の内容
function createCoverageSummaryFixture(overallCoverage = 92) {
  return {
    total: { lines: { pct: overallCoverage }, statements: { pct: overallCoverage }, functions: { pct: overallCoverage }, branches: { pct: overallCoverage } },
    'src/foo.ts': { lines: { pct: overallCoverage } },
  };
}

// relaxation-profile.json の内容
function createRelaxationProfileFixture() {
  return {
    l2: { maintained: ['L2-002'], skipped: ['L2-001', 'L2-003'] },
    l3: { maintained: [], skipped: ['L3-001', 'L3-002', 'L3-003', 'L3-004'] },
    l4: { all: false },
    phaseExecution: { twoPhaseRequired: false },
  };
}

// validation-results.json の内容
function createValidationResultsFixture() {
  return [
    { validatorId: 'L2-001', passed: true, errors: [], durationMs: 10, skipped: false },
    { validatorId: 'L2-002', passed: true, errors: [], durationMs: 8, skipped: false },
    { validatorId: 'L3-001', passed: true, errors: [], durationMs: 15, skipped: false },
  ];
}
```

---

## 3. UseCaseテスト詳細ロジック

### 3.1 RunL2ValidatorsUseCase（7件）

```ts
// @story H08-01
import { target, context } from '../../../helpers/test-helpers';

target('RunL2ValidatorsUseCase', () => {
  describe('全L2バリデータの実行', () => {
    context('validatorIdsを省略した場合', () => {
      // IT-UC-RunL2-001
      it('全L2バリデータ（L2-001〜L2-015）が実行され6件の結果が返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunL2ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetPaths: ['src/foo.ts'], unitName: 'unit-a', currentPhase: 'implementation' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(3);
        expect(actual.map(r => r.validatorId)).toEqual(['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015']);
      });
    });

    context('validatorIdsに["L2-001"]を指定した場合', () => {
      // IT-UC-RunL2-002
      it('L2-001のみが実行され1件の結果が返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunL2ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { validatorIds: ['L2-001'], targetPaths: ['src/foo.ts'], unitName: 'unit-a', currentPhase: 'implementation' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].validatorId).toBe('L2-001');
      });
    });

    context('L2バリデータがfailした場合', () => {
      // IT-UC-RunL2-003
      it('passed=falseかつerrorsを含む結果が返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunL2ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        // ExecutionServiceがL2-002でfail結果を返すよう設定
        const input = { targetPaths: ['src/foo.ts'], unitName: 'unit-a', currentPhase: 'implementation' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const failedResult = actual.find(r => r.validatorId === 'L2-002');
        expect(failedResult?.passed).toBe(false);
        expect(failedResult?.errors).toHaveLength(1);
        expect(failedResult?.errors[0].code).toBe('L2-002');
        expect(failedResult?.errors[0].severity).toBe('error');
      });
    });

    context('LayerConfig.enabled=falseの場合', () => {
      // IT-UC-RunL2-004
      it('全L2結果がskipped=trueかつpassed=trueで返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2', { enabled: false })),
        };
        const usecase = new RunL2ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetPaths: ['src/foo.ts'], unitName: 'unit-a', currentPhase: 'implementation' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.every(r => r.skipped === true)).toBe(true);
        expect(actual.every(r => r.passed === true)).toBe(true);
        expect(actual.every(r => r.errors.length === 0)).toBe(true);
      });
    });
  });

  describe('異常系', () => {
    context('無効なvalidatorId（"L2-999"）を指定した場合', () => {
      // IT-UC-RunL2-005
      it('InvalidValidatorIdErrorが送出される', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunL2ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { validatorIds: ['L2-999'], targetPaths: [], unitName: 'unit-a', currentPhase: 'impl' };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(InvalidValidatorIdError);
      });
    });

    context('ValidatorConfigPortが例外をthrowした場合', () => {
      // IT-UC-RunL2-006
      it('ValidatorExecutionErrorとして伝播する', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockRejectedValue(new Error('config read failed')),
        };
        const usecase = new RunL2ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetPaths: ['src/foo.ts'], unitName: 'unit-a', currentPhase: 'implementation' };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(ValidatorExecutionError);
      });
    });

    context('targetPathsが空配列の場合', () => {
      // IT-UC-RunL2-007
      it('実行は続行され全バリデータがpassed=trueで返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunL2ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetPaths: [], unitName: 'unit-a', currentPhase: 'impl' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(3);
        expect(actual.every(r => r.passed === true)).toBe(true);
      });
    });
  });
});
```

### 3.2 RunL3ValidatorsUseCase（7件）

```ts
// @story H08-02
import { target, context } from '../../../helpers/test-helpers';

target('RunL3ValidatorsUseCase', () => {
  describe('全L3バリデータの実行', () => {
    context('validatorIdsを省略した場合', () => {
      // IT-UC-RunL3-001
      it('全L3バリデータ（L3-001〜L3-004）が実行され4件の結果が返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L3')),
        };
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
        };
        const usecase = new RunL3ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort, coverageReportPort: mockCoverageReportPort });
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(4);
        expect(actual.every(r => r.passed === true)).toBe(true);
      });
    });

    context('preset="standard"でstrictOnly=falseの場合', () => {
      // IT-UC-RunL3-002
      it('L3-002（performance/strictOnly）がskipped=trueで返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L3', { strictOnly: false })),
        };
        const usecase = new RunL3ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3_002 = actual.find(r => r.validatorId === 'L3-002');
        expect(l3_002?.skipped).toBe(true);
      });
    });

    context('preset="strict"でstrictOnly=trueの場合', () => {
      // IT-UC-RunL3-003
      it('L3-002も実行対象になりskipped=falseで返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L3', { strictOnly: true })),
        };
        const usecase = new RunL3ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3_002 = actual.find(r => r.validatorId === 'L3-002');
        expect(l3_002?.skipped).toBe(false);
      });
    });

    context('LayerConfig.enabled=falseの場合', () => {
      // IT-UC-RunL3-004
      it('空のValidationResultContract[]が返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L3', { enabled: false })),
        };
        const usecase = new RunL3ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('coverageReportPathを指定した場合', () => {
      // IT-UC-RunL3-005
      it('L3-003がそのパスを使用してpassする', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L3')),
        };
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
        };
        const usecase = new RunL3ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort, coverageReportPort: mockCoverageReportPort });
        const input = { targetPaths: ['src/'], coverageReportPath: 'coverage/summary.json' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(4);
        const l3_003 = actual.find(r => r.validatorId === 'L3-003');
        expect(l3_003?.passed).toBe(true);
      });
    });
  });

  describe('異常系', () => {
    context('カバレッジレポートが存在しない場合', () => {
      // IT-UC-RunL3-006
      it('CoverageReportNotFoundErrorが送出される', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L3')),
        };
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockRejectedValue(new CoverageReportNotFoundError('nonexistent/coverage.json')),
        };
        const usecase = new RunL3ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort, coverageReportPort: mockCoverageReportPort });
        const input = { targetPaths: ['src/'], coverageReportPath: 'nonexistent/coverage.json' };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(CoverageReportNotFoundError);
      });
    });

    context('coverageThreshold=90に対してoverallCoverage=75の場合', () => {
      // IT-UC-RunL3-007
      it('L3-003のpassed=falseかつerrorsに現在値（75）と不足分（15）が含まれる', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L3', { thresholds: { coverageThreshold: 90, bundleSizeLimit: 512000 } })),
        };
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 75, perFileCoverage: [] }),
        };
        const usecase = new RunL3ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort, coverageReportPort: mockCoverageReportPort });
        const input = { targetPaths: ['src/'], coverageReportPath: 'coverage/summary.json' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3_003 = actual.find(r => r.validatorId === 'L3-003');
        expect(l3_003?.passed).toBe(false);
        const errorMsg = l3_003?.errors[0].message ?? l3_003?.errors[0].details;
        expect(errorMsg).toContain('75');
        expect(errorMsg).toContain('15');
      });
    });
  });
});
```

### 3.3 RunL4ValidatorsUseCase（6件）

```ts
// @story H08-03
import { target, context } from '../../../helpers/test-helpers';

target('RunL4ValidatorsUseCase', () => {
  describe('全L4バリデータの実行', () => {
    context('validatorIdsを省略しstrictMode=falseの場合', () => {
      // IT-UC-RunL4-001
      it('全L4バリデータ（L4-001〜L4-005）が実行され5件の結果が返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L4')),
        };
        const usecase = new RunL4ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(3);
        expect(actual.every(r => r.passed === true)).toBe(true);
      });
    });

    context('strictMode=falseの場合', () => {
      // IT-UC-RunL4-002
      it('L4-003（dead-code/strictOnly）がskipped=trueで返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L4', { strictOnly: false })),
        };
        const usecase = new RunL4ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4_003 = actual.find(r => r.validatorId === 'L4-003');
        expect(l4_003?.skipped).toBe(true);
      });
    });

    context('targetUnitsに["harness-error"]を指定した場合', () => {
      // IT-UC-RunL4-003
      it('対象Unitのみが検査されL4-001/L4-002がpassed=trueで返る', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L4')),
        };
        const usecase = new RunL4ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { targetUnits: ['harness-error'], strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4_001 = actual.find(r => r.validatorId === 'L4-001');
        const l4_002 = actual.find(r => r.validatorId === 'L4-002');
        expect(l4_001?.passed).toBe(true);
        expect(l4_002?.passed).toBe(true);
      });
    });

    context('L4-001（drift-detect）がfailした場合', () => {
      // IT-UC-RunL4-004
      it('L4-001のpassed=falseかつerrorsにL4-001エラーが含まれる', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L4')),
        };
        // ExecutionServiceがL4-001でfail結果を返すよう設定
        const usecase = new RunL4ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4_001 = actual.find(r => r.validatorId === 'L4-001');
        expect(l4_001?.passed).toBe(false);
        expect(l4_001?.errors[0].code).toBe('L4-001');
      });
    });
  });

  describe('異常系', () => {
    context('設計文書の読み取りが失敗した場合', () => {
      // IT-UC-RunL4-005
      it('DesignDocumentReadErrorが伝播する', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L4')),
        };
        // ExecutionServiceがDesignDocumentReadErrorをthrow
        const usecase = new RunL4ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { strictMode: false };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(DesignDocumentReadError);
      });
    });

    context('AST解析が失敗した場合', () => {
      // IT-UC-RunL4-006
      it('SourceCodeAnalysisErrorが伝播する', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L4')),
        };
        // ExecutionServiceがSourceCodeAnalysisErrorをthrow
        const usecase = new RunL4ValidatorsUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = { strictMode: false };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(SourceCodeAnalysisError);
      });
    });
  });
});
```

### 3.4 RunQuickModeUseCase（5件）

```ts
// @story H08-04
import { target, context } from '../../../helpers/test-helpers';

target('RunQuickModeUseCase', () => {
  describe('緩和プロファイルによる選択実行', () => {
    context('l2.maintained=["L2-002"]のrelaxationProfileを渡した場合', () => {
      // IT-UC-RunQuick-001
      it('L2-002のみが実行されL2-001/L2-003はskipped=trueで返る', async () => {
        // Arrange
        const profile = createRelaxationProfile();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunQuickModeUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = {
          relaxationProfile: profile,
          targetPaths: ['src/'],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l2Results = actual.filter(r => r.validatorId.startsWith('L2'));
        const l2_002 = l2Results.find(r => r.validatorId === 'L2-002');
        const l2_skipped = l2Results.filter(r => r.validatorId !== 'L2-002');
        expect(l2_002?.skipped).toBe(false);
        expect(l2_skipped.every(r => r.skipped === true)).toBe(true);
      });
    });

    context('l4.all=falseのrelaxationProfileを渡した場合', () => {
      // IT-UC-RunQuick-002
      it('L4バリデータが実行されず結果に含まれないかすべてskippedになる', async () => {
        // Arrange
        const profile = createRelaxationProfile({ l4: { all: false } });
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunQuickModeUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = {
          relaxationProfile: profile,
          targetPaths: ['src/'],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4Results = actual.filter(r => r.validatorId.startsWith('L4'));
        expect(l4Results.every(r => r.skipped === true)).toBe(true);
      });
    });

    context('twoPhaseRequired=falseの場合', () => {
      // IT-UC-RunQuick-003
      it('Phase Gate検証がスキップされL2-001がskipped=trueで返る', async () => {
        // Arrange
        const profile = createRelaxationProfile({ phaseExecution: { twoPhaseRequired: false } });
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunQuickModeUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = {
          relaxationProfile: profile,
          targetPaths: ['src/'],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l2_001 = actual.find(r => r.validatorId === 'L2-001');
        expect(l2_001?.skipped).toBe(true);
      });
    });
  });

  describe('異常系', () => {
    context('relaxationProfile.l4.allがtrue（false以外）の場合', () => {
      // IT-UC-RunQuick-004
      it('InvalidRelaxationProfileErrorが送出される', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunQuickModeUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = {
          relaxationProfile: createRelaxationProfile({ l4: { all: true as never } }),
          targetPaths: ['src/'],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(InvalidRelaxationProfileError);
      });
    });

    context('relaxationProfileがnullの場合', () => {
      // IT-UC-RunQuick-005
      it('InvalidRelaxationProfileErrorが送出される', async () => {
        // Arrange
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
        };
        const usecase = new RunQuickModeUseCase({ validatorConfigPort: mockValidatorConfigPort });
        const input = {
          relaxationProfile: null as never,
          targetPaths: [],
          unitName: '',
          currentPhase: '',
        };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(InvalidRelaxationProfileError);
      });
    });
  });
});
```

### 3.5 AggregateValidationResultsUseCase（8件）

```ts
// @story H08-05
import { target, context } from '../../../helpers/test-helpers';

target('AggregateValidationResultsUseCase', () => {
  describe('集約結果の正確性（モック不要・純粋集約）', () => {
    context('全バリデータがpassの場合', () => {
      // IT-UC-Agg-001
      it('overallPassed=trueかつfailedValidators=0が返る', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = {
          results: [
            createValidationResultContract({ validatorId: 'L2-001', passed: true }),
            createValidationResultContract({ validatorId: 'L2-002', passed: true }),
            createValidationResultContract({ validatorId: 'L3-001', passed: true }),
          ],
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.overallPassed).toBe(true);
        expect(actual.failedValidators).toBe(0);
      });
    });

    context('1件でもfailがある場合', () => {
      // IT-UC-Agg-002
      it('overallPassed=falseかつfailedValidators=1が返る', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = {
          results: [
            createValidationResultContract({
              validatorId: 'L2-002',
              passed: false,
              errors: [{ code: 'L2-002', severity: 'error', message: 'violation', suggestion: '' }],
            }),
          ],
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.overallPassed).toBe(false);
        expect(actual.failedValidators).toBe(1);
      });
    });

    context('skipped=trueの結果がある場合', () => {
      // IT-UC-Agg-003
      it('skippedValidators=1かつoverallPassed=trueが返る', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = {
          results: [
            createValidationResultContract({ validatorId: 'L3-002', passed: true, skipped: true }),
          ],
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.skippedValidators).toBe(1);
        expect(actual.overallPassed).toBe(true);
      });
    });

    context('failOnWarning=trueでwarningのみの結果がある場合', () => {
      // IT-UC-Agg-004
      it('failedValidators=1かつoverallPassed=falseが返る', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = {
          results: [
            createValidationResultContract({
              validatorId: 'L4-003',
              passed: true,
              errors: [{ code: 'L4-003', severity: 'warning', message: 'warning msg', suggestion: '' }],
            }),
          ],
          failOnWarning: true,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.failedValidators).toBe(1);
        expect(actual.overallPassed).toBe(false);
      });
    });

    context('複数レイヤーにまたがるエラーがある場合', () => {
      // IT-UC-Agg-005
      it('errorsByLayerが正確にレイヤー別集計される', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = {
          results: [
            createValidationResultContract({ validatorId: 'L2-001', passed: true }),
            createValidationResultContract({
              validatorId: 'L2-002',
              passed: false,
              errors: [{ code: 'L2-002', severity: 'error', message: 'err', suggestion: '' }],
            }),
            createValidationResultContract({
              validatorId: 'L3-001',
              passed: false,
              errors: [
                { code: 'L3-001', severity: 'error', message: 'err1', suggestion: '' },
                { code: 'L3-001', severity: 'error', message: 'err2', suggestion: '' },
              ],
            }),
          ],
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.errorsByLayer.L2).toBe(1);
        expect(actual.errorsByLayer.L3).toBe(2);
        expect(actual.errorsByLayer.L4).toBe(0);
      });
    });

    context('空の結果配列を受け取った場合', () => {
      // IT-UC-Agg-006
      it('totalValidators=0かつoverallPassed=trueかつallErrors=[]が返る', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = { results: [], failOnWarning: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.totalValidators).toBe(0);
        expect(actual.overallPassed).toBe(true);
        expect(actual.allErrors).toEqual([]);
      });
    });

    context('同一HarnessError.codeが重複している場合', () => {
      // IT-UC-Agg-007
      it('allErrorsに同一codeのエラーが重複しない', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = {
          results: [
            createValidationResultContract({
              validatorId: 'L2-002',
              passed: false,
              errors: [
                { code: 'L2-002', severity: 'error', message: 'dup1', suggestion: '' },
                { code: 'L2-002', severity: 'error', message: 'dup2', suggestion: '' },
              ],
            }),
          ],
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l2_002Errors = actual.allErrors.filter(e => e.code === 'L2-002');
        expect(l2_002Errors).toHaveLength(1);
      });
    });

    context('有効な入力を渡した場合', () => {
      // IT-UC-Agg-008
      it('AggregatedValidationReportがObject.freeze済みである', async () => {
        // Arrange
        const usecase = new AggregateValidationResultsUseCase();
        const input = {
          results: [createValidationResultContract()],
          failOnWarning: false,
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
```

### 3.6 RunFullValidationUseCase（5件）

```ts
// @story H08-06
import { target, context } from '../../../helpers/test-helpers';

target('RunFullValidationUseCase', () => {
  describe('全バリデータの統合実行', () => {
    context('includeL4=trueで全UseCaseがpassの場合', () => {
      // IT-UC-RunFull-001
      it('overallPassed=trueかつtotalValidators=10の統合レポートが返る', async () => {
        // Arrange
        const mockRunL2UseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({ validatorId: 'L2-001' }),
            createValidationResultContract({ validatorId: 'L2-002' }),
            createValidationResultContract({ validatorId: 'L2-003' }),
          ]),
        };
        const mockRunL3UseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({ validatorId: 'L3-001' }),
            createValidationResultContract({ validatorId: 'L3-002' }),
            createValidationResultContract({ validatorId: 'L3-003' }),
            createValidationResultContract({ validatorId: 'L3-004' }),
          ]),
        };
        const mockRunL4UseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({ validatorId: 'L4-001' }),
            createValidationResultContract({ validatorId: 'L4-002' }),
            createValidationResultContract({ validatorId: 'L4-003' }),
          ]),
        };
        const usecase = new RunFullValidationUseCase({ runL2UseCase: mockRunL2UseCase, runL3UseCase: mockRunL3UseCase, runL4UseCase: mockRunL4UseCase });
        const input = { targetPaths: ['src/'], unitName: 'unit-a', currentPhase: 'impl', includeL4: true, failOnWarning: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.overallPassed).toBe(true);
        expect(actual.totalValidators).toBe(10);
      });
    });

    context('includeL4=falseの場合', () => {
      // IT-UC-RunFull-002
      it('L4UseCaseが呼ばれずtotalValidators=7で集計される', async () => {
        // Arrange
        const mockRunL2UseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({ validatorId: 'L2-001' }),
            createValidationResultContract({ validatorId: 'L2-002' }),
            createValidationResultContract({ validatorId: 'L2-003' }),
          ]),
        };
        const mockRunL3UseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({ validatorId: 'L3-001' }),
            createValidationResultContract({ validatorId: 'L3-002' }),
            createValidationResultContract({ validatorId: 'L3-003' }),
            createValidationResultContract({ validatorId: 'L3-004' }),
          ]),
        };
        const mockRunL4UseCase = { execute: vi.fn() };
        const usecase = new RunFullValidationUseCase({ runL2UseCase: mockRunL2UseCase, runL3UseCase: mockRunL3UseCase, runL4UseCase: mockRunL4UseCase });
        const input = { targetPaths: ['src/'], unitName: 'unit-a', currentPhase: 'impl', includeL4: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(mockRunL4UseCase.execute).not.toHaveBeenCalled();
        expect(actual.totalValidators).toBe(7);
      });
    });

    context('L2でfailが発生した場合', () => {
      // IT-UC-RunFull-003
      it('overallPassed=falseかつfailedValidators>=1の統合レポートが返る', async () => {
        // Arrange
        const mockRunL2UseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({
              validatorId: 'L2-001',
              passed: false,
              errors: [{ code: 'L2-001', severity: 'error', message: 'fail', suggestion: '' }],
            }),
          ]),
        };
        const mockRunL3UseCase = {
          execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L3-001' })]),
        };
        const mockRunL4UseCase = {
          execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L4-001' })]),
        };
        const usecase = new RunFullValidationUseCase({ runL2UseCase: mockRunL2UseCase, runL3UseCase: mockRunL3UseCase, runL4UseCase: mockRunL4UseCase });
        const input = { targetPaths: ['src/'], unitName: 'unit-a', currentPhase: 'impl', includeL4: true, failOnWarning: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.overallPassed).toBe(false);
        expect(actual.failedValidators).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('異常系', () => {
    context('RunL2UseCaseが例外をthrowした場合', () => {
      // IT-UC-RunFull-004
      it('ValidatorExecutionErrorが上位に伝播する', async () => {
        // Arrange
        const mockRunL2UseCase = {
          execute: vi.fn().mockRejectedValue(new ValidatorExecutionError('L2 execution failed')),
        };
        const mockRunL3UseCase = { execute: vi.fn() };
        const mockRunL4UseCase = { execute: vi.fn() };
        const usecase = new RunFullValidationUseCase({ runL2UseCase: mockRunL2UseCase, runL3UseCase: mockRunL3UseCase, runL4UseCase: mockRunL4UseCase });
        const input = { targetPaths: ['src/'], unitName: 'unit-a', currentPhase: 'impl', includeL4: true, failOnWarning: false };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(ValidatorExecutionError);
      });
    });

    context('RunL3UseCaseが例外をthrowした場合', () => {
      // IT-UC-RunFull-005
      it('部分成功を認めずValidatorExecutionErrorが全体に伝播する', async () => {
        // Arrange
        const mockRunL2UseCase = {
          execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L2-001' })]),
        };
        const mockRunL3UseCase = {
          execute: vi.fn().mockRejectedValue(new ValidatorExecutionError('L3 execution failed')),
        };
        const mockRunL4UseCase = { execute: vi.fn() };
        const usecase = new RunFullValidationUseCase({ runL2UseCase: mockRunL2UseCase, runL3UseCase: mockRunL3UseCase, runL4UseCase: mockRunL4UseCase });
        const input = { targetPaths: ['src/'], unitName: 'unit-a', currentPhase: 'impl', includeL4: true, failOnWarning: false };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(ValidatorExecutionError);
      });
    });
  });
});
```

---

## 4. Infrastructure Adapterテスト詳細ロジック

### 4.1 HarnessConfigValidatorConfigAdapter（8件）

```ts
// @story H08-01
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/config-foundation');

target('HarnessConfigValidatorConfigAdapter', () => {
  describe('getLayerConfig', () => {
    context('valid-harness-config.json（preset="standard"）が存在する場合', () => {
      // IT-REPO-HCAdapter-001
      it('getLayerConfig("L2")がLayerConfig{enabled:true, validatorIds:[L2-001,L2-002,L2-003]}を返す', async () => {
        // Arrange
        const configPath = 'scripts/harness/__tests__/fixtures/validator-system/valid-harness-config.json';
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath });

        // Act
        const actual = await adapter.getLayerConfig('L2');

        // Assert
        expect(actual.layer).toBe('L2');
        expect(actual.enabled).toBe(true);
        expect(actual.validatorIds).toEqual(['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015']);
        expect(actual.strictOnly).toBe(false);
      });

      // IT-REPO-HCAdapter-002
      it('getLayerConfig("L3")がcoverageThreshold=90を含むLayerConfigを返す', async () => {
        // Arrange
        const configPath = 'scripts/harness/__tests__/fixtures/validator-system/valid-harness-config.json';
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.layer).toBe('L3');
        expect(actual.thresholds.coverageThreshold).toBe(90);
        expect(actual.strictOnly).toBe(false);
      });

      // IT-REPO-HCAdapter-003
      it('getLayerConfig("L4")がenabled=trueのLayerConfigを返す', async () => {
        // Arrange
        const configPath = 'scripts/harness/__tests__/fixtures/validator-system/valid-harness-config.json';
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath });

        // Act
        const actual = await adapter.getLayerConfig('L4');

        // Assert
        expect(actual.layer).toBe('L4');
        expect(actual.enabled).toBe(true);
      });
    });

    context('strict-harness-config.json（preset="strict"）の場合', () => {
      // IT-REPO-HCAdapter-004
      it('getLayerConfig("L3")がstrictOnly=trueを返す', async () => {
        // Arrange
        const configPath = 'scripts/harness/__tests__/fixtures/validator-system/strict-harness-config.json';
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.strictOnly).toBe(true);
      });
    });

    context('minimal-harness-config.json（preset="minimal"）の場合', () => {
      // IT-REPO-HCAdapter-005
      it('getLayerConfig("L3")がenabled=falseを返す', async () => {
        // Arrange
        const configPath = 'scripts/harness/__tests__/fixtures/validator-system/minimal-harness-config.json';
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.enabled).toBe(false);
      });
    });

    context('bundleSizeLimit=512000が設定されている場合', () => {
      // IT-REPO-HCAdapter-006
      it('getLayerConfig("L3")のthresholds.bundleSizeLimit=512000が返る', async () => {
        // Arrange
        const configPath = 'scripts/harness/__tests__/fixtures/validator-system/valid-harness-config.json';
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.thresholds.bundleSizeLimit).toBe(512000);
      });
    });

    context('phasegate.config.jsonが存在しない場合', () => {
      // IT-REPO-HCAdapter-007
      it('HarnessConfigReadError相当のエラーがthrowされる', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath: '/nonexistent/phasegate.config.json' });

        // Act & Assert
        await expect(adapter.getLayerConfig('L2')).rejects.toThrow();
      });
    });

    context('phasegate.config.jsonが不正なJSONの場合', () => {
      // IT-REPO-HCAdapter-008
      it('パースエラーがthrowされる', async () => {
        // Arrange
        const tmpPath = await writeTmpFile('{ invalid json }');
        const adapter = new HarnessConfigValidatorConfigAdapter({ configPath: tmpPath });

        // Act & Assert
        await expect(adapter.getLayerConfig('L2')).rejects.toThrow();

        // Cleanup
        await removeTmpFile(tmpPath);
      });
    });
  });
});
```

### 4.2 PhaseDependencyPhaseGatePolicyAdapter（4件）

```ts
// @story H08-01
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/phase-dependency-model');

target('PhaseDependencyPhaseGatePolicyAdapter', () => {
  describe('checkPrerequisites', () => {
    context('Level 1/2のPlan文書が存在し前提条件を満たす場合', () => {
      // IT-REPO-PhaseGate-001
      it('satisfied=trueかつviolations=[]が返る', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.checkPrerequisites).mockResolvedValue({ satisfied: true, violations: [] });
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'validator-system', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(actual.satisfied).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });

    context('Level 2のPlan文書が存在しない場合', () => {
      // IT-REPO-PhaseGate-002
      it('satisfied=falseかつviolations[0].code="L2-001"が返る', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.checkPrerequisites).mockResolvedValue({
          satisfied: false,
          violations: [{ code: 'L2-001', severity: 'error', message: 'Missing plan document' }],
        });
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'unknown-unit', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(actual.satisfied).toBe(false);
        expect(actual.violations[0].code).toBe('L2-001');
        expect(actual.violations[0].severity).toBe('error');
      });
    });

    context('Level 1のPlan文書も存在しない場合', () => {
      // IT-REPO-PhaseGate-003
      it('satisfied=falseかつviolationsに違反が返る', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.checkPrerequisites).mockResolvedValue({
          satisfied: false,
          violations: [{ code: 'L2-001', severity: 'error', message: 'Missing L1 plan document' }],
        });
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'validator-system', currentPhase: 'implementation' };

        // Act
        const actual = await adapter.checkPrerequisites(input);

        // Assert
        expect(actual.satisfied).toBe(false);
        expect(actual.violations.length).toBeGreaterThan(0);
      });
    });

    context('phase-dependency-modelが例外をthrowした場合', () => {
      // IT-REPO-PhaseGate-004
      it('エラーが伝播する', async () => {
        // Arrange
        vi.mocked(phaseDependencyModel.checkPrerequisites).mockRejectedValue(new Error('phase-dependency error'));
        const adapter = new PhaseDependencyPhaseGatePolicyAdapter();
        const input = { unitName: 'validator-system', currentPhase: 'implementation' };

        // Act & Assert
        await expect(adapter.checkPrerequisites(input)).rejects.toThrow();
      });
    });
  });
});
```

### 4.3 TraceabilityMetadataPolicyAdapter（6件）

```ts
// @story H08-02
import { target, context } from '../../../../helpers/test-helpers';

target('TraceabilityMetadataPolicyAdapter', () => {
  describe('validateMetadata', () => {
    context('@unitと@layerが正しく記載されたファイルの場合', () => {
      // IT-REPO-Meta-001
      it('passed=trueかつerrors=[]が返る', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @unit harness-error\n// @layer domain\nexport class Foo {}',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });
    });

    context('@unitコメントがないファイルの場合', () => {
      // IT-REPO-Meta-002
      it('passed=falseかつerrors[0].code="L2-002"が返る', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @layer domain\nexport class Foo {}',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0].code).toBe('L2-002');
      });
    });

    context('@layerコメントがないファイルの場合', () => {
      // IT-REPO-Meta-003
      it('passed=falseかつerrors[0].code="L2-002"が返る', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @unit harness-error\nexport class Foo {}',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0].code).toBe('L2-002');
      });
    });

    context('@story-idがHXX-XX形式でない場合（US-001）', () => {
      // IT-REPO-Meta-004
      it('passed=falseかつerrors[0].code="L2-002"が返る', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @unit x\n// @layer domain\n// @story-id US-001\n',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0].code).toBe('L2-002');
      });
    });

    context('バイナリファイル（.png）の場合', () => {
      // IT-REPO-Meta-005
      it('passed=trueかつerrors=[]が返る（スキップ）', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = { filePath: 'assets/logo.png', fileContent: '...' };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });
    });

    context('テストファイルの@story H01-01形式が正しい場合', () => {
      // IT-REPO-Meta-006
      it('passed=trueが返る', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: '__tests__/foo.test.ts',
          fileContent: '// @story H01-01\ndescribe("test", () => {})',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(true);
      });
    });
  });
});
```

### 4.4 BiomeAstTestQualityAnalyzerAdapter（7件）

```ts
// @story H08-01
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/biome-ast-engine');

target('BiomeAstTestQualityAnalyzerAdapter', () => {
  describe('analyzeTestFiles', () => {
    context('AAAコメントが全て揃ったテストファイルの場合', () => {
      // IT-REPO-TestQuality-001
      it('results[0].passed=trueかつviolations=[]が返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeTestFile).mockResolvedValue({ violations: [] });
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = { targetPaths: ['tests/valid.test.ts'] };

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual[0].passed).toBe(true);
        expect(actual[0].violations).toHaveLength(0);
      });
    });

    context('"result"変数を使っているファイルの場合', () => {
      // IT-REPO-TestQuality-002
      it('results[0].passed=falseかつviolationsにL2-003エラーが返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeTestFile).mockResolvedValue({
          violations: [{ rule: 'no-result-variable', code: 'L2-003', severity: 'error' }],
        });
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = { targetPaths: ['tests/invalid.test.ts'] };

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual[0].passed).toBe(false);
        const l2_003 = actual[0].violations.find(v => v.code === 'L2-003');
        expect(l2_003).toBeDefined();
      });
    });

    context('1テストに複数Actがあるファイルの場合', () => {
      // IT-REPO-TestQuality-003
      it('results[0].passed=falseかつviolationsにL2-003エラー（single-act違反）が返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeTestFile).mockResolvedValue({
          violations: [{ rule: 'single-act', code: 'L2-003', severity: 'error' }],
        });
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = { targetPaths: ['tests/multi-act.test.ts'] };

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual[0].passed).toBe(false);
        const singleAct = actual[0].violations.find(v => v.rule === 'single-act');
        expect(singleAct).toBeDefined();
      });
    });

    context('英語テスト名を使っているファイルの場合', () => {
      // IT-REPO-TestQuality-004
      it('results[0].passed=falseが返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeTestFile).mockResolvedValue({
          violations: [{ rule: 'japanese-test-name', code: 'L2-003', severity: 'error' }],
        });
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = { targetPaths: ['tests/english.test.ts'] };

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual[0].passed).toBe(false);
      });
    });

    context('targetPathsが空の場合', () => {
      // IT-REPO-TestQuality-005
      it('results=[]が返る', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = { targetPaths: [] };

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('Domain層オブジェクトをモックしているテストの場合', () => {
      // IT-REPO-TestQuality-006
      it('results[0].passed=falseかつviolationsにL2-003エラー（no-domain-mock違反）が返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeTestFile).mockResolvedValue({
          violations: [{ rule: 'no-domain-mock', code: 'L2-003', severity: 'error' }],
        });
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = { targetPaths: ['tests/bad-mock.test.ts'] };

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual[0].passed).toBe(false);
        const noDomainMock = actual[0].violations.find(v => v.rule === 'no-domain-mock');
        expect(noDomainMock).toBeDefined();
      });
    });

    context('beforeEachでDB直接操作などシードパターン違反を含むファイルの場合', () => {
      // IT-REPO-TestQuality-007
      it('results[0].passed=falseかつviolationsにL2-003エラー（E2E seed pattern違反）が返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeTestFile).mockResolvedValue({
          violations: [{ rule: 'no-e2e-seed-pattern', code: 'L2-003', severity: 'error' }],
        });
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = { targetPaths: ['tests/e2e-bad.test.ts'] };

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual[0].passed).toBe(false);
        const seedViolation = actual[0].violations.find(v => v.rule === 'no-e2e-seed-pattern');
        expect(seedViolation).toBeDefined();
      });
    });
  });
});
```

### 4.5 FileSystemSecurityPatternScannerAdapter（4件）

```ts
// @story H08-02
import { target, context } from '../../../../helpers/test-helpers';

target('FileSystemSecurityPatternScannerAdapter', () => {
  describe('scan', () => {
    context('セキュリティ問題のないファイル群の場合', () => {
      // IT-REPO-Security-001
      it('passed=trueかつfindings=[]が返る', async () => {
        // Arrange
        const fixturePath = 'scripts/harness/__tests__/fixtures/validator-system/secure-source.ts';
        const adapter = new FileSystemSecurityPatternScannerAdapter();
        const input = { targetPaths: [fixturePath] };

        // Act
        const actual = await adapter.scan(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.findings).toHaveLength(0);
      });
    });

    context('ハードコードされたAPIキーを含むファイルの場合', () => {
      // IT-REPO-Security-002
      it('passed=falseかつfindings[0].code="L3-001"が返る', async () => {
        // Arrange
        const fixturePath = 'scripts/harness/__tests__/fixtures/validator-system/insecure-source.ts';
        const adapter = new FileSystemSecurityPatternScannerAdapter();
        const input = { targetPaths: [fixturePath] };

        // Act
        const actual = await adapter.scan(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.findings[0].code).toBe('L3-001');
        expect(actual.findings[0].severity).toBe('error');
      });
    });

    context('SQLインジェクション脆弱パターンを含むファイルの場合', () => {
      // IT-REPO-Security-003
      it('passed=falseかつfindings[0].code="L3-001"が返る', async () => {
        // Arrange
        const tmpPath = await writeTmpFile('const q = `SELECT * FROM users WHERE id = ${userId}`;');
        const adapter = new FileSystemSecurityPatternScannerAdapter();
        const input = { targetPaths: [tmpPath] };

        // Act
        const actual = await adapter.scan(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.findings[0].code).toBe('L3-001');

        // Cleanup
        await removeTmpFile(tmpPath);
      });
    });

    context('複数ファイルにわたるスキャンの場合', () => {
      // IT-REPO-Security-004
      it('findings[0]のmessageに問題ファイルのパスが含まれる', async () => {
        // Arrange
        const securePath = 'scripts/harness/__tests__/fixtures/validator-system/secure-source.ts';
        const insecurePath = 'scripts/harness/__tests__/fixtures/validator-system/insecure-source.ts';
        const adapter = new FileSystemSecurityPatternScannerAdapter();
        const input = { targetPaths: [insecurePath, securePath] };

        // Act
        const actual = await adapter.scan(input);

        // Assert
        expect(actual.findings[0].message).toContain('insecure-source.ts');
      });
    });
  });
});
```

### 4.6 AstPerformanceScannerAdapter（3件）

```ts
// @story H08-02
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/biome-ast-engine');

target('AstPerformanceScannerAdapter', () => {
  describe('scan', () => {
    context('パフォーマンス問題のないファイル群の場合', () => {
      // IT-REPO-Perf-001
      it('passed=trueかつfindings=[]が返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.scanPerformance).mockResolvedValue({ violations: [] });
        const adapter = new AstPerformanceScannerAdapter();
        const input = { targetPaths: ['src/clean.ts'], thresholds: { bundleSizeLimit: 512000 } };

        // Act
        const actual = await adapter.scan(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.findings).toHaveLength(0);
      });
    });

    context('ループ内awaitを含むファイルの場合', () => {
      // IT-REPO-Perf-002
      it('passed=falseかつfindings[0].code="L3-002"が返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.scanPerformance).mockResolvedValue({
          violations: [{ rule: 'no-await-in-loop', code: 'L3-002', severity: 'error' }],
        });
        const adapter = new AstPerformanceScannerAdapter();
        const input = { targetPaths: ['src/slow.ts'], thresholds: {} };

        // Act
        const actual = await adapter.scan(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.findings[0].code).toBe('L3-002');
      });
    });

    context('strictOnly=falseの環境の場合', () => {
      // IT-REPO-Perf-003
      it('bundleSizeLimitに関するfindingsが含まれない', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.scanPerformance).mockResolvedValue({ violations: [] });
        const adapter = new AstPerformanceScannerAdapter({ strictOnly: false });
        const input = { targetPaths: ['src/'], thresholds: { bundleSizeLimit: 1 } };

        // Act
        const actual = await adapter.scan(input);

        // Assert
        const bundleFindings = actual.findings.filter(f => f.rule === 'bundle-size-limit');
        expect(bundleFindings).toHaveLength(0);
      });
    });
  });
});
```

### 4.7 JsonCoverageReportAdapter（4件）

```ts
// @story H08-02
import { target, context } from '../../../../helpers/test-helpers';

target('JsonCoverageReportAdapter', () => {
  describe('getCoverage', () => {
    context('coverage-summary.json（overallCoverage=92）が存在する場合', () => {
      // IT-REPO-Coverage-001
      it('overallCoverage=92のカバレッジデータが返る', async () => {
        // Arrange
        const fixturePath = 'scripts/harness/__tests__/fixtures/validator-system/coverage-summary.json';
        const adapter = new JsonCoverageReportAdapter({ reportPath: fixturePath });

        // Act
        const actual = await adapter.getCoverage();

        // Assert
        expect(actual.overallCoverage).toBe(92);
        expect(actual.perFileCoverage).toBeDefined();
      });
    });

    context('coverage-summary.json（overallCoverage=85）の場合', () => {
      // IT-REPO-Coverage-002
      it('overallCoverage=85が値として返る（閾値判定はUseCase側）', async () => {
        // Arrange
        const fixturePath = 'scripts/harness/__tests__/fixtures/validator-system/low-coverage-summary.json';
        const adapter = new JsonCoverageReportAdapter({ reportPath: fixturePath });

        // Act
        const actual = await adapter.getCoverage();

        // Assert
        expect(actual.overallCoverage).toBe(85);
      });
    });

    context('カバレッジレポートファイルが存在しない場合', () => {
      // IT-REPO-Coverage-003
      it('CoverageReportNotFoundErrorがthrowされる', async () => {
        // Arrange
        const adapter = new JsonCoverageReportAdapter({ reportPath: '/nonexistent/coverage.json' });

        // Act & Assert
        await expect(adapter.getCoverage()).rejects.toThrow(CoverageReportNotFoundError);
      });
    });

    context('不正なJSONフォーマットの場合', () => {
      // IT-REPO-Coverage-004
      it('パースエラーがthrowされる', async () => {
        // Arrange
        const tmpPath = await writeTmpFile('{ invalid json }');
        const adapter = new JsonCoverageReportAdapter({ reportPath: tmpPath });

        // Act & Assert
        await expect(adapter.getCoverage()).rejects.toThrow();

        // Cleanup
        await removeTmpFile(tmpPath);
      });
    });
  });
});
```

### 4.8 NyquistAcCoveragePolicyAdapter（2件）

```ts
// @story H08-02
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/nyquist-validation');

target('NyquistAcCoveragePolicyAdapter', () => {
  describe('getPolicy', () => {
    context('nyquist-validationが有効なpolicyを返す場合', () => {
      // IT-REPO-Nyquist-001
      it('policy.checkメソッドが存在するインスタンスが返る', async () => {
        // Arrange
        vi.mocked(nyquistValidation.createPolicy).mockReturnValue({
          check: vi.fn().mockResolvedValue({ passed: true, errors: [] }),
        });
        const adapter = new NyquistAcCoveragePolicyAdapter();

        // Act
        const actual = await adapter.getPolicy();

        // Assert
        expect(typeof actual.check).toBe('function');
      });
    });

    context('返されたpolicyのcheck()でRequirementTestMatrix（全AC網羅済み）を渡す場合', () => {
      // IT-REPO-Nyquist-002
      it('passed=trueかつerrors=[]が返る', async () => {
        // Arrange
        const mockCheck = vi.fn().mockResolvedValue({ passed: true, errors: [] });
        vi.mocked(nyquistValidation.createPolicy).mockReturnValue({ check: mockCheck });
        const adapter = new NyquistAcCoveragePolicyAdapter();
        const policy = await adapter.getPolicy();
        const matrix = { requirements: ['AC-001', 'AC-002'], coveredBy: ['test-1', 'test-2'] };

        // Act
        const actual = await policy.check(matrix);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });
    });
  });
});
```

### 4.9 MarkdownDesignDocumentAdapter（4件）

```ts
// @story H08-03
import { target, context } from '../../../../helpers/test-helpers';

target('MarkdownDesignDocumentAdapter', () => {
  describe('loadDesignDocuments', () => {
    context('domain_model.mdが存在するharness-errorを指定した場合', () => {
      // IT-REPO-DesignDoc-001
      it('conceptsに"HarnessError"等のクラス名が含まれる', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter({ docsBasePath: 'docs/product/construction' });
        const input = { targetUnits: ['harness-error'] };

        // Act
        const actual = await adapter.loadDesignDocuments(input);

        // Assert
        expect(actual[0].concepts.some(c => c.includes('HarnessError'))).toBe(true);
      });
    });

    context('ADR参照（ADR-001等）がdomain_model.mdに含まれる場合', () => {
      // IT-REPO-DesignDoc-002
      it('adrRefsに"ADR-001"が含まれる', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter({ docsBasePath: 'docs/product/construction' });
        const input = { targetUnits: ['harness-error'] };

        // Act
        const actual = await adapter.loadDesignDocuments(input);

        // Assert
        expect(actual[0].adrRefs).toContain('ADR-001');
      });
    });

    context('同一Unit文書を2回読み取る場合', () => {
      // IT-REPO-DesignDoc-003
      it('ファイルI/Oが1回のみ実行される（キャッシュ）', async () => {
        // Arrange
        const readFileSpy = vi.spyOn(fs, 'readFile');
        const adapter = new MarkdownDesignDocumentAdapter({ docsBasePath: 'docs/product/construction' });
        const input = { targetUnits: ['harness-error'] };

        // Act
        await adapter.loadDesignDocuments(input);
        await adapter.loadDesignDocuments(input);

        // Assert
        const callCount = readFileSpy.mock.calls.filter(c => String(c[0]).includes('harness-error')).length;
        expect(callCount).toBe(1);
      });
    });

    context('存在しないUnitを指定した場合', () => {
      // IT-REPO-DesignDoc-004
      it('空配列が返る', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter({ docsBasePath: 'docs/product/construction' });
        const input = { targetUnits: ['nonexistent-unit'] };

        // Act
        const actual = await adapter.loadDesignDocuments(input);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });
});
```

### 4.10 BiomeAstSourceCodeAnalyzerAdapter（2件）

```ts
// @story H08-03
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/biome-ast-engine');

target('BiomeAstSourceCodeAnalyzerAdapter', () => {
  describe('analyzeExports', () => {
    context('harness-errorのtsファイルが存在する場合', () => {
      // IT-REPO-SourceAnalyzer-001
      it('exportsに"HarnessError"等のシンボルが含まれる', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeFile).mockResolvedValue({
          exports: ['HarnessError', 'HarnessErrorFactory'],
          imports: [],
        });
        const adapter = new BiomeAstSourceCodeAnalyzerAdapter();
        const input = { targetUnits: ['harness-error'] };

        // Act
        const actual = await adapter.analyzeExports(input);

        // Assert
        expect(actual.exports.some(e => e.includes('HarnessError'))).toBe(true);
      });
    });

    context('tsファイルにimport文が含まれる場合', () => {
      // IT-REPO-SourceAnalyzer-002
      it('importsに対応するsourceが含まれる', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.analyzeFile).mockResolvedValue({
          exports: [],
          imports: [{ source: '../domain/harness-error', symbols: ['HarnessError'] }],
        });
        const adapter = new BiomeAstSourceCodeAnalyzerAdapter();
        const input = { targetUnits: ['harness-error'] };

        // Act
        const actual = await adapter.analyzeExports(input);

        // Assert
        expect(actual.imports.some(i => i.source.includes('harness-error'))).toBe(true);
      });
    });
  });
});
```

### 4.11 ImportGraphSourceAnalysisAdapter（2件）

```ts
// @story H08-03
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/biome-ast-engine');

target('ImportGraphSourceAnalysisAdapter', () => {
  describe('getImportGraph', () => {
    context('biome-ast-engineがImportGraph（nodes/edges）を返す場合', () => {
      // IT-REPO-ImportGraph-001
      it('nodesとedgesにマッピングされたグラフが返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.buildImportGraph).mockResolvedValue({
          nodes: ['src/index.ts', 'src/domain/harness-error.ts'],
          edges: [{ from: 'src/index.ts', to: 'src/domain/harness-error.ts' }],
        });
        const adapter = new ImportGraphSourceAnalysisAdapter();

        // Act
        const actual = await adapter.getImportGraph();

        // Assert
        expect(actual.nodes).toHaveLength(2);
        expect(actual.edges).toHaveLength(1);
      });
    });

    context('biome-ast-engineが空のグラフを返す場合', () => {
      // IT-REPO-ImportGraph-002
      it('nodes=[]かつedges=[]が返る', async () => {
        // Arrange
        vi.mocked(biomeAstEngine.buildImportGraph).mockResolvedValue({ nodes: [], edges: [] });
        const adapter = new ImportGraphSourceAnalysisAdapter();

        // Act
        const actual = await adapter.getImportGraph();

        // Assert
        expect(actual.nodes).toHaveLength(0);
        expect(actual.edges).toHaveLength(0);
      });
    });
  });
});
```

### 4.12 AdrFoundationReferenceAdapter（4件）

```ts
// @story H08-03
import { target, context } from '../../../../helpers/test-helpers';

vi.mock('scripts/harness/shared-kernel/adr-foundation');

target('AdrFoundationReferenceAdapter', () => {
  describe('exists', () => {
    context('存在するADR参照（"ADR-001"）を渡した場合', () => {
      // IT-REPO-AdrRef-001
      it('trueが返る', async () => {
        // Arrange
        vi.mocked(adrFoundation.exists).mockResolvedValue(true);
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.exists('ADR-001');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('存在しないADR参照（"ADR-999"）を渡した場合', () => {
      // IT-REPO-AdrRef-002
      it('falseが返る', async () => {
        // Arrange
        vi.mocked(adrFoundation.exists).mockResolvedValue(false);
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.exists('ADR-999');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('getMetadata', () => {
    context('存在するADR-001のメタデータを取得する場合', () => {
      // IT-REPO-AdrRef-003
      it('adrId・title・statusを含むメタデータが返る', async () => {
        // Arrange
        vi.mocked(adrFoundation.getMetadata).mockResolvedValue({
          adrId: '001',
          title: 'Use Hexagonal Architecture',
          status: 'Accepted',
        });
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.getMetadata('ADR-001');

        // Assert
        expect(actual.adrId).toBe('001');
        expect(actual.title).toBe('Use Hexagonal Architecture');
        expect(actual.status).toBe('Accepted');
      });
    });

    context('status="Deprecated"のADR-005のメタデータを取得する場合', () => {
      // IT-REPO-AdrRef-004
      it('status="Deprecated"のメタデータが返る（warningあり）', async () => {
        // Arrange
        vi.mocked(adrFoundation.getMetadata).mockResolvedValue({
          adrId: '005',
          title: 'Old Decision',
          status: 'Deprecated',
        });
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.getMetadata('ADR-005');

        // Assert
        expect(actual.status).toBe('Deprecated');
      });
    });
  });
});
```

---

## 5. CLIハンドラーテスト詳細ロジック

### 5.1 RunValidatorsHandler（10件）

```ts
// @story H08-01
import { target, context } from '../../../../helpers/test-helpers';

target('RunValidatorsHandler', () => {
  describe('正常系', () => {
    context('--layer all --unit validator-system --phase implementationを渡した場合', () => {
      // IT-API-RunValidators-001
      it('stdout出力ありかつ終了コード0が返る', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: true, totalValidators: 10, failedValidators: 0 })),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'validator-system', '--phase', 'implementation']);

        // Assert
        expect(stdoutSpy).toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
      });
    });

    context('--layer L2 --unit validator-system --phase implementationを渡した場合', () => {
      // IT-API-RunValidators-002
      it('L2バリデータのみ実行され終了コード0が返る', async () => {
        // Arrange
        const mockRunL2UseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({ validatorId: 'L2-001' }),
            createValidationResultContract({ validatorId: 'L2-002' }),
            createValidationResultContract({ validatorId: 'L2-003' }),
          ]),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new RunValidatorsHandler({ runL2UseCase: mockRunL2UseCase });

        // Act
        await handler.handle(['--layer', 'L2', '--unit', 'validator-system', '--phase', 'implementation']);

        // Assert
        expect(mockRunL2UseCase.execute).toHaveBeenCalledTimes(1);
        expect(stdoutSpy).toHaveBeenCalled();
      });
    });

    context('--format ciを渡した場合', () => {
      // IT-API-RunValidators-003
      it('JSON形式でstdout出力される', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({
            overallPassed: true,
            totalValidators: 10,
            failedValidators: 0,
          })),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'unit-a', '--phase', 'impl', '--format', 'ci']);

        // Assert
        const output = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
        const parsed = JSON.parse(output);
        expect(parsed.status).toBe('pass');
        expect(parsed.summary.totalChecks).toBe(10);
        expect(parsed.summary.passed).toBe(10);
        expect(parsed.summary.failed).toBe(0);
      });
    });

    context('--format agentを渡した場合', () => {
      // IT-API-RunValidators-004
      it('AIエージェント向け詳細テキスト形式でstdout出力される', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: true })),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'unit-a', '--phase', 'impl', '--format', 'agent']);

        // Assert
        const output = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
        expect(output.length).toBeGreaterThan(0);
      });
    });

    context('--no-l4フラグを指定した場合', () => {
      // IT-API-RunValidators-005
      it('L4バリデータが実行されずtotalChecks=7が返る', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: true, totalValidators: 7, failedValidators: 0 })),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'unit-a', '--phase', 'impl', '--no-l4', '--format', 'ci']);

        // Assert
        const output = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
        const parsed = JSON.parse(output);
        expect(parsed.summary.totalChecks).toBe(7);
      });
    });
  });

  describe('バリデーションテスト', () => {
    context('--layer invalid-layerを渡した場合', () => {
      // IT-API-RunValidators-006
      it('stderr出力ありかつ終了コード2が設定される', async () => {
        // Arrange
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunValidatorsHandler({});

        // Act
        await handler.handle(['--layer', 'invalid-layer', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });

    context('RunFullValidationUseCaseがValidatorExecutionErrorをthrowした場合', () => {
      // IT-API-RunValidators-007
      it('stderr出力ありかつ終了コード2が設定される', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockRejectedValue(new ValidatorExecutionError('execution failed')),
        };
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('終了コードテスト', () => {
    context('全バリデータがpassした場合', () => {
      // IT-API-RunValidators-008
      it('終了コード0が設定される', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: true, failedValidators: 0 })),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(exitSpy).not.toHaveBeenCalled();
        // または正常終了として exit(0) が呼ばれることを確認
      });
    });

    context('1件以上のバリデータがfailした場合', () => {
      // IT-API-RunValidators-009
      it('終了コード1が設定される', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: false, failedValidators: 2 })),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });

    context('実行エラー（I/O失敗等）が発生した場合', () => {
      // IT-API-RunValidators-010
      it('終了コード2が設定される', async () => {
        // Arrange
        const mockRunFullUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('I/O error')),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

        // Act
        await handler.handle(['--layer', 'all', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });
  });
});
```

### 5.2 RunQuickModeHandler（7件）

```ts
// @story H08-04
import { target, context } from '../../../../helpers/test-helpers';

target('RunQuickModeHandler', () => {
  describe('正常系', () => {
    context('有効なrelaxation-profileを渡した場合', () => {
      // IT-API-RunQuick-001
      it('stdout出力ありかつ終了コード0が返る', async () => {
        // Arrange
        const mockRunQuickUseCase = {
          execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L2-002' })]),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunQuickModeHandler({ runQuickModeUseCase: mockRunQuickUseCase });
        const profile = JSON.stringify(createRelaxationProfileFixture());

        // Act
        await handler.handle(['--relaxation-profile', profile, '--target-paths', 'src/', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(stdoutSpy).toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalledWith(1);
        expect(exitSpy).not.toHaveBeenCalledWith(2);
      });
    });

    context('--format ciを追加した場合', () => {
      // IT-API-RunQuick-002
      it('JSON形式でstdout出力される', async () => {
        // Arrange
        const mockRunQuickUseCase = {
          execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L2-002' })]),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new RunQuickModeHandler({ runQuickModeUseCase: mockRunQuickUseCase });
        const profile = JSON.stringify(createRelaxationProfileFixture());

        // Act
        await handler.handle(['--relaxation-profile', profile, '--target-paths', 'src/', '--unit', 'unit-a', '--phase', 'impl', '--format', 'ci']);

        // Assert
        const output = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
        expect(() => JSON.parse(output)).not.toThrow();
      });
    });
  });

  describe('バリデーションテスト', () => {
    context('--relaxation-profileが省略された場合', () => {
      // IT-API-RunQuick-003
      it('stderr出力ありかつ終了コード2が設定される', async () => {
        // Arrange
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunQuickModeHandler({});

        // Act
        await handler.handle(['--target-paths', 'src/', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });

    context('--relaxation-profileに不正なJSONを渡した場合', () => {
      // IT-API-RunQuick-004
      it('InvalidRelaxationProfileError相当のstderr出力かつ終了コード2が設定される', async () => {
        // Arrange
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunQuickModeHandler({});

        // Act
        await handler.handle(['--relaxation-profile', '{ invalid json }', '--target-paths', 'src/', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('終了コードテスト', () => {
    context('緩和実行後に全バリデータ通過した場合', () => {
      // IT-API-RunQuick-005
      it('終了コード0が設定される', async () => {
        // Arrange
        const mockRunQuickUseCase = {
          execute: vi.fn().mockResolvedValue([createValidationResultContract({ passed: true })]),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunQuickModeHandler({ runQuickModeUseCase: mockRunQuickUseCase });
        const profile = JSON.stringify(createRelaxationProfileFixture());

        // Act
        await handler.handle(['--relaxation-profile', profile, '--target-paths', 'src/', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(exitSpy).not.toHaveBeenCalledWith(1);
        expect(exitSpy).not.toHaveBeenCalledWith(2);
      });
    });

    context('1件以上のバリデータがfailした場合', () => {
      // IT-API-RunQuick-006
      it('終了コード1が設定される', async () => {
        // Arrange
        const mockRunQuickUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidationResultContract({ passed: false, errors: [{ code: 'L2-002', severity: 'error', message: 'fail', suggestion: '' }] }),
          ]),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunQuickModeHandler({ runQuickModeUseCase: mockRunQuickUseCase });
        const profile = JSON.stringify(createRelaxationProfileFixture());

        // Act
        await handler.handle(['--relaxation-profile', profile, '--target-paths', 'src/', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });

    context('プロファイル不正・I/O失敗の場合', () => {
      // IT-API-RunQuick-007
      it('終了コード2が設定される', async () => {
        // Arrange
        const mockRunQuickUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('I/O error')),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new RunQuickModeHandler({ runQuickModeUseCase: mockRunQuickUseCase });
        const profile = JSON.stringify(createRelaxationProfileFixture());

        // Act
        await handler.handle(['--relaxation-profile', profile, '--target-paths', 'src/', '--unit', 'unit-a', '--phase', 'impl']);

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });
  });
});
```

### 5.3 ReportValidationResultsHandler（5件）

```ts
// @story H08-05
import { target, context } from '../../../../helpers/test-helpers';

target('ReportValidationResultsHandler', () => {
  describe('正常系', () => {
    context('--input results.json --format humanを渡した場合', () => {
      // IT-API-Report-001
      it('human形式でstdout出力されかつ終了コード0が返る', async () => {
        // Arrange
        const mockAggregateUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: true })),
        };
        const fixturePath = 'scripts/harness/__tests__/fixtures/validator-system/validation-results.json';
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new ReportValidationResultsHandler({ aggregateValidationResultsUseCase: mockAggregateUseCase });

        // Act
        await handler.handle(['--input', fixturePath, '--format', 'human']);

        // Assert
        expect(stdoutSpy).toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalledWith(1);
        expect(exitSpy).not.toHaveBeenCalledWith(2);
      });
    });

    context('--input results.json --format ciを渡した場合', () => {
      // IT-API-Report-002
      it('JSON形式でstdout出力される', async () => {
        // Arrange
        const mockAggregateUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: true, totalValidators: 3, failedValidators: 0 })),
        };
        const fixturePath = 'scripts/harness/__tests__/fixtures/validator-system/validation-results.json';
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new ReportValidationResultsHandler({ aggregateValidationResultsUseCase: mockAggregateUseCase });

        // Act
        await handler.handle(['--input', fixturePath, '--format', 'ci']);

        // Assert
        const output = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
        expect(() => JSON.parse(output)).not.toThrow();
      });
    });

    context('stdinからValidationResultContract[] JSONを受け取る場合', () => {
      // IT-API-Report-003
      it('stdinの内容が集約されてstdout出力される', async () => {
        // Arrange
        const mockAggregateUseCase = {
          execute: vi.fn().mockResolvedValue(createAggregatedReport({ overallPassed: true })),
        };
        const stdinContent = JSON.stringify(createValidationResultsFixture());
        const stdinSpy = vi.spyOn(process.stdin, Symbol.asyncIterator as never).mockImplementation(() => {
          return (async function* () { yield Buffer.from(stdinContent); })();
        });
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const handler = new ReportValidationResultsHandler({ aggregateValidationResultsUseCase: mockAggregateUseCase });

        // Act
        await handler.handle(['--format', 'human']);

        // Assert
        expect(stdoutSpy).toHaveBeenCalled();
      });
    });
  });

  describe('バリデーションテスト', () => {
    context('不正なJSONファイルを--inputに指定した場合', () => {
      // IT-API-Report-004
      it('stderr出力ありかつ終了コード2が設定される', async () => {
        // Arrange
        const tmpPath = await writeTmpFile('{ invalid json }');
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new ReportValidationResultsHandler({});

        // Act
        await handler.handle(['--input', tmpPath, '--format', 'human']);

        // Assert
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(2);

        // Cleanup
        await removeTmpFile(tmpPath);
      });
    });

    context('--inputのファイルが存在しない場合', () => {
      // IT-API-Report-005
      it('stderr出力ありかつ終了コード2が設定される', async () => {
        // Arrange
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        const handler = new ReportValidationResultsHandler({});

        // Act
        await handler.handle(['--input', '/nonexistent/results.json', '--format', 'human']);

        // Assert
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });
  });
});
```

---

## 6. テスト実行コマンド

```bash
# validator-system ITテスト全件実行
pnpm vitest run scripts/harness/__tests__/integration/validator-system

# UseCase テストのみ
pnpm vitest run scripts/harness/__tests__/integration/validator-system/usecases

# Adapter テストのみ
pnpm vitest run scripts/harness/__tests__/integration/validator-system/adapters

# Handler テストのみ
pnpm vitest run scripts/harness/__tests__/integration/validator-system/handlers

# 特定ファイルのみ
pnpm vitest run scripts/harness/__tests__/integration/validator-system/usecases/run-l2-validators-usecase.test.ts

# ウォッチモード（開発中）
pnpm vitest scripts/harness/__tests__/integration/validator-system

# カバレッジ付き実行
pnpm vitest run --coverage scripts/harness/__tests__/integration/validator-system
```
