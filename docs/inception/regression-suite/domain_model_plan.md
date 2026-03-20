# ドメインモデル設計計画: regression-suite

> **作成日**: 2026-03-19
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: regression-suite（H-14/H-15 回帰保証 + v0テスト資産移行）
> **担当ストーリー**: H14-01〜H14-03、H15-01〜H15-02

---

## 1. スコープ

- **対象Unit**: regression-suite
- **担当ストーリー**:
  - H14-01: K1-K13回帰テスト整備（L1-L4バリデータ正常動作、Phase Gate、Biome AST、メタデータ強制、テスト品質ルール等）
  - H14-02: K14-K15回帰テスト + エージェント非依存ガード（Phase Dependency Model 3層構造、plan文書必須）
  - H14-03: Go/No-Go Gate品質側3条件回帰テスト（GNG-4/GNG-5/GNG-8）
  - H15-01: v0 143テスト仕様のv1再実装（移行対象分析・対応表作成・Biome対応修正）
  - H15-02: v1再実装テストのCIゲート化（全件実行・カバレッジ90%閾値）
- **他Unitとの境界**:
  - harness-error: 回帰テスト失敗時のエラー出力フォーマット（HarnessError型）
  - config-foundation: HarnessConfigV2からカバレッジ閾値・CI設定を参照
  - biome-ast-engine: K3回帰テストでのBiome AST解析結果を消費。エージェント非依存ガードでのimport解析に活用
  - phase-dependency-model: K2/K14回帰テストでのphase-gate 3層構造を消費
  - traceability-model: K3.5回帰テストでの@unit/@layerメタデータ仕様を消費
  - validator-system, harness-api, nyquist-validation, ci-governance等: Phase A/B段階的消費

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| RegressionTestSuite | H14-01〜H14-03 | ※集約評価対象（後述） |
| V0TestMigration | H15-01〜H15-02 | ※集約評価対象（後述） |
| KRequirementTest | H14-01〜H14-02 | 値オブジェクト（K番号・テスト対象・検証条件の定義） |
| GngConditionTest | H14-03 | 値オブジェクト（GNG番号・テスト対象・検証条件の定義） |
| AgentIndependenceTest | H14-02 | 値オブジェクト（検証対象import・許可/禁止パターン） |
| MigrationMapping | H15-01 | 値オブジェクト（v0テストID→v1テストパスの対応表エントリ） |
| CiGateConfig | H14-01〜H14-03, H15-02 | 値オブジェクト（必須テストスイートID一覧・カバレッジ閾値） |
| TestExecutionSummary | H14-01〜H14-03, H15-02 | 値オブジェクト（通過数/失敗数/全体数/カバレッジ） |
| RegressionRunner | H14-01〜H14-03 | ドメインサービス（スイート選択実行・結果集約） |
| MigrationAnalyzer | H15-01 | ドメインサービス（移行対象分析・Biome修正必要性判定） |
| ImportGuardService | H14-02 | ドメインサービス（coreモジュールimport解析・エージェント固有API検出） |

### 集約候補1: RegressionTestSuiteの評価

Unit定義§4では `RegressionTestSuite` を**集約ルート**と記載している。横断契約§6の集約降格方針に照らして検討する。

**集約として維持しない根拠**:
- suiteId（k-requirements / gng-gate / v0-migration / agent-independence）は識別子として機能するが、テストスイートそのものは実行するたびに新たな結果が生成される「実行フロー」であり、永続化される独立ライフサイクルを持たない
- `testCases`（KRequirementTest / GngConditionTest等のVO一覧）はスイートの「定義」であり、実行前から変化しない不変の宣言集合である
- `executionResult`（TestExecutionSummary）は実行の出力結果VOであり、スイート集約が「所有」する永続的状態ではなくステートレスな出力値である
- 横断契約§6の降格パターン「ステートレスな計算処理のみ、永続化不要、状態遷移なし」に合致する

**降格後の設計**:
- `SuiteId`（値オブジェクト）: スイートIDの型安全な識別子
- `RegressionSuiteDefinition`（値オブジェクト）: スイートの定義（suiteId + testCases一覧の不変宣言）
- `RegressionRunner`（ドメインサービス）: SuiteId → TestExecutionSummary の実行・結果集約ロジック
- `TestExecutionSummary`（値オブジェクト）: 実行結果の出力VO

**結論**: RegressionTestSuiteは集約から降格。ドメインサービス（RegressionRunner）+ 値オブジェクト群として設計する。横断契約§6のLintExecution降格（→ LintRunner + LintReport）と同一パターン。

### 集約候補2: V0TestMigrationの評価

**集約ルートとして維持する根拠**:
- `migrationStatus`（pending / migrated / modified / skipped）という明確な状態遷移を持つ。初期状態`pending`から`migrated`または`modified`または`skipped`へ遷移するライフサイクルがある
- `v0TestId`（識別子）+ `migrationStatus`の組み合わせで一意に識別されるエンティティとして扱うべき存在であり、値等価性ではなく同一性で管理される
- I/O境界として`docs/product/construction/regression-suite/v0_v1_test_mapping.md`というファイルが存在し、143件の移行状態を永続化・更新する責務がある
- `biomeModification`（Biome修正内容）はmigrationStatusの`modified`状態に付随する情報であり、状態遷移の文脈で保持される

**集約バウンダリの確認**:
- V0TestMigrationは単一のv0テスト仕様単位（v0TestId）で独立したライフサイクルを持つ
- MigrationMapping（値オブジェクト）はV0TestMigrationの「完了済み対応表エントリ」としてV0TestMigration集約から生成される読み取りVO

**結論**: V0TestMigrationは集約ルートとして採用。状態遷移・識別子・I/O境界の3要素を満たす。

### 全体構成の結論

- **集約**: V0TestMigration（1個）
- **エンティティ**: なし（V0TestMigrationが集約ルート兼エンティティ）
- **ドメインサービス**: RegressionRunner、MigrationAnalyzer、ImportGuardService（3個）
- **値オブジェクト**: SuiteId、RegressionSuiteDefinition、KRequirementTest、GngConditionTest、AgentIndependenceTest、MigrationMapping、CiGateConfig、TestExecutionSummary、BiomeModificationSpec

---

## 3. 設計方針

### 3.1 RegressionTestSuiteの降格: ドメインサービス + VO群への再構成

```
[スイート定義（不変宣言）]
  RegressionSuiteDefinition {
    suiteId: SuiteId           // k-requirements / gng-gate / v0-migration / agent-independence
    testCases: ReadonlyArray<
      KRequirementTest | GngConditionTest | AgentIndependenceTest | MigrationMapping
    >
  }

[RegressionRunner（ドメインサービス）]
  execute(suiteId: SuiteId, context: RegressionContext): TestExecutionSummary
  ├── SuiteId → RegressionSuiteDefinition取得（SuiteRegistryPort）
  ├── 各testCaseを独立実行（テストランナー委譲）
  └── 結果集約 → TestExecutionSummary

[TestExecutionSummary（出力VO）]
  totalCount: number
  passedCount: number
  failedCount: number
  skippedCount: number
  coverage?: CoverageRate
  failures: TestFailureDetail[]
```

### 3.2 V0TestMigrationの集約設計

```
[V0TestMigration（集約ルート）]
  v0TestId: V0TestId            // v0テスト仕様ID（識別子）
  migrationStatus: MigrationStatus
  v1TestPath?: V1TestPath       // 移行先ファイルパス（migrated/modifiedのとき存在）
  biomeModification?: BiomeModificationSpec  // Biome修正内容（modifiedのとき存在）

[状態遷移]
  pending → migrate(v1TestPath) → migrated
  pending → migrateWithModification(v1TestPath, biomeSpec) → modified
  pending → skip(reason) → skipped

[生成するVO]
  toMigrationMapping(): MigrationMapping   // 完了時のみ（migrated/modified）
```

### 3.3 ImportGuardServiceのドメイン配置

H14-02のエージェント非依存ガードは「エージェント固有API（`@anthropic-ai/claude-code`等）をcoreモジュールがimportしていないこと」を検証するルールであり、これはアーキテクチャ上の不変条件（K14対応）であるドメイン関心事である。

agent-integrationのFallbackVerificationServiceとの責務分担:
- **ImportGuardService（本Unit）**: regression-suite文脈での回帰テストとして検証。「K14/K15非交渉要件の継続的保証」が目的
- **FallbackVerificationService（agent-integration）**: フォールバック仕様（FallbackCapabilitySpec）との整合性検証。「Hook Adapterがエージェント非依存で動作可能か」が目的

両者は同一の技術処理（import解析）を参照するが、目的・文脈・検証対象が異なる。ドメイン層はImportAnalyzerPort（共通ポート or 各Unit個別ポート）を通じてimport解析インフラに委譲する。

```
[ImportGuardService（ドメインサービス）]
  verify(target: AgentIndependenceTest): ImportViolation[]
  ├── target.allowedImportPatterns / target.forbiddenImportPatterns
  ├── ImportAnalyzerPort.analyzeImports(modulePath)
  └── 違反 → ImportViolation（VO）として報告
```

### 3.4 RegressionRunnerのドメイン純粋責務

「スイート選択・実行」はインフラ層（テストランナー実行・ファイル探索）の操作であるが、ドメイン層のRegressionRunnerには純粋な責務が存在する:

- **スイート選択ルール**: SuiteIdに基づいてRegressionSuiteDefinitionを取得し、実行対象のtestCase一覧を決定するロジック（どのK番号テストをどのスイートが含むか）
- **結果集約ルール**: 個別testCase結果からTestExecutionSummaryを構築するロジック（カバレッジ閾値判定・pass/fail集計）
- **CiGateConfig適用ルール**: CiGateConfigの必須スイートID一覧と実際の実行結果を照合し、CI全体のgo/no-go判定を行うルール

実際のVitest実行・ファイルI/OはTestRunnerPort（インフラ層）に委譲する。

### 3.5 MigrationAnalyzerのドメイン純粋責務

v0テスト仕様の移行対象分析において、ドメイン層が保有するルール:

- **移行対象フィルタリングルール**: 143件のv0テスト仕様のうち、v1スコープ（品質ハーネス関連）に含まれるものを選別する判定ロジック
- **Biome修正必要性判定ルール**: テストコードがESLint固有APIを参照しているかを判定し、`biomeModification`として記述する分析ロジック
- **スキップ対象判定ルール**: オーケストレーションパッケージ移管済み機能のテストをskipと判定するルール

実際のファイル読み取り・コード解析はMigrationSourcePort（インフラ層）に委譲する。

### 3.6 Phase A/B段階性のドメイン表現

Phase A（H14）とPhase B（H15）という段階性は配備・実装スケジュールの関心事であり、ドメインモデルで表現しない。ドメイン層は:
- Phase Aスコープ: k-requirements / gng-gate / agent-independence スイート定義
- Phase Bスコープ: v0-migration スイート定義 + V0TestMigration集約

として独立したモデルで表現し、統合はinfrastructure/presentationが担う。

### 3.7 テスト独立性のドメイン表現

各回帰テスト（KRequirementTest, GngConditionTest等）は他のテストに依存しないという不変条件をVOの設計に反映する。各VOは自己完結した検証定義を保持し、実行順序・他テスト結果への依存を持たない。

---

## 4. QA（設計判断の根拠）

### Q1: RegressionTestSuiteを集約から降格した場合、スイートIDごとの定義はどこが所有するか

**質問**: RegressionTestSuiteを集約から降格した場合、`k-requirements`スイートにK1-K13のKRequirementTest一覧を紐付ける定義はどこに置くか？

**推奨案**: `RegressionSuiteDefinition`（値オブジェクト）として定義し、`SuiteRegistryPort`（インフラ層）が各スイートIDに対応するDefinitionを返す実装を持つ。SuiteRegistryの実装はハードコードまたは設定ファイル読み込みとし、ドメイン層はポートを通じて取得するのみ。

**結論**: `RegressionSuiteDefinition`をVOとして定義。SuiteRegistryPortでインフラ層に委譲。

### Q2: TestExecutionSummaryのカバレッジ計算はドメイン層か

**質問**: カバレッジ90%閾値判定はドメインルールか、インフラ層（テストランナー）の関心事か？

**推奨案**: `CiGateConfig.coverageThreshold`（値オブジェクトのフィールド）にしきい値を宣言し、`RegressionRunner`がTestExecutionSummaryの`coverage`値としきい値を比較してCIゲートの通過/失敗を判定するのがドメイン層の責務。実際のカバレッジ数値の計算はTestRunnerPort（インフラ層）が行い、`CoverageRate`型としてドメイン層に返す。

**結論**: カバレッジ閾値判定ロジックはドメイン層（RegressionRunner）。数値計算はTestRunnerPortに委譲。

### Q3: ImportGuardServiceとFallbackVerificationServiceの実装共有

**質問**: agent-integrationのFallbackVerificationServiceと同一のimport解析インフラを参照する場合、ImportAnalyzerPortを共通化するか？

**推奨案**: ポートのインターフェース定義は各Unit内に独立して定義する（biome-ast-engineのルール適用と同様に、語彙表を横断契約で合わせつつ各Unit固有定義を持つ）。インフラ層の実装（biome-ast-engine連携またはファイル読み取り）は共有ライブラリとして別途検討するが、ドメイン層の分離は維持する。

**結論**: `ImportAnalyzerPort`は各Unit内で独立定義。インフラ実装の共有はWave 2後半で改めて検討。

### Q4: V0TestMigrationのv0TestId識別子はどう定義するか

**質問**: v0テスト仕様143件の識別子（v0TestId）はv0のテストファイルパスか、連番IDか？

**推奨案**: `V0TestId`を値オブジェクトとして定義し、v0テストファイルの相対パス（`scripts/__tests__/xxx.test.ts`等）を正規形式とする。これにより`v0_v1_test_mapping.md`の対応表エントリとの整合性を保ちつつ、文字列比較による同一性確認が可能になる。

**結論**: `V0TestId`はv0テストファイルの相対パスをラップした値オブジェクト。

### Q5: RegressionRunnerはVitest実行をどこまで抽象化するか

**質問**: H14-01のCIゲート組み込みにあたり、RegressionRunnerはVitest 3.0.0 workspace機能の並列実行設定まで管理するか？

**推奨案**: RegressionRunnerのドメイン責務は「スイート定義取得→testCase実行委譲→結果集約」のフローのみ。Vitestのworkspace設定・並列実行はinfrastructure層（TestRunnerPort実装）が担う。ドメイン層は`executionMode: 'parallel' | 'sequential'`をCiGateConfigのフィールドとして宣言するだけで、実際の並列化制御はポート実装に委ねる。

**結論**: `CiGateConfig.executionMode`として宣言のみ。並列実行制御はTestRunnerPortに委譲。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 | 利用サービス |
|--------|------|------|------------|
| SuiteRegistryPort | 外部→ドメイン | SuiteIdに対応するRegressionSuiteDefinition（testCase一覧）の取得 | RegressionRunner |
| TestRunnerPort | 外部→ドメイン | testCase定義に基づくVitest実行・CoverageRate・個別テスト結果の返却 | RegressionRunner |
| MigrationSourcePort | 外部→ドメイン | v0テスト仕様ファイルの読み取り・v0テスト一覧143件の取得 | MigrationAnalyzer |
| MigrationPersistencePort | ドメイン→外部 | V0TestMigration集約の永続化・v0_v1_test_mapping.md読み書き | V0TestMigration（集約） |
| ImportAnalyzerPort | 外部→ドメイン | 指定モジュールのimport文解析結果の返却（biome-ast-engine連携） | ImportGuardService |
| ConfigQueryPort | 外部→ドメイン | HarnessConfigV2からカバレッジ閾値・CI設定の取得 | RegressionRunner |

---

## 6. ドメインモデル概要

### 所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| V0TestMigration | 集約ルート（エンティティ） | v0TestId・migrationStatus（pending/migrated/modified/skipped）・v1TestPath・biomeModificationSpec を保持。状態遷移メソッド（migrate/migrateWithModification/skip）を持つ |
| SuiteId | 値オブジェクト | `'k-requirements' \| 'gng-gate' \| 'v0-migration' \| 'agent-independence'` の型安全な識別子 |
| RegressionSuiteDefinition | 値オブジェクト | suiteId + testCases（KRequirementTest等のVO一覧）の不変宣言。スイートの定義そのもの |
| KRequirementTest | 値オブジェクト | K番号（K1-K15）・テスト対象Unit・検証条件（アサーション仕様）を保持する不変定義 |
| GngConditionTest | 値オブジェクト | GNG番号（GNG-4/5/8）・テスト対象・検証条件を保持する不変定義 |
| AgentIndependenceTest | 値オブジェクト | 検証対象モジュールパス・許可importパターン・禁止importパターンを保持する不変定義 |
| MigrationMapping | 値オブジェクト | v0TestId → v1TestPath の対応表エントリ。V0TestMigration集約が完了時に生成する読み取り専用VO |
| CiGateConfig | 値オブジェクト | 必須スイートID一覧・coverageThreshold（90%）・executionModeを保持する設定VO |
| TestExecutionSummary | 値オブジェクト | totalCount/passedCount/failedCount/skippedCount/coverage?/failures[]を保持する実行結果VO |
| BiomeModificationSpec | 値オブジェクト | ESLint→Biome移行に伴う修正内容（置換対象API・修正理由・修正後API名）を保持するVO |
| RegressionRunner | ドメインサービス | SuiteIdを受け取りRegressionSuiteDefinition取得→testCase実行委譲→TestExecutionSummary生成を担う |
| MigrationAnalyzer | ドメインサービス | v0テスト仕様を分析し、移行ステータス判定・BiomeModificationSpec生成・V0TestMigrationへの移行指示を担う |
| ImportGuardService | ドメインサービス | AgentIndependenceTestの定義に基づき、対象モジュールのimport解析結果をImportAnalyzerPortから受け取り、ImportViolation[]を返す |

### 補助型

| 型 | 説明 |
|---|------|
| MigrationStatus | `'pending' \| 'migrated' \| 'modified' \| 'skipped'` |
| V0TestId | v0テストファイルの相対パスをラップした値オブジェクト |
| V1TestPath | v1テスト実装ファイルの相対パスをラップした値オブジェクト |
| CoverageRate | カバレッジ率（0-100のnumber）をラップした値オブジェクト |
| ImportViolation | 違反import情報（modulePath・forbiddenPackage・violationMessage）を保持するVO |
| TestFailureDetail | 個別テスト失敗情報（testCaseId・errorMessage・stackTrace?）を保持するVO |

---

## 7. 不変条件（予定）

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | V0TestMigration | migrate()はmigrationStatus=pendingの状態でのみ呼び出し可能（二重移行は不正） |
| INV-2 | V0TestMigration | migrateWithModification()はmigrationStatus=pendingの状態でのみ呼び出し可能 |
| INV-3 | V0TestMigration | migrationStatus=migratedまたはmodifiedのとき、v1TestPathは必須（nullはエラー） |
| INV-4 | V0TestMigration | migrationStatus=modifiedのとき、biomeModificationSpecは必須（nullはエラー） |
| INV-5 | RegressionSuiteDefinition | testCasesは1件以上（空スイート定義は不正） |
| INV-6 | CiGateConfig | coverageThresholdは0より大きく100以下の値（HarnessConfigV2のcoverage設定に従う） |
| INV-7 | TestExecutionSummary | passedCount + failedCount + skippedCount = totalCount |
| INV-8 | AgentIndependenceTest | forbiddenImportPatternsは1件以上（禁止パターン空は不正） |
| INV-9 | KRequirementTest | K番号はK1-K15の範囲内（K3.5を含む） |
| INV-10 | GngConditionTest | GNG番号はGNG-4/GNG-5/GNG-8のいずれか（本Unitのスコープ） |

---

## 8. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| **依存: harness-error** | HarnessError型の確定が前提。Wave 1で実装済み |
| **依存: config-foundation** | HarnessConfigV2のカバレッジ閾値設定構造の確定が前提。Wave 1で実装済み |
| **依存: Phase A対象Unit（Wave 1-2）** | biome-ast-engine, phase-dependency-model, traceability-model等のWave 1-2 Unitの実装完了がH14テスト実装の前提。Wave 2後半から順次着手可能 |
| **依存: Phase B対象Unit（Wave 3含む全Unit）** | H15-01/H15-02のv0テスト移行はskill-quality, ci-governance等Wave 3 Unit完了後が前提 |
| **リスク: v0テスト仕様143件の対応表作成コスト** | v0テスト仕様のスコープ判定（v1移行対象 vs オーケストレーション移管 vs スキップ）は手動分析が必要。MigrationAnalyzerが自動分類を補助するが、最終判断は人間レビューが必要。H15-01の工数に大きく影響する |
| **リスク: Biome移行に伴うテスト修正範囲の不確実性** | ESLint固有APIへの依存がどの程度あるかはv0コードベース分析後に判明する。BiomeModificationSpecの実装詳細はMigrationAnalyzer設計時に確定が必要 |
| **リスク: ImportAnalyzerPortのbiome-ast-engine連携** | biome-ast-engineのimport解析結果を活用する場合、wave 1実装との依存関係が発生する。biome-ast-engineのWASMプラグイン経由での解析結果フォーマットと、ImportGuardServiceが期待するインターフェースの整合が必要 |
| **リスク: CIゲート実行時間** | K1-K15 + GNG + v0移行テスト全件のCI実行はテストスイート規模が大きく実行時間が長くなる可能性がある。Vitestのworkspace並列実行設定（TestRunnerPortに委譲）が適切に設計されないとCIボトルネックになる |
| **リスク: agent-integrationとのImportAnalyzerPort重複** | ImportGuardService（本Unit）とFallbackVerificationService（agent-integration）が同一インフラを参照する場合、将来的に共通ポート実装の共有化が必要になる可能性がある。Wave 2後半での設計時に要検討 |

---

## 9. 承認

- [ ] 人間承認済み（Phase 2着手許可）
