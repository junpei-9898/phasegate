# ドメインモデル設計計画: validator-system

> **作成日**: 2026-03-17
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: validator-system（H-08 L2-L4バリデータ体系）
> **担当ストーリー**: H08-01〜H08-06

---

## 1. スコープ

- **対象Unit**: validator-system
- **担当ストーリー**:
  - H08-01: L2 test-qualityバリデータ
  - H08-02: L3 security+performanceバリデータ
  - H08-03: L3 coverageバリデータ
  - H08-04: L4 drift-detectバリデータ
  - H08-05: L4 consistency-checkバリデータ
  - H08-06: L4 dead-codeバリデータ
- **他Unitとの境界**:
  - biome-ast-engine: L1結果（RuleViolation[]）を参照のみ。本Unitは**L2-L4のみ**担当
  - harness-error: 全バリデータのエラーをHarnessError型で出力
  - config-foundation: HarnessConfigV2からレイヤー有効/無効・閾値・Preset設定を取得
  - phase-dependency-model: L2 phase-gateバリデータの前提条件定義を消費
  - traceability-model: L2 metadataバリデータの検証対象仕様を消費
  - nyquist-validation: L3 nyquistバリデータの実行ロジック（AcCoverageGatePolicy）を消費
  - adr-foundation: `adr_ref`フィールドの参照先ADR実在性検証

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| Validator | H08-01〜H08-06 | **VO候補**（後述参照） |
| ValidatorId | 全体 | 値オブジェクト（L2-001〜L4-003のID体系） |
| ValidationResult | 全体 | 値オブジェクト（実行結果スナップショット。pass/fail + HarnessError一覧） |
| ValidationRule | H08-01〜H08-06 | 値オブジェクト（ルール名・検証ロジック・エラーテンプレート） |
| LayerConfig | 全体 | 値オブジェクト（L2/L3/L4の有効/無効・閾値設定） |
| DriftReport | H08-04 | 値オブジェクト（乖離方向・Unit名・対象要素・推奨アクション） |
| ConsistencyReport | H08-05 | 値オブジェクト（不一致箇所・検証対象ペア） |
| DeadCodeReport | H08-06 | 値オブジェクト（未使用エクスポート・到達不能コード一覧） |
| ValidatorRegistry | 全体 | ドメインサービス（バリデータID一元管理・選択実行） |
| ValidatorExecutionService | 全体 | ドメインサービス（順次実行・結果集約） |
| DriftDetectionService | H08-04 | ドメインサービス（設計⇔コード双方向乖離検出） |
| ConsistencyCheckService | H08-05 | ドメインサービス（文書間レイヤー整合性検証） |
| DeadCodeDetectionService | H08-06 | ドメインサービス（未使用エクスポート・到達不能コード検出） |

### 集約の評価: Validatorを集約ルートとするか

Unit定義では「Validator（集約ルート）」と記載されているが、横断契約§6の再評価方針に照らして検討する。

**集約ルートである根拠**:
- ValidatorIdで識別される
- enabled状態を持つ（HarnessConfigV2から注入）
- ValidationRule[]を束ねるコンテナとして機能

**集約ルートに反する根拠**:
- enabled状態はHarnessConfigV2から導出される外部依存値。独立したライフサイクルがない
- 永続化が不要。毎回HarnessConfigV2から構築
- biome-ast-engineのRuleDefinitionが同様のパターンでVO化された先例がある

**決定**: `ValidatorDefinition`（値オブジェクト）に降格する。`validatorId / layer / rules[] / enabledCondition`を不変プロパティとして持ち、enabled状態はconfig-foundationから注入する`LayerConfig`との組み合わせで評価する。`ValidatorRegistry`（ドメインサービス）が全バリデータ定義のカタログを管理するRuleDefinitionRegistryと同等のパターンを採用する。

### 内部サブモジュール構造

6バリデータを3サブグループに分割して関心を分離する。ただしドメインモデルは統一インターフェースで表現する。

| サブグループ | バリデータ | 分析手段 |
|------------|---------|---------|
| l2/ | test-quality (L2-003) | AST解析（コードパターン検査） |
| l3/ | security (L3-001), performance (L3-002), coverage (L3-003), nyquist (L3-004) | AST解析 + 外部データ参照 |
| l4/ | drift-detect (L4-001), consistency-check (L4-002), dead-code (L4-003) | ファイルシステム比較・AST解析 |

---

## 3. 設計方針

### 3.1 集約なし、VO中心の設計

biome-ast-engineと同じパターン：ステートレスなバリデーション実行ドメインであり、集約を必要としない。

- **ValidatorDefinition VO**: バリデータの不変定義（validatorId/layer/rules/errorTemplate）
- **ValidatorId VO**: `L{n}-{nnn}`形式（横断契約§3）の正規コード
- **ValidationResult VO**: 実行結果スナップショット（pass/fail + errors[]）
- **LayerConfig VO**: HarnessConfigV2.layers.L2/L3/L4から注入される設定値。enabled/閾値を保持
- **DriftReport VO**: 乖離検出結果（direction: "design→code" | "code→design", unitName, element, recommendation）
- **ConsistencyReport VO**: 整合性検証結果（mismatchPairs[], checkTargets[]）
- **DeadCodeReport VO**: 未使用エクスポート/到達不能コード一覧

### 3.2 L2 phase-gate / L2 metadata の位置づけ

L2 phase-gate（L2-001）の実行ロジックはphase-dependency-modelが定義し、本Unitが**実行主体**となる。
L2 metadata（L2-002）の検証対象仕様はtraceability-modelが定義し、本Unitが**実行主体**となる。
L3 nyquist（L3-004）の実行ロジックはnyquist-validationの`AcCoverageGatePolicy`を本Unitが**呼び出す**。

これらの「他Unit定義ロジックを本Unitが実行する」パターンを`ValidatorDefinition`内の`policyRef`フィールドで表現し、ValidatorRegistryが解決する。

### 3.3 Validator ID Registryとしての公開契約

`ValidatorRegistry`は「全バリデータID一覧（L2-001〜L4-003）+ 実行インターフェース」をCross-Unit Contractとして公開する。harness-api, quick-mode等のConsumerがバリデータIDを指定して選択実行できるアーキテクチャを実現する。

### 3.4 HarnessError出力パイプライン

全バリデータの`ValidationResult.errors`はHarnessError型（harness-error所有）に統一。`code`フィールドにValidatorId（L2-003等）を使用。`fix_example`と`adr_ref`をエラー定義に含める。

### 3.5 Preset連動

strictプリセット限定機能（bundleSizeLimit: H08-02、deadCodeGC: H08-06）の有効/無効判定は`LayerConfig VO`に集約する。バリデータ側でPreset判定ロジックを持たない。

---

## 4. QA（設計判断の根拠）

### Q1: ValidatorをVOに降格することの影響

**質問**: Unit定義の「Validator（集約ルート）」をValidatorDefinition VOに変更することで、harness-api/quick-modeのConsumerに影響はないか？

**決定**: 影響なし。ConsumerはValidatorIdを指定してValidatorRegistryに問い合わせるインターフェースを使用する。内部表現（集約かVOか）はConsumerから隠蔽される。Cross-Unit ContractはValidatorRegistry（ドメインサービス）のインターフェースとして定義する。

### Q2: L4 drift-detect / consistency-checkのドメインモデル複雑性

**質問**: drift-detectは「設計文書のパース・比較」を伴い、ファイルシステム上のMarkdownを解析する。このロジックはドメイン層に置くべきか、インフラ層に委ねるべきか？

**決定**: ドメイン層は「何を比較するか（比較ルール・乖離の定義）」を持つ。実際のファイル読み取りとMarkdownパースはインフラ層のPortが担当する。`DesignDocumentPort`（設計文書読み取り）と`SourceCodeAnalyzerPort`（実装コード解析）を定義し、ドメイン層は受け取ったデータ構造の比較ロジックのみを持つ。

### Q3: L3 nyquist（L3-004）の実行ロジック分離

**質問**: L3 nyquistバリデータの実行ロジックはnyquist-validationが所有し、本Unitが実行主体となる。この委譲をドメインモデルでどう表現するか？

**決定**: `ValidatorDefinition`に`externalPolicyRef?: string`フィールドを追加し、nyquist/phase-gate/metadataの外部ポリシー参照を宣言的に記録する。実行時にValidatorRegistryがポリシーを解決する。

### Q4: DeadCodeDetectionServiceとbiome-ast-engineの分析結果共有

**質問**: dead-code検出（H08-06）はimportグラフ解析を伴う。biome-ast-engineのImportGraphを再利用するか、独自に解析するか？

**決定**: `SourceAnalysisPort`を通じてbiome-ast-engineの解析結果（ImportGraph相当）を受け取るPortを定義する。biome-ast-engineのImportGraphを直接importするのではなく、Port経由で構造化されたデータを受け取ることで依存を疎結合に保つ。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 |
|--------|------|------|
| DesignDocumentPort | 外部→ドメイン | 設計文書（domain_model.md等）の構造化データ読み取り |
| SourceCodeAnalyzerPort | 外部→ドメイン | 実装コードのAST解析結果（import一覧・エクスポート一覧）取得 |
| TestQualityAnalyzerPort | 外部→ドメイン | テストコードのAAAパターン・命名規約解析結果取得 |
| SecurityPatternScannerPort | 外部→ドメイン | ハードコード秘密・SQLインジェクションパターン検出 |
| CoverageReportPort | 外部→ドメイン | テストカバレッジレポート（JSON形式）読み取り |
| AcCoveragePolicyPort | 外部→ドメイン | nyquist-validationのAcCoverageGatePolicy取得 |
| PhaseGatePolicyPort | 外部→ドメイン | phase-dependency-modelのPhase Gate前提条件取得 |
| MetadataPolicyPort | 外部→ドメイン | traceability-modelのメタデータ検証仕様取得 |
| ValidatorConfigPort | 外部→ドメイン | HarnessConfigV2からL2/L3/L4設定を取得 |

---

## 6. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 依存: Wave1完了 | harness-error（HarnessError型）・config-foundation（HarnessConfigV2型）・phase-dependency-model・traceability-model・biome-ast-engine の実装完了が前提 |
| 依存: nyquist-validation | L3-004のAcCoveragePolicyPortはnyquist-validationの並列設計・実装に依存。Phase A（L2-L3）を先行着手し、Phase B（L4）後追いの段階的実装も検討 |
| リスク: L4の設計文書パース複雑性 | Markdownのパース・比較ロジックは複雑になる可能性がある。DesignDocumentPortの抽象化をどの粒度で定義するかが品質に直結する |
| リスク: 6バリデータの肥大化 | 単一Unitに6バリデータを持つため実装量が多い。l2/l3/l4サブモジュール分離と独立テストスイートで管理する |

---

## 7. 承認

- [ ] 人間承認済み（Phase 2着手許可）
