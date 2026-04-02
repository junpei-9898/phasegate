# ITテスト設計: regression-suite

> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **対応ストーリー**: H14, H15
> **Wave**: 3
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象コンポーネント

- **UseCase**: RunKRequirementsRegressionUseCase, RunK14K15RegressionUseCase, RunAgentIndependenceGuardUseCase, RunGngGateRegressionUseCase, AnalyzeV0MigrationUseCase, MigrateV0TestsUseCase, ConfigureCiGateUseCase
- **Infrastructure Adapter**: VitestTestRunnerAdapter, FileSystemV0SpecReaderAdapter, BiomeAstImportAnalyzerAdapter, MarkdownMigrationMappingRepositoryAdapter, HarnessConfigQueryAdapter, JsonCiGateResultWriterAdapter, StaticSuiteRegistryAdapter
- **Cross-Layer Integration**: H14-01 k-requirements実行フロー, H14-02 agent-independence実行フロー, H14-03 gng-gate実行フロー, H15-01 v0移行分析・実行フロー, H15-02 CIゲート設定フロー

---

## 2. テスト環境設定

### シードデータ要件

| データ | 内容 | 用途 |
|--------|------|------|
| `fixtures/v0-spec-files/` | v0テスト仕様ファイル（`scripts/__tests__/xxx.test.ts` 形式）のスタブ群 | FileSystemV0SpecReaderAdapterのテスト用 |
| `fixtures/v0_v1_test_mapping.md` | MigrationMapping Markdownテーブルのスタブ | MarkdownMigrationMappingRepositoryAdapterのテスト用 |
| `fixtures/phasegate.config.json` | HarnessConfigV2スタブ（coverageThreshold=90） | HarnessConfigQueryAdapterのテスト用 |
| `fixtures/ci-gate-output/` | JSON出力先ディレクトリ（書き込みテスト用） | JsonCiGateResultWriterAdapterのテスト用 |

### テスト環境設定

```typescript
// scripts/harness/__tests__/helpers/test-helpers.ts のエイリアスを使用
import { target, context } from '../../helpers/test-helpers';

// DIコンテナを使ったAdapterのインジェクション
// 各テストファイルで beforeEach/afterEach でフィクスチャの準備・クリーンアップを行う
// Vitest の vi.mock() でポートのモックを差し替える
```

---

## 3. UseCaseテストケース

### RunKRequirementsRegressionUseCase（H14-01）

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/run-k-requirements-regression-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunKReq-001 | K1-K15の全テストケースを実行してTestExecutionSummaryを返すこと | RunRegressionSuiteInput { suiteId: 'k-requirements' } | SuiteRegistryPort.getDefinition→KRequirementTest[] 16件; TestRunnerPort.runSuite→passedCount=16, failedCount=0; CiGateResultWriterPort.write→void; ConfigQueryPort→threshold=90 | RunRegressionSuiteOutput.passedCount=16、failedCount=0、totalCount=16、gateResult='go' |
| IT-UC-RunKReq-002 | カバレッジ閾値90%を超過する場合にgateResult='go'を返すこと | RunRegressionSuiteInput { suiteId: 'k-requirements' } | TestRunnerPort.runSuite→passedCount=16, failedCount=0, coverageRate=91 | gateResult='go'、coverageRate=91 |
| IT-UC-RunKReq-003 | カバレッジ閾値90%を下回る場合にgateResult='no-go'を返すこと | RunRegressionSuiteInput { suiteId: 'k-requirements' } | TestRunnerPort.runSuite→passedCount=14, failedCount=2, coverageRate=85 | gateResult='no-go'、failures.length=2 |
| IT-UC-RunKReq-004 | 失敗したテストケースのTestFailureDetailがfailuresに含まれること | RunRegressionSuiteInput { suiteId: 'k-requirements' } | TestRunnerPort.runSuite→failedCount=1, failures=[TestFailureDetail { testCaseId:'K3', errorMessage:'Biome AST error' }] | failures[0].testCaseId='K3'、failures[0].errorMessage='Biome AST error' |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-RunKReq-005 | スイート定義が見つからない場合にエラーが伝播すること | RunRegressionSuiteInput { suiteId: 'k-requirements' } | SuiteRegistryPort.getDefinition→throw SuiteDefinitionNotFoundError | SuiteDefinitionNotFoundError がスロー |
| IT-UC-RunKReq-006 | TestRunnerPortが失敗した場合にエラーが伝播すること | RunRegressionSuiteInput { suiteId: 'k-requirements' } | TestRunnerPort.runSuite→throw Error('network error') | TestRunnerPortError がスロー |

---

### RunK14K15RegressionUseCase（H14-02）

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/run-k14-k15-regression-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunK14K15-001 | K14とK15のテストケースのみを実行すること | RunRegressionSuiteInput { suiteId: 'k-requirements', kNumberFilter: ['K14', 'K15'] } | SuiteRegistryPort.getDefinition→KRequirementTest[] 16件（K1-K15）; TestRunnerPort.runSuiteに渡されるtestCasesがK14/K15の2件のみ | TestRunnerPort.runSuite が2件のKRequirementTestを受け取ること（K14/K15のみ） |
| IT-UC-RunK14K15-002 | K14テスト通過時にgateResult='go'を返すこと | RunRegressionSuiteInput { kNumberFilter: ['K14', 'K15'] } | TestRunnerPort.runSuite→passedCount=2, failedCount=0 | RunRegressionSuiteOutput.gateResult='go'、passedCount=2 |
| IT-UC-RunK14K15-003 | K15テスト失敗時にfailuresにK15の詳細が含まれること | RunRegressionSuiteInput { kNumberFilter: ['K14', 'K15'] } | TestRunnerPort.runSuite→failedCount=1, failures=[TestFailureDetail { testCaseId:'K15' }] | failures[0].testCaseId='K15' |

---

### RunAgentIndependenceGuardUseCase（H14-02）

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/run-agent-independence-guard-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-AgentGuard-001 | import違反がない場合にpassedCount=件数を返すこと | RunRegressionSuiteInput { suiteId: 'agent-independence' } | SuiteRegistryPort→AgentIndependenceTest[] 3件; ImportAnalyzerPort→全モジュールで禁止import検出なし | RunRegressionSuiteOutput.failedCount=0、failures=[] |
| IT-UC-AgentGuard-002 | import違反が検出された場合にTestFailureDetailに変換されfailuresに含まれること | RunRegressionSuiteInput { suiteId: 'agent-independence' } | ImportAnalyzerPort→'scripts/harness/x/domain/y.ts'で'@anthropic-ai/claude-code'のimport検出 | failures[0].errorMessage に'Forbidden import detected'が含まれる、failedCount=1 |
| IT-UC-AgentGuard-003 | allowedPathsに含まれるAdapter層のimportは違反として報告されないこと | RunRegressionSuiteInput { suiteId: 'agent-independence' } | ImportAnalyzerPort→'infrastructure/adapters/xxx.ts'（allowedPaths含む）で禁止パターン検出 | failures=[]（Adapter層の例外的許容が機能する） |
| IT-UC-AgentGuard-004 | CiGateResultWriterPortにagent-independenceの結果が書き出されること | RunRegressionSuiteInput { suiteId: 'agent-independence' } | ImportAnalyzerPort→違反なし | CiGateResultWriterPort.write('agent-independence', summary)が1回呼ばれる |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-AgentGuard-005 | ImportAnalyzerPortが失敗した場合にImportAnalysisPortErrorが伝播すること | RunRegressionSuiteInput { suiteId: 'agent-independence' } | ImportAnalyzerPort.analyzeImports→throw Error | ImportAnalysisPortError がスロー |

---

### RunGngGateRegressionUseCase（H14-03）

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/run-gng-gate-regression-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunGng-001 | GNG-4/GNG-5/GNG-8の3件を実行してsummaryを返すこと | RunRegressionSuiteInput { suiteId: 'gng-gate' } | SuiteRegistryPort→GngConditionTest[] 3件; TestRunnerPort.runSuite→passedCount=3, failedCount=0 | RunRegressionSuiteOutput.passedCount=3、totalCount=3、gateResult='go' |
| IT-UC-RunGng-002 | GNG条件のいずれかが失敗した場合にgateResult='no-go'を返すこと | RunRegressionSuiteInput { suiteId: 'gng-gate' } | TestRunnerPort.runSuite→passedCount=2, failedCount=1, failures=[TestFailureDetail { testCaseId:'GNG-4' }] | gateResult='no-go'、failures[0].testCaseId='GNG-4' |
| IT-UC-RunGng-003 | CiGateResultWriterPortにgng-gateの結果が書き出されること | RunRegressionSuiteInput { suiteId: 'gng-gate' } | TestRunnerPort.runSuite→全件通過 | CiGateResultWriterPort.write('gng-gate', summary)が1回呼ばれる |

---

### AnalyzeV0MigrationUseCase（H15-01）

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/analyze-v0-migration-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-AnalyzeMig-001 | v0テスト仕様の分析結果サマリーを返すこと | AnalyzeMigrationInput { dryRun: true } | V0SpecReaderPort→V0TestId[] 5件; 分析結果: migrated=2, modified=1, skipped=2 | AnalyzeMigrationOutput.totalCount=5、migratedCount=2、modifiedCount=1、skippedCount=2 |
| IT-UC-AnalyzeMig-002 | dryRun=trueのときMigrationMappingRepositoryPortが呼ばれないこと | AnalyzeMigrationInput { dryRun: true } | V0SpecReaderPort→V0TestId[] 3件 | MigrationMappingRepositoryPort.save()が0回呼ばれる |
| IT-UC-AnalyzeMig-003 | 全件がskippedになる場合にmigratedCount=0を返すこと | AnalyzeMigrationInput { dryRun: true } | V0SpecReaderPort→全件がv1スコープ外と判定 | AnalyzeMigrationOutput.migratedCount=0、modifiedCount=0、skippedCount=全件数 |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-AnalyzeMig-004 | V0SpecReaderPortが失敗した場合にエラーが伝播すること | AnalyzeMigrationInput { dryRun: true } | V0SpecReaderPort.readAll→throw Error | V0SpecReadError がスロー |

---

### MigrateV0TestsUseCase（H15-01）

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/migrate-v0-tests-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-MigrateV0-001 | confirmExecute=trueのとき全件の移行を実行してMigrationMappingを返すこと | MigrateV0TestsInput { confirmExecute: true } | V0SpecReaderPort→V0TestId[] 3件; 分析結果: migrated=2, modified=1, skipped=0 | MigrateV0TestsOutput.mappings.length=3（migrated=2, modified=1）、MigrationMappingRepositoryPort.save()が3回呼ばれる |
| IT-UC-MigrateV0-002 | confirmExecute=falseのときドライランのみ実行すること | MigrateV0TestsInput { confirmExecute: false } | V0SpecReaderPort→V0TestId[] 3件 | MigrationMappingRepositoryPort.save()が0回呼ばれる（ドライラン） |
| IT-UC-MigrateV0-003 | modifiedステータスの移行にbiomeModificationが含まれること | MigrateV0TestsInput { confirmExecute: true } | 分析結果: 1件がBiome修正必要と判定 | MigrateV0TestsOutput.mappings のうち1件にbiomeModificationが含まれる |
| IT-UC-MigrateV0-004 | skippedのV0TestMigrationはMigrationMappingに含まれないこと | MigrateV0TestsInput { confirmExecute: true } | 分析結果: migrated=1, skipped=2 | MigrateV0TestsOutput.mappings.length=1（skippedは除外） |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-MigrateV0-005 | MigrationMappingRepositoryPortの保存が失敗した場合にエラーが伝播すること | MigrateV0TestsInput { confirmExecute: true } | MigrationMappingRepositoryPort.save→throw Error | MigrationPersistenceError がスロー |

---

### ConfigureCiGateUseCase（H15-02）

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/configure-ci-gate-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ConfigCiGate-001 | coverageThresholdを指定して有効なCiGateConfigを生成すること | ConfigureCiGateInput { requiredSuiteIds: ['k-requirements', 'gng-gate'], coverageThreshold: 90, executionMode: 'parallel' } | ConfigQueryPort.getCoverageThreshold→80（デフォルト値） | ConfigureCiGateOutput.requiredSuiteIds=['k-requirements', 'gng-gate']、coverageThreshold=90（入力値を優先） |
| IT-UC-ConfigCiGate-002 | coverageThresholdが未指定のときConfigQueryPortのデフォルト値を使用すること | ConfigureCiGateInput { requiredSuiteIds: ['k-requirements'], executionMode: 'parallel' } | ConfigQueryPort.getCoverageThreshold→80 | ConfigureCiGateOutput.coverageThreshold=80（デフォルト値を使用） |
| IT-UC-ConfigCiGate-003 | executionMode='sequential'を設定できること | ConfigureCiGateInput { requiredSuiteIds: ['k-requirements'], coverageThreshold: 90, executionMode: 'sequential' } | ConfigQueryPortモック | ConfigureCiGateOutput.executionMode='sequential' |
| IT-UC-ConfigCiGate-004 | 全4スイートIDを必須として設定できること | ConfigureCiGateInput { requiredSuiteIds: ['k-requirements', 'gng-gate', 'agent-independence', 'v0-migration'], coverageThreshold: 90, executionMode: 'parallel' } | ConfigQueryPortモック | ConfigureCiGateOutput.requiredSuiteIds.length=4 |

#### バリデーション

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-ConfigCiGate-005 | coverageThreshold=0のときInvalidCoverageThresholdErrorをスローすること | ConfigureCiGateInput { requiredSuiteIds: ['k-requirements'], coverageThreshold: 0 } | ConfigQueryPortモック | InvalidCoverageThresholdError がスロー（INV-8） |
| IT-UC-ConfigCiGate-006 | 不正なSuiteId文字列のときInvalidSuiteIdErrorをスローすること | ConfigureCiGateInput { requiredSuiteIds: ['unknown-suite'] } | ConfigQueryPortモック | InvalidSuiteIdError がスロー |

---

## 4. Infrastructure Adapterテストケース

### VitestTestRunnerAdapter

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/vitest-test-runner-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-VitestRunner-001 | KRequirementTest[]を受け取りテスト実行してTestFailureDetail[]を返すこと | KRequirementTest[] 2件 | Vitestのworkspace実行をモック→passed=2, failed=0 | actual.failedCount=0、actual.failures=[] |
| IT-REPO-VitestRunner-002 | failedテストをTestFailureDetailに変換すること | KRequirementTest[] 1件 | Vitestモック→1件失敗。testName='K1-test'、errorMessage='assertion failed' | actual.failures[0].errorMessage='assertion failed' |
| IT-REPO-VitestRunner-003 | executionMode='parallel'のときpool='threads'で実行すること | KRequirementTest[] 1件、executionMode='parallel' | Vitestモック | Vitest workspace設定にpool='threads'が含まれること |
| IT-REPO-VitestRunner-004 | executionMode='sequential'のときpool='forks'で実行すること | KRequirementTest[] 1件、executionMode='sequential' | Vitestモック | Vitest workspace設定にpool='forks'が含まれること |
| IT-REPO-VitestRunner-005 | CoverageRateが正しく算出されること | テスト実行後にcoverage=92と報告される | Vitestモック→coverage=92 | actual.coverageRate?.value=92 |

---

### FileSystemV0SpecReaderAdapter

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/file-system-v0-spec-reader-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-V0SpecReader-001 | `scripts/__tests__/` 配下のtest.tsファイルをV0TestId[]として返すこと | フィクスチャ: 3件のv0テストファイルが存在 | fast-globがフィクスチャパスをスキャン | actual.length=3、各要素がV0TestId型 |
| IT-REPO-V0SpecReader-002 | `*.test.ts` パターンのみを対象にすること | フィクスチャ: `.test.ts`と`.spec.ts`が混在 | fast-globモック | `.spec.ts`ファイルは含まれない |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-REPO-V0SpecReader-003 | ディレクトリが存在しない場合にエラーをスローすること | 存在しないディレクトリを指定 | fast-glob→throw Error | V0SpecReadError がスロー |

---

### BiomeAstImportAnalyzerAdapter

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/biome-ast-import-analyzer-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ImportAnalyzer-001 | 指定モジュールのimport一覧を返すこと | targetModule='scripts/harness/x/domain/y.ts' | biome-ast-engineのBiomeAstAnalysisResult Contract→import['@anthropic-ai/claude-code'] | actual に '@anthropic-ai/claude-code' が含まれる |
| IT-REPO-ImportAnalyzer-002 | importがないモジュールに対して空配列を返すこと | targetModule（importなしのファイル） | biome-ast-engineモック→importなし | actual=[] |
| IT-REPO-ImportAnalyzer-003 | biome-ast-engineが未利用の場合にNode.js ASTフォールバックで解析すること | targetModule、biome-ast-engine未初期化 | biome-ast-engine未利用状態をシミュレート | @swc/core等のフォールバックAST解析が呼ばれる |

---

### MarkdownMigrationMappingRepositoryAdapter

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/markdown-migration-mapping-repository-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-MigrationRepo-001 | V0TestMigration集約をMarkdownテーブルに保存すること | migrated状態のV0TestMigration（v0TestId='scripts/__tests__/x.test.ts'、v1TestPath='scripts/harness/x.test.ts'） | fs/promisesをフィクスチャディレクトリに向ける | フィクスチャの `v0_v1_test_mapping.md` にテーブル行が追記されること |
| IT-REPO-MigrationRepo-002 | modified状態のV0TestMigrationにbiomeModificationが含まれること | modified状態のV0TestMigration（biomeModificationSpec付き） | fsモック | 保存されたMarkdown行にbiomeModification情報が含まれる |
| IT-REPO-MigrationRepo-003 | findAll()でMarkdownテーブルを全件パースしてV0TestMigration[]を返すこと | フィクスチャ: 3件のテーブル行を持つv0_v1_test_mapping.md | fsモック | actual.length=3 |
| IT-REPO-MigrationRepo-004 | findById()で指定V0TestIdの1件を返すこと | 検索対象v0TestId='scripts/__tests__/x.test.ts' | fsモック | actual.v0TestId.value='scripts/__tests__/x.test.ts' |
| IT-REPO-MigrationRepo-005 | findById()で存在しないV0TestIdにnullを返すこと | 存在しないv0TestId | fsモック | actual=null |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-REPO-MigrationRepo-006 | ファイルI/Oが失敗した場合にMigrationPersistenceErrorをスローすること | 書き込み対象ファイルへのアクセス失敗 | fs.writeFile→throw Error | MigrationPersistenceError がスロー |

---

### HarnessConfigQueryAdapter

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/harness-config-query-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ConfigQuery-001 | HarnessConfigV2のcoverageThresholdを返すこと | なし（ポート呼び出しのみ） | config-foundationのHarnessConfigV2スタブ→layers.L3.coverageThreshold=90 | actual=90 |
| IT-REPO-ConfigQuery-002 | HarnessConfigV2のCI設定を返すこと | なし | HarnessConfigV2スタブ→ci.enabled=true | actual.ciEnabled=true |

---

### JsonCiGateResultWriterAdapter

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/json-ci-gate-result-writer-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-CiGateWriter-001 | TestExecutionSummaryをHarnessApiResponse形式のJSONでCI出力ディレクトリに書き出すこと | suiteId='k-requirements'、TestExecutionSummary(passed=10, failed=0) | fs/promisesをフィクスチャCIディレクトリに向ける | 書き出されたJSONに `{ status: 'pass', summary: { passedCount: 10 } }` が含まれる |
| IT-REPO-CiGateWriter-002 | failedCountが1以上のときstatus='fail'で書き出すこと | TestExecutionSummary(passed=8, failed=2) | fsモック | 書き出されたJSONに `{ status: 'fail' }` が含まれる |
| IT-REPO-CiGateWriter-003 | CIゲート統合のためにstdoutにもsummaryを出力すること | 任意のTestExecutionSummary | fsモック、stdoutモック | stdoutにsummaryが出力される |

---

### StaticSuiteRegistryAdapter

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/static-suite-registry-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-SuiteRegistry-001 | SuiteId('k-requirements')に対応するRegressionSuiteDefinitionを返すこと | SuiteId('k-requirements') | なし（実体を使用） | actual.suiteId.value='k-requirements'、actual.testCases がKRequirementTest[]型 |
| IT-REPO-SuiteRegistry-002 | SuiteId('gng-gate')に対応するRegressionSuiteDefinitionを返すこと | SuiteId('gng-gate') | なし（実体を使用） | actual.testCases がGngConditionTest[] 3件（GNG-4/GNG-5/GNG-8） |
| IT-REPO-SuiteRegistry-003 | SuiteId('agent-independence')に対応するRegressionSuiteDefinitionを返すこと | SuiteId('agent-independence') | なし（実体を使用） | actual.testCases がAgentIndependenceTest[]型、各テストにforbiddenPatternsが1件以上 |
| IT-REPO-SuiteRegistry-004 | 不正なSuiteIdのときSuiteDefinitionNotFoundErrorをスローすること | 無効なSuiteId | なし | SuiteDefinitionNotFoundError がスロー |

---

## 5. Cross-Layer統合テストケース

### H14-01: k-requirements実行統合フロー

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/k-requirements-integration.test.ts`

#### 統合シナリオ

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-KReqInteg-001 | UseCase→RegressionRunner→SuiteRegistryPort→TestRunnerPort→CiGateResultWriterPortの全レイヤーが連携して結果を返すこと | RunRegressionSuiteInput { suiteId: 'k-requirements' } | StaticSuiteRegistryAdapterは実体; TestRunnerPort・ConfigQueryPort・CiGateResultWriterPortはモック | RunRegressionSuiteOutput が返される。TestRunnerPortがKRequirementTest[] 16件を受け取ること |
| IT-API-KReqInteg-002 | CiGateConfigのcoverageThresholdが末端のTestExecutionSummary.isPassedGate()評価に反映されること | RunRegressionSuiteInput { suiteId: 'k-requirements' } | ConfigQueryPort→threshold=90; TestRunnerPort→coverage=85 | gateResult='no-go'（85 < 90） |
| IT-API-KReqInteg-003 | TestFailureDetailがUseCase出力まで正しく変換・伝播されること | TestRunnerPortが返すTestFailureDetailにstackTraceが含まれる | TestRunnerPort→failures=[TestFailureDetail { testCaseId:'K1', errorMessage:'msg', stackTrace:'at...' }] | RunRegressionSuiteOutput.failures[0].stackTrace='at...' |

---

### H14-02: agent-independence実行統合フロー

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/agent-independence-integration.test.ts`

#### 統合シナリオ

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-AgentInteg-001 | UseCase→RegressionRunner→ImportGuardService→ImportAnalyzerPortの全レイヤーが連携して結果を返すこと | RunRegressionSuiteInput { suiteId: 'agent-independence' } | StaticSuiteRegistryAdapterは実体; ImportAnalyzerPortはモック→違反なし | RunRegressionSuiteOutput.failedCount=0 |
| IT-API-AgentInteg-002 | ImportViolationがTestFailureDetailに変換されUseCase出力に含まれること | RunRegressionSuiteInput { suiteId: 'agent-independence' } | ImportAnalyzerPort→ImportViolation { modulePath:'x.ts', forbiddenPackage:'@anthropic-ai/claude-code', violationMessage:'Forbidden import detected: @anthropic-ai/claude-code' } | failures[0].errorMessage に'Forbidden import detected: @anthropic-ai/claude-code' が含まれる |

---

### H15-01: v0移行フロー統合

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/v0-migration-integration.test.ts`

#### 統合シナリオ

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-V0MigInteg-001 | AnalyzeV0MigrationUseCase→MigrationAnalyzer→V0SpecReaderPortの全レイヤーが連携して分析サマリーを返すこと | AnalyzeMigrationInput { dryRun: true } | V0SpecReaderPortはモック→V0TestId[] 5件 | AnalyzeMigrationOutput.totalCount=5 |
| IT-API-V0MigInteg-002 | MigrateV0TestsUseCase実行後にMarkdownMigrationMappingRepositoryAdapterに保存されること | MigrateV0TestsInput { confirmExecute: true } | V0SpecReaderPortはモック→V0TestId[] 3件（全件migrated); MigrationMappingRepositoryPortはモック | MigrationMappingRepositoryPort.save()が3回呼ばれる |
| IT-API-V0MigInteg-003 | V0TestMigration集約の状態遷移がUseCase出力に正しく反映されること | MigrateV0TestsInput { confirmExecute: true } | 分析結果: migrated=1, modified=1, skipped=1 | MigrateV0TestsOutput.mappings.length=2（skippedは除外）、mappings[0].migrationStatusが'migrated'または'modified' |

---

### H15-02: CIゲート化統合フロー

**テスト配置**: `scripts/harness/__tests__/integration/regression-suite/ci-gate-configuration-integration.test.ts`

#### 統合シナリオ

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-CiGateInteg-001 | ConfigureCiGateUseCaseが返すCiGateConfigをRunKRequirementsRegressionUseCaseに適用してテストが実行されること | ConfigureCiGateInput { requiredSuiteIds: ['k-requirements', 'gng-gate', 'agent-independence'], coverageThreshold: 90, executionMode: 'parallel' }を先に実行 | ConfigQueryPort・TestRunnerPort・SuiteRegistryPortはモック | ConfigureCiGateOutput.coverageThreshold=90 が RunKRequirementsRegressionUseCase のgateResult判定に使われること |
| IT-API-CiGateInteg-002 | v0-migrationスイートをrequiredSuiteIdsに追加してCIゲート化できること（Phase B移行パターン） | ConfigureCiGateInput { requiredSuiteIds: ['k-requirements', 'gng-gate', 'agent-independence', 'v0-migration'], coverageThreshold: 90, executionMode: 'parallel' } | ConfigQueryPortモック | ConfigureCiGateOutput.requiredSuiteIds に 'v0-migration' が含まれる。ドメインモデルの変更なしで対応できること |

---

## 6. テストケース総数サマリー

| カテゴリ | ケース数 |
|---------|---------|
| RunKRequirementsRegressionUseCase | 6件（IT-UC-RunKReq-001〜006） |
| RunK14K15RegressionUseCase | 3件（IT-UC-RunK14K15-001〜003） |
| RunAgentIndependenceGuardUseCase | 5件（IT-UC-AgentGuard-001〜005） |
| RunGngGateRegressionUseCase | 3件（IT-UC-RunGng-001〜003） |
| AnalyzeV0MigrationUseCase | 4件（IT-UC-AnalyzeMig-001〜004） |
| MigrateV0TestsUseCase | 5件（IT-UC-MigrateV0-001〜005） |
| ConfigureCiGateUseCase | 6件（IT-UC-ConfigCiGate-001〜006） |
| VitestTestRunnerAdapter | 5件（IT-REPO-VitestRunner-001〜005） |
| FileSystemV0SpecReaderAdapter | 3件（IT-REPO-V0SpecReader-001〜003） |
| BiomeAstImportAnalyzerAdapter | 3件（IT-REPO-ImportAnalyzer-001〜003） |
| MarkdownMigrationMappingRepositoryAdapter | 6件（IT-REPO-MigrationRepo-001〜006） |
| HarnessConfigQueryAdapter | 2件（IT-REPO-ConfigQuery-001〜002） |
| JsonCiGateResultWriterAdapter | 3件（IT-REPO-CiGateWriter-001〜003） |
| StaticSuiteRegistryAdapter | 4件（IT-REPO-SuiteRegistry-001〜004） |
| k-requirements統合フロー | 3件（IT-API-KReqInteg-001〜003） |
| agent-independence統合フロー | 2件（IT-API-AgentInteg-001〜002） |
| v0移行フロー統合 | 3件（IT-API-V0MigInteg-001〜003） |
| CIゲート化統合フロー | 2件（IT-API-CiGateInteg-001〜002） |
| **合計** | **68件** |
