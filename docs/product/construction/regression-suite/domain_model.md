# ドメインモデル: regression-suite

@story-id H14-01
@story-id H14-02
@story-id H14-03
@story-id H15-01
@story-id H15-02
> **Unit ID**: regression-suite
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-19（Wave 2 初版）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H14-01〜H14-03、H15-01〜H15-02
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §4（Shared Kernel最小化）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| V0TestMigration | 集約ルート（エンティティ） | `v0TestId` を識別子とし、`migrationStatus`（pending/migrated/modified/skipped）の状態遷移を管理する。v0テスト仕様143件をv1へ移行するライフサイクルを表現 |
| RegressionSuiteDefinition | 値オブジェクト | suiteId（4種）と testCases（KRequirementTest/GngConditionTest/AgentIndependenceTest の一覧）の不変宣言。スイート定義そのもの |
| KRequirementTest | 値オブジェクト | K番号（K1〜K15/K3.5含む）・対象Unit・検証条件（アサーション仕様）を保持する不変定義 |
| GngConditionTest | 値オブジェクト | GNG番号（GNG-4/GNG-5/GNG-8）・対象Unit・検証条件を保持する不変定義 |
| AgentIndependenceTest | 値オブジェクト | 検証対象モジュールパス・許可importパターン・禁止importパターン（1件以上必須）を保持する不変定義 |
| MigrationMapping | 値オブジェクト | V0TestMigration集約が完了時に生成する読み取り専用VO。v0TestId → v1TestPath の対応表エントリ |
| CiGateConfig | 値オブジェクト | 必須スイートID一覧・coverageThreshold（0超〜100以下）・executionMode を保持する設定VO |
| TestExecutionSummary | 値オブジェクト | totalCount/passedCount/failedCount/skippedCount/coverage?/failures[] を保持する実行結果VO |
| BiomeModificationSpec | 値オブジェクト | ESLint→Biome移行に伴う修正内容（置換対象API・修正理由・修正後API名）を保持するVO。migrationStatus=modified の場合に付随 |
| SuiteId | 値オブジェクト | `'k-requirements' \| 'gng-gate' \| 'v0-migration' \| 'agent-independence'` の型安全な識別子 |
| RegressionRunner | ドメインサービス | SuiteId を受け取り、RegressionSuiteDefinition取得 → testCase実行委譲 → TestExecutionSummary生成・CiGateConfig適用を担う |
| MigrationAnalyzer | ドメインサービス | v0テスト仕様を分析し、移行ステータス判定・BiomeModificationSpec生成・V0TestMigration集約への移行指示を担う |
| ImportGuardService | ドメインサービス | AgentIndependenceTest定義に基づき、対象モジュールの import 解析結果を ImportAnalyzerPort から受け取り、ImportViolation[] を返す |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | 回帰テスト失敗・移行エラー時の出力フォーマット | 読取専用 |
| HarnessConfigV2 | config-foundation | ConfigQueryPort経由でcoverageThreshold・CI設定を参照 | 読取専用 |

### 他Unitから受け取るCross-Unit Contract

| 型名 | 所有Unit | 利用目的 |
|------|---------|---------|
| FallbackCapabilitySpec Contract | agent-integration | K14/K15回帰テストが検証するエージェント非依存性保証の確認対象として参照（importガード検証の文脈） |
| PhaseGateResult | phase-dependency-model | K2/K14回帰テストでのphase-gate 3層構造の検証に参照 |
| BiomeAstAnalysisResult | biome-ast-engine | K3回帰テストでのBiome AST解析結果を消費。ImportAnalyzerPort実装のインフラ層で利用 |

### 他Unitへ公開する契約

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| TestExecutionSummary Contract | ci-governance | CIゲート統合用テスト結果（pass/fail/coverage）をCiGateResultWriterPort経由で出力 |
| MigrationMapping Contract | （ドキュメント経由） | `docs/product/construction/regression-suite/v0_v1_test_mapping.md` にv0→v1対応表を永続化 |

---

## 2. Aggregate Boundary

### 結論: 集約1つ（V0TestMigration）+ ドメインサービス3つ + 値オブジェクト群

横断契約§6の集約降格方針を参照しつつ、以下の分析によりこの構成とした。

### V0TestMigration集約ルート採用の根拠

V0TestMigration は以下の3要素を満たすため、集約ルートとして採用する。

**状態遷移の存在**: `migrationStatus` は `pending → migrated`、`pending → modified`、`pending → skipped` という一方向遷移を持つ明確なライフサイクルがある。「v0テスト仕様がv1として移行完了したか」という状態は、値等価性ではなく同一性で追跡すべき業務上の関心事である。

**識別子による管理**: `v0TestId`（v0テストファイルの相対パスをラップしたVO）により143件が一意に識別される。人間レビューを経た移行状態の追跡には識別子ベースの管理が不可欠。

**I/O境界の存在**: `docs/product/construction/regression-suite/v0_v1_test_mapping.md` というファイルが永続化境界として機能し、`MigrationPersistencePort` 経由で集約の状態を読み書きする。ライフサイクルが外部ストレージに対して確立されている。

**biomeModification の状態依存**: `biomeModificationSpec` は `migrationStatus=modified` の場合にのみ存在し、集約ルートが状態に応じた整合性を保証する責務を担う。

### RegressionTestSuite降格の根拠

unit定義§4では `RegressionTestSuite` を集約ルートと記載していたが、横断契約§6の降格パターン「ステートレスな計算処理のみ・永続化不要・状態遷移なし」に合致するため降格する。

**永続化が不要**: `suiteId`（k-requirements/gng-gate/v0-migration/agent-independence）は識別子として機能するが、テストスイートは実行のたびに新たな結果が生成される「実行フロー」であり、独立ライフサイクルを持つ永続化対象ではない。

**状態遷移がない**: `testCases`（KRequirementTest等のVO一覧）はスイートの「定義」であり、実行前から変化しない不変の宣言集合である。

**出力値としての実行結果**: `TestExecutionSummary` は実行の出力結果VOであり、集約が「所有」する永続的状態ではなくステートレスな出力値である。

**降格後の構成**（横断契約§6のLintExecution降格と同一パターン）:
- `SuiteId`（値オブジェクト）: スイートIDの型安全な識別子
- `RegressionSuiteDefinition`（値オブジェクト）: スイートの定義（suiteId + testCases 一覧の不変宣言）
- `RegressionRunner`（ドメインサービス）: SuiteId → TestExecutionSummary の実行・結果集約ロジック
- `TestExecutionSummary`（値オブジェクト）: 実行結果の出力VO

---

## 3. Model Classification

### 集約ルート（エンティティ）

| 集約ルート | 識別子 | ライフサイクル |
|-----------|--------|--------------|
| V0TestMigration | V0TestId（v0テストファイルの相対パスをラップしたVO） | `pending` 初期化 → `migrate()`/`migrateWithModification()`/`skip()` いずれかで完了遷移。`MigrationPersistencePort` 経由で永続化 |

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 説明 |
|-------------|------|---------|------|
| SuiteId | ✓ | ✓ | `'k-requirements' \| 'gng-gate' \| 'v0-migration' \| 'agent-independence'` の型安全な識別子 |
| RegressionSuiteDefinition | ✓ | ✓ | suiteId: SuiteId、testCases: ReadonlyArray（1件以上必須） |
| KRequirementTest | ✓ | ✓ | kNumber（K1〜K15/K3.5含む）、targetUnit、verificationCondition |
| GngConditionTest | ✓ | ✓ | gngNumber（GNG-4/GNG-5/GNG-8のいずれか）、targetUnit、verificationCondition |
| AgentIndependenceTest | ✓ | ✓ | targetModule（coreモジュールパス）、forbiddenPatterns（1件以上必須）、allowedPaths |
| MigrationMapping | ✓ | ✓ | v0TestId、v1TestPath、migrationStatus（migrated/modified のみ）、biomeModification? |
| CiGateConfig | ✓ | ✓ | requiredSuiteIds: SuiteId[]、coverageThreshold（0超〜100以下）、executionMode |
| TestExecutionSummary | ✓ | ✓ | passedCount、failedCount、skippedCount、totalCount（3者の合計と一致）、coverageRate?、failures: TestFailureDetail[] |
| BiomeModificationSpec | ✓ | ✓ | targetApi（ESLint固有API名）、replacementApi（Biome対応API名）、modificationReason |

### 補助型

| 型 | 説明 |
|---|------|
| MigrationStatus | `'pending' \| 'migrated' \| 'modified' \| 'skipped'` |
| V0TestId | v0テストファイルの相対パス（`scripts/__tests__/xxx.test.ts` 形式）をラップした値オブジェクト |
| V1TestPath | v1テスト実装ファイルの相対パスをラップした値オブジェクト |
| CoverageRate | カバレッジ率（0〜100の number）をラップした値オブジェクト |
| ImportViolation | 違反import情報（modulePath・forbiddenPackage・violationMessage）を保持するVO |
| TestFailureDetail | 個別テスト失敗情報（testCaseId・errorMessage・stackTrace?）を保持するVO |
| SkipReason | `'out-of-scope' \| 'orchestration-migrated'`（v0テスト移行スキップの理由） |
| ExecutionMode | `'parallel' \| 'sequential'`（Vitest 実行モード宣言。実制御はTestRunnerPortに委譲） |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| RegressionRunner | SuiteId → RegressionSuiteDefinition取得 → testCase実行委譲 → TestExecutionSummary生成。CiGateConfigのcoverageThreshold照合によるCIゲートgo/no-go判定。必須スイートID一覧との実行結果照合 | SuiteRegistryPort、TestRunnerPort、ConfigQueryPort |
| MigrationAnalyzer | v0テスト仕様143件の移行対象フィルタリング・Biome修正必要性判定・スキップ対象判定。判定結果をV0TestMigration集約の `migrate()`/`migrateWithModification()`/`skip()` に委譲 | V0SpecReaderPort、MigrationMappingRepositoryPort |
| ImportGuardService | AgentIndependenceTest定義（forbiddenPatterns/allowedPaths）に基づき、対象coreモジュールのimport解析結果をImportAnalyzerPort経由で受け取り、ImportViolation[]を返す。K14/K15非交渉要件の継続的保証が目的（agent-integrationのFallbackVerificationServiceとは文脈が異なる―後述） | ImportAnalyzerPort |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用サービス/集約 |
|---------|------|-----------------|
| SuiteRegistryPort | SuiteId に対応する RegressionSuiteDefinition（testCase一覧）の取得。実装はハードコードまたは設定ファイル読み込み | RegressionRunner |
| TestRunnerPort | testCase定義に基づくVitest実行・CoverageRate計算・TestFailureDetail一覧の返却。Vitest 3.0.0 workspace並列実行の制御含む | RegressionRunner |
| V0SpecReaderPort | v0テスト仕様ファイルの読み取り。v0テスト一覧143件の V0TestId 一覧返却 | MigrationAnalyzer |
| ImportAnalyzerPort | 指定coreモジュールのimport文解析結果の返却（biome-ast-engine連携またはAST解析。各Unit内で独立定義） | ImportGuardService |
| ConfigQueryPort | HarnessConfigV2からcoverageThreshold・CI設定を取得 | RegressionRunner |

### 出力ポート（ドメイン→外部）

| ポート名 | 責務 | 利用サービス/集約 |
|---------|------|-----------------|
| MigrationMappingRepositoryPort | V0TestMigration集約の永続化・`docs/product/construction/regression-suite/v0_v1_test_mapping.md` への読み書き（CRUD） | V0TestMigration集約、MigrationAnalyzer |
| CiGateResultWriterPort | CIゲート統合用テスト結果出力（pass/fail件数・coverageRate・suiteId）。CI連携フォーマットへのシリアライズ | RegressionRunner |

---

## 5. Domain Rules and Invariants

### 不変条件

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | V0TestMigration | `migrate()` は `migrationStatus=pending` の状態でのみ呼び出し可能。二重移行は HarnessError を発生させる |
| INV-2 | V0TestMigration | `migrateWithModification()` は `migrationStatus=pending` の状態でのみ呼び出し可能 |
| INV-3 | V0TestMigration | `skip()` は `migrationStatus=pending` の状態でのみ呼び出し可能 |
| INV-4 | V0TestMigration | `migrationStatus=migrated` または `modified` のとき、`v1TestPath` は必須（null は HarnessError） |
| INV-5 | V0TestMigration | `migrationStatus=modified` のとき、`biomeModificationSpec` は必須（null は HarnessError） |
| INV-6 | RegressionSuiteDefinition | `testCases` は1件以上（空スイート定義は不正） |
| INV-7 | RegressionSuiteDefinition | `suiteId` は `k-requirements`/`gng-gate`/`v0-migration`/`agent-independence` のいずれか |
| INV-8 | CiGateConfig | `coverageThreshold` は 0 より大きく 100 以下の値（HarnessConfigV2のcoverage設定に従う） |
| INV-9 | TestExecutionSummary | `passedCount + failedCount + skippedCount = totalCount`（整合性保証） |
| INV-10 | AgentIndependenceTest | `forbiddenPatterns` は1件以上（禁止パターン空は不正） |
| INV-11 | KRequirementTest | K番号は K1〜K15 の範囲内（K3.5 を含む。K16以上は不正） |
| INV-12 | GngConditionTest | GNG番号は GNG-4/GNG-5/GNG-8 のいずれか（本Unitのスコープ外は不正） |

### V0TestMigration状態遷移

```
[初期状態: pending]
    │
    ├── migrate(v1TestPath)
    │       ↓
    │   [migrated]
    │   * v1TestPath: 必須
    │   * biomeModificationSpec: null
    │
    ├── migrateWithModification(v1TestPath, biomeSpec)
    │       ↓
    │   [modified]
    │   * v1TestPath: 必須
    │   * biomeModificationSpec: 必須
    │
    └── skip(reason)
            ↓
        [skipped]
        * v1TestPath: null
        * biomeModificationSpec: null
        * skipReason: 'out-of-scope' | 'orchestration-migrated'

注: 遷移はすべて一方向。migrated/modified/skipped からの再遷移は INV-1〜3 により禁止。
```

永続化は `MigrationMappingRepositoryPort`（`v0_v1_test_mapping.md`）に委譲。ドメイン層は状態遷移ロジックのみ。

### ImportGuardServiceの検出ルール（agent-integrationとの文脈の違いを明記）

**ImportGuardService（本Unit regression-suite）の目的**:
- **文脈**: H14-02 回帰テストスイートの一部として、K14/K15 非交渉要件を継続的に保証する
- **目的**: 「K14/K15が常に成立し続けること」をCIパイプライン上で回帰的に検証する
- **検証対象**: `AgentIndependenceTest.targetModule`（coreモジュールパス）に指定されたファイル群
- **検出ルール**: `forbiddenPatterns`（`@anthropic-ai/claude-code` 等のエージェント固有 import パターン）に一致する import 文を発見した場合、`ImportViolation` として報告
- **許可ルール**: `allowedPaths`（Adapter層のパスパターン）のみ forbiddenPatterns の import を許容

**FallbackVerificationService（agent-integration Unit）との差異**:
- **文脈**: H11-01 CLI/FSフォールバック保証の確認として、`FallbackCapabilitySpec.noAgentApiImports=true` の宣言との整合性を検証する
- **目的**: 「Hook Adapterがエージェント非依存で動作可能か（フォールバック仕様との整合性）」を確認する
- **検証対象**: `FallbackCapabilitySpec` に宣言されたcoreモジュール群
- 両者は同一の `ImportAnalyzerPort` インターフェースを参照するが、**ドメインルールの主語・目的・検証コンテキストが根本的に異なる**。同一コードに統合してはならない

---

## 6. Data Flow

### H14-01〜H14-03: 回帰テスト実行フロー

```
[CIパイプライン / harness CLIからの入力]
  suiteId: 'k-requirements' | 'gng-gate' | 'agent-independence'
  config: HarnessConfigV2（ConfigQueryPort経由）
         ↓
RegressionRunner.execute(suiteId, ciGateConfig)
  ├── SuiteRegistryPort.getDefinition(suiteId)
  │   → RegressionSuiteDefinition { suiteId, testCases }
  │
  ├── [k-requirements スイート]
  │   testCases: KRequirementTest[] （K1〜K15 / 対象Unit別）
  │   TestRunnerPort.runSuite(testCases)
  │   → TestFailureDetail[] + CoverageRate
  │
  ├── [gng-gate スイート]
  │   testCases: GngConditionTest[] （GNG-4/GNG-5/GNG-8）
  │   TestRunnerPort.runSuite(testCases)
  │   → TestFailureDetail[] + CoverageRate
  │
  ├── [agent-independence スイート]
  │   testCases: AgentIndependenceTest[]
  │   ImportGuardService.verify(agentIndependenceTest)
  │     └── ImportAnalyzerPort.analyzeImports(targetModule)
  │         → import解析結果
  │     → ImportViolation[]（ある場合はTestFailureDetailに変換）
  │
  ├── 結果集約: passedCount/failedCount/skippedCount/totalCount 計算
  ├── TestExecutionSummary 生成（INV-9: 合計整合性チェック）
  ├── CiGateConfig.coverageThreshold との照合 → go/no-go 判定
  └── CiGateResultWriterPort.write(summary) → CI結果出力
         ↓
[TestExecutionSummary]
  passedCount / failedCount / totalCount / coverageRate / failures[]
```

### H15-01〜H15-02: v0テスト移行フロー

```
[移行作業トリガー]
  v0テスト仕様143件の分析開始
         ↓
MigrationAnalyzer.analyzeAll()
  ├── V0SpecReaderPort.readAll()
  │   → V0TestId[] （143件）
  │
  ├── 各V0TestId に対して分析:
  │   ├── 移行対象フィルタリング（v1スコープ判定）
  │   │   スコープ外 → V0TestMigration.skip('out-of-scope')
  │   │
  │   ├── オーケストレーション移管済み判定
  │   │   移管済み → V0TestMigration.skip('orchestration-migrated')
  │   │
  │   ├── Biome修正必要性判定（ESLint固有API参照チェック）
  │   │   修正不要 → V0TestMigration.migrate(v1TestPath)
  │   │   修正必要 → BiomeModificationSpec生成
  │   │             → V0TestMigration.migrateWithModification(v1TestPath, biomeSpec)
  │   │
  │   └── MigrationMappingRepositoryPort.save(v0TestMigration)
  │       → v0_v1_test_mapping.md に永続化
  │
  └── 全件分析完了
         ↓
[H15-02: CIゲート化]
RegressionRunner.execute('v0-migration', ciGateConfig)
  ├── SuiteRegistryPort.getDefinition('v0-migration')
  │   → RegressionSuiteDefinition（MigrationMapping[] から生成）
  │
  ├── TestRunnerPort.runSuite(testCases)
  │   → 全件実行（カバレッジ90%閾値適用）
  │
  └── CiGateResultWriterPort.write(summary)
```

---

## 7. 設計判断記録

### D1: RegressionTestSuiteを集約から降格した理由

Unit定義§4では `RegressionTestSuite` を集約ルートと記載していたが、横断契約§6の集約降格方針に基づき降格する。テストスイートは「実行フロー」であり永続化される独立ライフサイクルを持たない。`testCases` は実行前から変化しない不変の宣言集合であり、`TestExecutionSummary` はステートレスな出力値である。

agent-integrationにおけるLintExecution降格（→ LintRunner + LintReport）と同一パターン。ドメインサービス（RegressionRunner）+ 値オブジェクト群への再構成により、テストスイートの「定義」（RegressionSuiteDefinition）と「実行・集約ロジック」（RegressionRunner）が明確に分離され、各責務の凝集度が高まる。

### D2: V0TestMigration集約ルート維持の理由

v0テスト143件の移行は「状態遷移・識別子・I/O境界」の3要素を満たす正当な集約ルートである。特に `v0_v1_test_mapping.md` という外部永続化境界が存在し、人間レビューを経た移行状態の追跡には識別子ベースの管理が不可欠である。

`migrationStatus=modified` 時に `biomeModificationSpec` が必須となる整合性制約は、集約ルートがカプセル化することで安全に保証される（INV-4/INV-5）。この整合性を VO 群の組み合わせで表現しようとすると、呼び出し元に整合性確保の責務が漏れ出るため不適切。

### D3: ImportGuardServiceをドメイン層に配置する理由

「K14/K15非交渉要件として、coreモジュールはエージェント固有APIをimportしてはならない」という検証ルールはアーキテクチャ上の不変条件であり、ドメイン関心事である。「どのモジュールを検証すべきか」「何が違反か（禁止パターン）」「何が許容か（allowedPaths）」という判断基準はドメイン層が保有する。

「どうimportを解析するか（ASTパース）」はインフラ関心事として `ImportAnalyzerPort` に委譲する。この分離により、AST解析エンジン（biome-ast-engine）の変更がドメインルールに影響しない設計を実現する。

agent-integration の `FallbackVerificationService` との責務の違いは §5 に詳述した通りであり、文脈・目的が異なるため統合してはならない。

### D4: Phase A/B段階性をドメインモデルで表現しない理由

Phase A（H14: k-requirements/gng-gate/agent-independence）と Phase B（H15: v0-migration）という段階性は配備・実装スケジュールの関心事であり、ドメインの業務ルールではない。

ドメインモデルでは4種の `SuiteId` と対応する `RegressionSuiteDefinition` を独立したVOとして並置し、どの SuiteId をいつ実行するかはinfrastructure/presentationが担う（`CiGateConfig.requiredSuiteIds` でPhase Aスコープを宣言）。これにより、Phase Bへの移行時にドメインモデルの変更なく `requiredSuiteIds` に `'v0-migration'` を追加するだけで対応できる。

ドメインモデルに段階性を持ち込むと「Phase A状態」「Phase B状態」というメタ状態が発生し、ドメインの本質的な複雑さ（何を検証するか・どう移行するか）が段階性の複雑さに埋没する。

---

## 8. 品質評価（engineering-perspective）

### ドメインスメルチェック

- **責務混在**: RegressionRunnerはスイート定義取得・結果集約・CiGateConfig適用のロジックのみ担い、Vitest実行・ファイルI/OはTestRunnerPortに委譲 → 問題なし
- **集約の過剰適用**: RegressionTestSuiteを正当な根拠に基づき降格済み。V0TestMigrationは状態遷移・識別子・I/O境界の3要素を満たす → 適切
- **VO乱用**: MigrationMapping（読み取り専用VO）はV0TestMigration集約の状態が確定後にのみ生成され、集約の整合性保証の外で独立して流通する → 適切な設計
- **ドメインの言語乖離**: SuiteId/KRequirementTest/GngConditionTest/AgentIndependenceTest/MigrationStatus は業務のユビキタス言語（H14/H15ストーリー語彙）に準拠 → 問題なし
- **境界不明確**: ImportAnalyzerPortが各Unit内で独立定義されることで、biome-ast-engineインフラ変更の影響を境界内に封じ込め → 境界明確

### SOLID評価

- **SRP**: RegressionRunner（実行・集約）、MigrationAnalyzer（分析・判定）、ImportGuardService（import違反検出）が単一責務に分離 → 遵守
- **OCP**: 新しい SuiteId を追加する場合、SuiteRegistryPort実装を追加するだけでドメイン層変更不要（INV-7 の型拡張は必要だが局所的） → 方針に準拠
- **DIP**: ドメイン層がポートを定義し、infrastructure層がポートを実装（外向き依存） → 遵守
- **ISP**: SuiteRegistryPort/TestRunnerPort/V0SpecReaderPort/ImportAnalyzerPort/ConfigQueryPort/MigrationMappingRepositoryPort/CiGateResultWriterPortが責務ごとに適切に分離 → 遵守

### 段階性・拡張性評価

- Phase A（k-requirements/gng-gate/agent-independence）→ Phase B（v0-migration追加）の移行がドメインモデル変更なしで実現可能
- v0テスト143件の分析コストは `MigrationAnalyzer` のドメインルールに集約されており、人間レビューとの協調設計（最終判断は人間）が明確化されている
- 将来的な ImportAnalyzerPort 実装共有（agent-integration との統合）は infrastructure 層のみの変更で対応可能

### シンプルさ評価

- 集約1つ（V0TestMigration）・値オブジェクト9つ・ドメインサービス3つの構成は本Unitのスコープ（H14+H15）に対して適切な複雑さ
- RegressionTestSuiteの降格により「定義」と「実行」が明確に分離され、各要素の役割が読み手に伝わりやすい
- V0TestMigrationの状態遷移（pending → migrated/modified/skipped）は一方向であり、状態空間が小さく推論しやすい

**評価結果**: 問題なし。設計を確定する。
