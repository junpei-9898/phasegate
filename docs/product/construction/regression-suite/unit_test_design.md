# ユニットテスト設計: regression-suite

> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **対応ストーリー**: H14, H15
> **Wave**: 3
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象ドメインモデル

- **集約ルート（エンティティ）**: V0TestMigration
- **値オブジェクト**: SuiteId, RegressionSuiteDefinition, KRequirementTest, GngConditionTest, AgentIndependenceTest, MigrationMapping, CiGateConfig, TestExecutionSummary, BiomeModificationSpec
- **補助型 VO**: V0TestId, V1TestPath, CoverageRate, ImportViolation, TestFailureDetail
- **ドメインサービス**: RegressionRunner, MigrationAnalyzer, ImportGuardService

---

## 2. 集約ルートテストケース

### V0TestMigration

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/aggregates/v0-test-migration.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-001 | v0TestId=有効なV0TestId | 正常に生成される。migrationStatus='pending'、v1TestPath=null、biomeModificationSpec=null、skipReason=null |
| UT-RS-002 | v0TestId=空文字列 | エラーをスロー / 生成失敗 |

#### `migrate()` メソッドテスト（INV-1, INV-4）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-003 | pending状態からmigrateは正常遷移する | pending状態のV0TestMigration、有効なV1TestPath | migrationStatus='migrated'、v1TestPath が設定される、biomeModificationSpec=null |
| UT-RS-004 | INV-1: migrated状態での二重migrate呼び出し禁止 | migrated状態のV0TestMigration、V1TestPath | MigrationAlreadyCompletedError をスロー |
| UT-RS-005 | INV-1: modified状態でのmigrate呼び出し禁止 | modified状態のV0TestMigration、V1TestPath | MigrationAlreadyCompletedError をスロー |
| UT-RS-006 | INV-1: skipped状態でのmigrate呼び出し禁止 | skipped状態のV0TestMigration、V1TestPath | MigrationAlreadyCompletedError をスロー |

#### `migrateWithModification()` メソッドテスト（INV-2, INV-4, INV-5）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-007 | pending状態からmigrateWithModificationは正常遷移する | pending状態のV0TestMigration、有効なV1TestPath、有効なBiomeModificationSpec | migrationStatus='modified'、v1TestPath が設定される、biomeModificationSpec が設定される |
| UT-RS-008 | INV-2: migrated状態でのmigrateWithModification呼び出し禁止 | migrated状態のV0TestMigration | MigrationAlreadyCompletedError をスロー |
| UT-RS-009 | INV-5: modified時にbiomeModificationSpecは必須 | migrateWithModification後にbiomeModificationSpecがnullになっていないこと | biomeModificationSpec が非nullであることを確認 |

#### `skip()` メソッドテスト（INV-3）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-010 | pending状態からskip('out-of-scope')は正常遷移する | pending状態のV0TestMigration、reason='out-of-scope' | migrationStatus='skipped'、skipReason='out-of-scope'、v1TestPath=null |
| UT-RS-011 | pending状態からskip('orchestration-migrated')は正常遷移する | pending状態のV0TestMigration、reason='orchestration-migrated' | migrationStatus='skipped'、skipReason='orchestration-migrated' |
| UT-RS-012 | INV-3: migrated状態でのskip呼び出し禁止 | migrated状態のV0TestMigration | MigrationAlreadyCompletedError をスロー |
| UT-RS-013 | INV-3: skipped状態でのskip呼び出し禁止 | skipped状態のV0TestMigration | MigrationAlreadyCompletedError をスロー |

#### `toMigrationMapping()` メソッドテスト（INV-4）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-014 | migrated状態でtoMigrationMappingは正常返却する | migrated状態のV0TestMigration | MigrationMapping が返される。migrationStatus='migrated' |
| UT-RS-015 | modified状態でtoMigrationMappingは正常返却する | modified状態のV0TestMigration、biomeModificationSpec付き | MigrationMapping が返される。biomeModification が含まれる |
| UT-RS-016 | pending状態でtoMigrationMappingはエラー | pending状態のV0TestMigration | InvalidMigrationStateError をスロー |
| UT-RS-017 | skipped状態でtoMigrationMappingはエラー | skipped状態のV0TestMigration | InvalidMigrationStateError をスロー |

---

## 3. 値オブジェクトテストケース

### SuiteId

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/suite-id.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-020 | raw='k-requirements' | 正常に生成される |
| UT-RS-021 | raw='gng-gate' | 正常に生成される |
| UT-RS-022 | raw='v0-migration' | 正常に生成される |
| UT-RS-023 | raw='agent-independence' | 正常に生成される |
| UT-RS-024 | raw='unknown-suite' | InvalidSuiteIdError をスロー（INV-7） |
| UT-RS-025 | raw='' | InvalidSuiteIdError をスロー |
| UT-RS-026 | raw='K-REQUIREMENTS'（大文字） | InvalidSuiteIdError をスロー |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-027 | SuiteId('k-requirements') と SuiteId('k-requirements') | 等価（値等価性） |
| UT-RS-028 | SuiteId('k-requirements') と SuiteId('gng-gate') | 非等価 |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-029 | Object.freeze により生成後の変更は反映されない | 生成済みSuiteIdのvalueを直接変更しようとする | 変更が反映されない（immutable） |

---

### RegressionSuiteDefinition

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/regression-suite-definition.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-030 | suiteId=有効なSuiteId、testCases=[KRequirementTest 1件]、description=非空文字列 | 正常に生成される |
| UT-RS-031 | testCases=[複数のKRequirementTest] | 正常に生成される |
| UT-RS-032 | testCases=[] | EmptyTestCasesError をスロー（INV-6） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-033 | INV-6: testCasesは1件以上必須 | testCases=[] | EmptyTestCasesError をスロー |
| UT-RS-034 | 生成後にtestCasesの変更が反映されない | 生成済みインスタンスのtestCasesに要素を追加しようとする | 変更が反映されない（ReadonlyArray） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-035 | 同一suiteId/testCasesを持つ2つのRegressionSuiteDefinition | 等価（値等価性） |
| UT-RS-036 | 異なるsuiteIdを持つ2つのRegressionSuiteDefinition | 非等価 |

---

### KRequirementTest

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/k-requirement-test.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-040 | kNumber='K1'、targetUnit='validator-system'、verificationCondition=非空文字列 | 正常に生成される |
| UT-RS-041 | kNumber='K15' | 正常に生成される（最大値） |
| UT-RS-042 | kNumber='K3.5' | 正常に生成される（小数点を含む番号） |
| UT-RS-043 | kNumber='K16' | InvalidKNumberError をスロー（INV-11） |
| UT-RS-044 | kNumber='K0' | InvalidKNumberError をスロー |
| UT-RS-045 | kNumber='' | InvalidKNumberError をスロー |
| UT-RS-046 | targetUnit='' | エラーをスロー（非空文字列必須） |
| UT-RS-047 | verificationCondition='' | エラーをスロー（非空文字列必須） |
| UT-RS-048 | kNumber='k1'（小文字） | InvalidKNumberError をスロー |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-049 | 同一kNumber/targetUnit/verificationConditionを持つ2つのKRequirementTest | 等価（値等価性） |
| UT-RS-050 | kNumberのみ異なる2つのKRequirementTest | 非等価 |

---

### GngConditionTest

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/gng-condition-test.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-055 | gngNumber='GNG-4'、targetUnit=非空文字列、verificationCondition=非空文字列 | 正常に生成される |
| UT-RS-056 | gngNumber='GNG-5' | 正常に生成される |
| UT-RS-057 | gngNumber='GNG-8' | 正常に生成される |
| UT-RS-058 | gngNumber='GNG-1' | InvalidGngNumberError をスロー（INV-12） |
| UT-RS-059 | gngNumber='GNG-9' | InvalidGngNumberError をスロー（INV-12） |
| UT-RS-060 | gngNumber='' | InvalidGngNumberError をスロー |
| UT-RS-061 | gngNumber='gng-4'（小文字） | InvalidGngNumberError をスロー |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-062 | 同一gngNumber/targetUnit/verificationConditionを持つ2つのGngConditionTest | 等価（値等価性） |
| UT-RS-063 | gngNumberのみ異なる2つのGngConditionTest | 非等価 |

---

### AgentIndependenceTest

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/agent-independence-test.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-068 | targetModule=有効パス、forbiddenPatterns=['@anthropic-ai/claude-code']、allowedPaths=[] | 正常に生成される |
| UT-RS-069 | forbiddenPatterns=['@anthropic-ai/claude-code', 'claude-sdk']（複数パターン） | 正常に生成される |
| UT-RS-070 | allowedPaths=省略（デフォルト空配列） | 正常に生成される |
| UT-RS-071 | forbiddenPatterns=[] | EmptyForbiddenPatternsError をスロー（INV-10） |
| UT-RS-072 | targetModule='' | エラーをスロー（非空文字列必須） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-073 | INV-10: forbiddenPatternsは1件以上必須 | forbiddenPatterns=[] | EmptyForbiddenPatternsError をスロー |
| UT-RS-074 | 生成後にforbiddenPatternsの変更が反映されない | 生成済みインスタンスのforbiddenPatternsに要素を追加しようとする | 変更が反映されない（ReadonlyArray） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-075 | 同一targetModule/forbiddenPatterns/allowedPathsを持つ2つのAgentIndependenceTest | 等価（値等価性） |
| UT-RS-076 | forbiddenPatternsのみ異なる2つのAgentIndependenceTest | 非等価 |

---

### MigrationMapping

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/migration-mapping.test.ts`

#### 生成テスト（V0TestMigration.toMigrationMapping()経由）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-080 | migrated状態のV0TestMigration.toMigrationMapping() | MigrationMapping生成。migrationStatus='migrated'、biomeModification=null |
| UT-RS-081 | modified状態のV0TestMigration.toMigrationMapping() | MigrationMapping生成。migrationStatus='modified'、biomeModification が設定される |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-082 | MigrationMappingはmigrated/modifiedステータスのみ保持できる | pending/skippedのV0TestMigrationからtoMigrationMapping()を呼ぶ | InvalidMigrationStateError をスロー |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-083 | 同一v0TestId/v1TestPath/migrationStatusを持つ2つのMigrationMapping | 等価（値等価性） |

---

### CiGateConfig

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/ci-gate-config.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-088 | requiredSuiteIds=[SuiteId('k-requirements')]、coverageThreshold=90、executionMode='parallel' | 正常に生成される |
| UT-RS-089 | coverageThreshold=1（最小値: 0より大きい） | 正常に生成される |
| UT-RS-090 | coverageThreshold=100（最大値） | 正常に生成される |
| UT-RS-091 | coverageThreshold=0 | InvalidCoverageThresholdError をスロー（INV-8） |
| UT-RS-092 | coverageThreshold=101 | InvalidCoverageThresholdError をスロー（INV-8） |
| UT-RS-093 | coverageThreshold=-1 | InvalidCoverageThresholdError をスロー（INV-8） |
| UT-RS-094 | executionMode='sequential' | 正常に生成される |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-095 | INV-8: coverageThresholdは0超〜100以下 | coverageThreshold=0 | InvalidCoverageThresholdError をスロー |
| UT-RS-096 | isRequired()はrequiredSuiteIdsに含まれるSuiteIdにtrueを返す | requiredSuiteIds=['k-requirements']でisRequired(SuiteId('k-requirements')) | true を返す |
| UT-RS-097 | isRequired()はrequiredSuiteIdsに含まれないSuiteIdにfalseを返す | requiredSuiteIds=['k-requirements']でisRequired(SuiteId('gng-gate')) | false を返す |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-098 | 同一requiredSuiteIds/coverageThreshold/executionModeを持つ2つのCiGateConfig | 等価（値等価性） |
| UT-RS-099 | coverageThresholdのみ異なる2つのCiGateConfig | 非等価 |

---

### TestExecutionSummary

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/test-execution-summary.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-104 | passedCount=10、failedCount=2、skippedCount=1、totalCount=13 | 正常に生成される |
| UT-RS-105 | passedCount=0、failedCount=0、skippedCount=0、totalCount=0 | 正常に生成される（全件なし） |
| UT-RS-106 | coverageRate=CoverageRate(90)、failures=[] | 正常に生成される（カバレッジあり） |
| UT-RS-107 | passedCount=5、failedCount=3、skippedCount=0、totalCount=9（合計不一致） | TestCountIntegrityError をスロー（INV-9） |
| UT-RS-108 | failedCount=2、failures=[TestFailureDetail 1件]（failures.lengthとfailedCountの不一致） | TestCountIntegrityError をスロー（INV-9） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-109 | INV-9: passedCount+failedCount+skippedCount=totalCount | 不整合な値を持つ入力 | TestCountIntegrityError をスロー |
| UT-RS-110 | isPassedGate(threshold)はcoverageRateがthreshold以上のときtrueを返す | coverageRate=90、threshold=90 | true を返す |
| UT-RS-111 | isPassedGate(threshold)はcoverageRateがthreshold未満のときfalseを返す | coverageRate=89、threshold=90 | false を返す |
| UT-RS-112 | isPassedGate(threshold)はfailuresが0件でtrueを返す | failedCount=0、coverageRate=100 | true を返す |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-113 | 同一passedCount/failedCount/skippedCount/totalCountを持つ2つのTestExecutionSummary | 等価（値等価性） |

---

### BiomeModificationSpec

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/biome-modification-spec.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-118 | targetApi='eslint-specific-api'、replacementApi='biome-api'、modificationReason=非空文字列 | 正常に生成される |
| UT-RS-119 | targetApi='' | エラーをスロー（非空文字列必須） |
| UT-RS-120 | replacementApi='' | エラーをスロー（非空文字列必須） |
| UT-RS-121 | modificationReason='' | エラーをスロー（非空文字列必須） |
| UT-RS-122 | targetApi='api-x'、replacementApi='api-x'（targetApiとreplacementApiが同値） | エラーをスロー（targetApi !== replacementApi必須） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RS-123 | 同一targetApi/replacementApi/modificationReasonを持つ2つのBiomeModificationSpec | 等価（値等価性） |
| UT-RS-124 | targetApiのみ異なる2つのBiomeModificationSpec | 非等価 |

---

## 4. 補助型テストケース

### V0TestId

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/v0-test-id.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-130 | path='scripts/__tests__/unit/harness-error.test.ts' | 正常に生成される |
| UT-RS-131 | path=''（空文字列） | エラーをスロー |
| UT-RS-132 | path='invalid-path'（`scripts/__tests__/` プレフィックスなし） | エラーをスロー |

### CoverageRate

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/coverage-rate.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-135 | value=90 | 正常に生成される |
| UT-RS-136 | value=0 | 正常に生成される（最小値） |
| UT-RS-137 | value=100 | 正常に生成される（最大値） |
| UT-RS-138 | value=-1 | エラーをスロー |
| UT-RS-139 | value=101 | エラーをスロー |

### ImportViolation

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/value-objects/import-violation.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RS-142 | modulePath=有効なパス、forbiddenPackage='@anthropic-ai/claude-code'、violationMessage=非空文字列 | 正常に生成される |
| UT-RS-143 | modulePath='' | エラーをスロー |
| UT-RS-144 | forbiddenPackage='' | エラーをスロー |

---

## 5. ドメインサービステストケース

### RegressionRunner

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/services/regression-runner.test.ts`

> ドメインサービスのユニットテストでは、依存ポートはすべてモックで差し替える（ヘキサゴナルアーキテクチャのDI構造に従う）。

#### 正常系

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-150 | k-requirementsスイートを実行してTestExecutionSummaryを返す | suiteId='k-requirements'、CiGateConfig(threshold=90) | SuiteRegistryPortとTestRunnerPortが各1回呼ばれる。TestExecutionSummaryが返される |
| UT-RS-151 | agent-independenceスイートではImportGuardServiceが呼ばれる | suiteId='agent-independence' | ImportGuardService.verify()が各AgentIndependenceTestに対して呼ばれる |
| UT-RS-152 | gng-gateスイートを実行してTestExecutionSummaryを返す | suiteId='gng-gate' | TestRunnerPortが呼ばれる。TestExecutionSummaryが返される |
| UT-RS-153 | CiGateResultWriterPortに結果が書き出される | 任意のsuiteId、正常なTestExecutionSummary | CiGateResultWriterPort.write()が1回呼ばれる |
| UT-RS-154 | CoverageRateがcoverageThresholdを下回る場合にno-goと判定する | coverageRate=80、threshold=90 | go=falseのTetExecutionSummaryが返される（isPassedGate=false） |

#### 異常系

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-155 | SuiteRegistryPortがnullを返したときSuiteDefinitionNotFoundErrorをスロー | SuiteRegistryPort.getDefinition→null | SuiteDefinitionNotFoundError をスロー |
| UT-RS-156 | TestRunnerPortが例外をスローしたときTestRunnerPortErrorを伝播する | TestRunnerPort.runSuite→throw Error | TestRunnerPortError をスロー |

---

### MigrationAnalyzer

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/services/migration-analyzer.test.ts`

#### 正常系

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-160 | V0SpecReaderPortから全V0TestIdを読み取り分析する | V0SpecReaderPort→V0TestId[] 3件 | 3件のV0TestMigrationが返される |
| UT-RS-161 | v1スコープ外のテストはskip('out-of-scope')に遷移する | 分析対象がv1スコープ外と判定される場合 | V0TestMigration.skip('out-of-scope')が呼ばれる |
| UT-RS-162 | オーケストレーション移管済みはskip('orchestration-migrated')に遷移する | 分析対象がオーケストレーション移管済みと判定される場合 | V0TestMigration.skip('orchestration-migrated')が呼ばれる |
| UT-RS-163 | Biome修正不要なテストはmigrate(v1TestPath)に遷移する | 分析対象がBiome修正不要と判定される場合 | V0TestMigration.migrate()が呼ばれる |
| UT-RS-164 | Biome修正必要なテストはmigrateWithModification()に遷移する | 分析対象がBiome修正必要と判定される場合 | BiomeModificationSpecが生成されV0TestMigration.migrateWithModification()が呼ばれる |
| UT-RS-165 | 全件をMigrationMappingRepositoryPortに保存する | 3件の分析対象 | MigrationMappingRepositoryPort.save()が3回呼ばれる |

#### 異常系

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-166 | V0SpecReaderPortが失敗したときV0SpecReadErrorをスロー | V0SpecReaderPort.readAll()→throw Error | V0SpecReadError をスロー |
| UT-RS-167 | MigrationMappingRepositoryPortが失敗したときMigrationPersistenceErrorをスロー | MigrationMappingRepositoryPort.save()→throw Error | MigrationPersistenceError をスロー |

---

### ImportGuardService

**テスト配置**: `scripts/harness/__tests__/unit/regression-suite/services/import-guard-service.test.ts`

#### 正常系

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-172 | 禁止パターンに一致しないimportは空配列を返す | forbiddenPatterns=['@anthropic-ai/claude-code']、ImportAnalyzerPort→importなし | ImportViolation[] = [] を返す |
| UT-RS-173 | 禁止パターンに一致するimportはImportViolationとして返す | forbiddenPatterns=['@anthropic-ai/claude-code']、ImportAnalyzerPort→'@anthropic-ai/claude-code'のimport検出 | ImportViolation 1件が返される |
| UT-RS-174 | allowedPathsに含まれるパスの禁止パターン一致はスキップする | targetModule='infrastructure/adapters/xxx.ts'（allowedPathsに含まれる）、禁止パターン一致 | ImportViolation[] = [] を返す（Adapter層の例外的許容） |
| UT-RS-175 | allowedPathsに含まれないパスの禁止パターン一致は違反として報告する | targetModule='domain/services/xxx.ts'（allowedPathsに含まれない）、禁止パターン一致 | ImportViolation 1件が返される |
| UT-RS-176 | 複数の禁止パターンがある場合はすべて検出する | forbiddenPatterns=['@anthropic-ai/claude-code', 'claude-sdk']、両方のimportを検出 | ImportViolation 2件が返される |

#### 異常系

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RS-177 | ImportAnalyzerPortが失敗したときImportAnalysisPortErrorをスロー | ImportAnalyzerPort.analyzeImports()→throw Error | ImportAnalysisPortError をスロー |

---

## 6. テストケース総数サマリー

| カテゴリ | ケース数 |
|---------|---------|
| V0TestMigration（集約ルート） | 17件（UT-RS-001〜017） |
| SuiteId | 10件（UT-RS-020〜029） |
| RegressionSuiteDefinition | 7件（UT-RS-030〜036） |
| KRequirementTest | 11件（UT-RS-040〜050） |
| GngConditionTest | 9件（UT-RS-055〜063） |
| AgentIndependenceTest | 9件（UT-RS-068〜076） |
| MigrationMapping | 4件（UT-RS-080〜083） |
| CiGateConfig | 12件（UT-RS-088〜099） |
| TestExecutionSummary | 10件（UT-RS-104〜113） |
| BiomeModificationSpec | 7件（UT-RS-118〜124） |
| 補助型（V0TestId/CoverageRate/ImportViolation） | 10件（UT-RS-130〜144） |
| RegressionRunner（ドメインサービス） | 7件（UT-RS-150〜156） |
| MigrationAnalyzer（ドメインサービス） | 8件（UT-RS-160〜167） |
| ImportGuardService（ドメインサービス） | 6件（UT-RS-172〜177） |
| **合計** | **127件** |
