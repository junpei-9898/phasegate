# ドメインモデル設計計画: biome-ast-engine

## 1. スコープ

- **対象Unit**: biome-ast-engine（H-01 Biome AST解析基盤）
- **担当ストーリー**: H01-01（v0コア4ルール移植）, H01-02（AIアンチパターン検出）, H01-03（CI統合+ESLint除去）
- **他Unitとの境界**:
  - traceability-model: @unit/@layerメタデータの形式定義を消費（本UnitはL1存在チェックのみ）
  - harness-error: RuleViolationをHarnessError形式に変換して出力
  - validator-system: L1ルール実行結果（RuleViolation[]）を提供
  - config-foundation: ルールの有効/無効・severity設定を`HarnessConfigV2.layers.L1`から受け取る

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類 |
|------|-------------|------|
| RuleDefinition | H01-01, H01-02 | 値オブジェクト（不変のルール定義。RuleNameで識別されるが独立ライフサイクルなし） |
| RuleName | H01-01, H01-02 | 値オブジェクト（RuleDefinitionの識別子） |
| RuleType | H01-01, H01-02 | 値オブジェクト（BiomeNative/RustPlugin/ExternalAnalyzer） |
| RuleViolation | H01-01, H01-02 | 値オブジェクト（ルール検査の出力） |
| LintReport | H01-03 | 値オブジェクト（リント実行結果のレポート） |
| ImportGraph | H01-01 | 値オブジェクト（import依存グラフの解析結果） |
| LayerBoundary | H01-01 | 値オブジェクト（レイヤー間依存方向ルール） |
| LayerName | H01-01 | 値オブジェクト（domain/application/infrastructure/presentation） |
| FilePath | 全体 | 値オブジェクト（Unit内ローカル） |

### 集約・サービスの構成

**集約なし** — biome-ast-engineは「ルール定義は不変、有効状態は外部設定から注入」の構成を採用。

- **RuleDefinitionRegistry**（ドメインサービス）: 8ルールの不変定義を保持。RuleNameで識別される不変RuleDefinitionの集合を管理
- **LintRunner**（ドメインサービス）: ルール実行のオーケストレーション。config-foundationから有効/無効・severity設定を受け取り、対象ファイル群に対してルール評価を実行し、LintReport（値オブジェクト）を返す
- **ImportGraphBuilder**（ドメインサービス）: importグラフを構築。結果はImportGraph値オブジェクトとして返す

### v0 biome-toolchainからの変更点

- **削除**: AntiPatternDetector集約 → RuleDefinitionRegistryに統合（AI antipatternもルール定義として統一管理）
- **削除**: HookConfiguration集約 → agent-integration Unitに移管
- **削除**: CIGateConfiguration集約 → ci-governance Unitに移管
- **削除**: BiomeRule集約 → 不変RuleDefinition + 設定注入に変更
- **削除**: LintExecution集約 → LintRunner（ドメインサービス）+ LintReport（値オブジェクト）に降格
- **簡素化**: 集約を0個に削減。AST解析エンジンとしては不変のルール定義+ドメインサービスが自然

## 3. 設計方針

- **RuleDefinitionは不変**: 各ルールの定義（名前、タイプ、検出対象、fix_exampleテンプレート）は変更されない。有効/無効・severityはconfig-foundationから注入される設定値
- **RuleType多態性**: `BiomeNative | RustPlugin | ExternalAnalyzer`で検出方式の差異をドメインレベルで表現。no-code-duplication/no-ghost-fileはExternalAnalyzerとして区別
- **Shared Kernelとの関係**:
  - HarnessError型（harness-error）: RuleViolation→HarnessError変換はInfrastructure層のアダプターが担当
  - @unit/@layerメタデータ仕様（traceability-model）: require-unit-comment/require-layer-commentのルール定義内で参照
  - Layer依存方向: LayerBoundaryは横断契約（cross_cutting_decisions.md §2）で固定された正規語彙（domain/application/infrastructure/presentation）に準拠
- **v0パリティ**: v0 ESLintルールとの検出等価性はドメイン層ではなくテスト層で保証（パリティテスト）

## 4. QA（不明点・確認事項）

### [Question] Q1: BiomeRule集約の粒度 — 8ルール個別 vs ルールカタログ集約

v0ではBiomeRule集約が各ルールを個別エンティティとして管理していた。v1でも同様に8個のBiomeRuleインスタンスを管理する方式でよいか、それともRuleCatalog集約（全ルールを一括管理）に変更すべきか？

**決定**: RuleDefinitionRegistry（ドメインサービス）として8ルールの不変定義を管理。集約ではなく、不変のルール定義レジストリとして扱う。各ルールは独立したRuleDefinitionエンティティ（不変）で、RuleNameで識別される。

[Answer] codexレビュー合意: 「8個の集約」ではなく「不変なRuleDefinitionのレジストリ」が最適。

### [Question] Q2: AI antipatternルール（L1-005〜008）のRuleType

v0ではAntiPatternDetector集約が独立していたが、v1ではRuleDefinitionRegistryに統合する。no-any-abuse/no-comment-floodはBiomeネイティブルール、no-code-duplication/no-ghost-fileは外部スクリプト依存だったが、v1では全てBiomeネイティブで実装する想定か？

**決定**: RuleTypeを`BiomeNative | RustPlugin | ExternalAnalyzer`の3種で定義。Biome外実装（外部スクリプト等）もExternalAnalyzerとして表現し、v0差分を正しく吸収。実装方式の詳細は論理設計で決定。

[Answer] codexレビュー合意: BiomeNativeだけでなくExternalAnalyzerも表現できる名前が必要。

### [Question] Q3: LintExecution集約の必要性

CLIツールの特性上、LintExecutionの「ライフサイクル管理」が過剰設計にならないか？

**決定**: LintExecution集約は廃止。LintRunner（ドメインサービス）がルール実行を担当し、LintReport（不変値オブジェクト）を返す構成に変更。CI統合で必要なバリデータ別Pass/Fail詳細や実行時間はLintReportの属性として表現。

[Answer] codexレビュー合意: 集約よりドメインサービスが自然。「実行結果の一貫した生成」が必要であり、ライフサイクル管理は不要。

## 5. 前提条件・リスク

- **Rust環境依存**: カスタムプラグイン（RustPlugin）のビルドにRust 1.70.0+が必要
- **Biome API安定性**: Biome Plugin APIが安定版でない場合、ドメインモデルの抽象化が重要
- **v0パリティリスク**: ESLint→Biome移行時に検出精度の差異が発生する可能性
- **LayerBoundary語彙**: 横断契約で固定されたv1正規語彙（domain/application/infrastructure/presentation）への統一が前提
