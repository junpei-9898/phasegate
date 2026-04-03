# ドメインモデル設計計画: config-foundation

## 1. スコープ

- **対象Unit**: config-foundation（H-04 phasegate.config.json v2）
- **担当ストーリー**: H04-01（v2スキーマ定義）, H04-02（Preset System）, H04-03（デフォルト無効化+enable/disable）
- **他Unitとの境界**:
  - 全Unit: HarnessConfigV2型をShared Kernelとして提供
  - phase-dependency-model: phaseDependenciesセクションのJSONスキーマ構造を所有（意味論はphase-dependency-model側）
  - validator-system: Validator ID Registryを消費（phasegate:enable/disableの対象機能名）
  - harness-error: HarnessError型を消費（バリデーションエラー出力）

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類 |
|------|-------------|------|
| HarnessConfig | H04-01 | ✅ **集約**（設定ファイル全体の管理） |
| Preset | H04-02 | 値オブジェクト（minimal/standard/strict） |
| LayerConfig | H04-01 | 値オブジェクト（L1-L4の設定） |
| QuickModeConfig | H04-01 | 値オブジェクト |
| PhaseDependenciesConfig | H04-01 | 値オブジェクト（構造のみ。意味論はphase-dependency-model所有） |
| PlanningModeConfig | H04-01 | 値オブジェクト（構造のみ。正規型定義はphase-dependency-model所有） |
| HarnessesConfig | H04-01 | 値オブジェクト |
| FeatureToggle | H04-03 | 値オブジェクト（個別機能の有効/無効） |
| FeatureName | H04-03 | 値オブジェクト（機能名） |

### 集約候補と根拠

1. **HarnessConfig（集約ルート）**: phasegate.config.jsonファイル全体を表す単一集約。設定ファイルの読み書きはファイル単位で行われ、セクション間の整合性（例: presetとlayersの整合性）を集約が保証する

### v0 config-foundationからの変更点

- **削除**: OrchestrationConfig, SessionConfig → Orchestrationパッケージに移管
- **削除**: ConfigMigrationService（v1→v2マイグレーション）→ Orchestrationパッケージに移管
- **追加**: Preset System（PresetResolutionService）
- **追加**: FeatureRegistry（ACL的ドメインサービス）
- **簡素化**: 品質設定のSingle Source of Truthに特化
- **削除**: EnvironmentOverride（環境変数オーバーライド）→ 品質設定のSource of Truthを1つに保つ

## 3. 設計方針

- **単一集約**: phasegate.config.json全体を1つのHarnessConfig集約で管理。ファイル単位I/Oの整合性境界
- **Preset解決**: PresetResolutionServiceがpreset名からデフォルト設定を展開し、個別上書きをdeep merge。配列は結合ではなく置換。プリセット展開後に最終バリデーションを実行
- **スキーマバリデーション**: ConfigSchemaValidatorPort経由でJSONスキーマバリデーションを実行（ajv等の具体実装はInfrastructure層）。集約の不変条件は「Preset解決後の意味論的整合性」に集中し、構文検証はPort越しに委譲
- **FeatureRegistry**: ACL的ドメインサービスとして実装。Wave 1では`harnesses`セクションキーのみで機能名一覧を提供。Wave 2でValidator ID Registryを合流。Portインターフェースで依存逆転
- **デフォルト無効原則**: GSD由来機能のデフォルト値`enabled: false`は集約の不変条件
- **「生JSON」vs「解決済み設定」の区別**: 利用側に公開するのは常にPreset解決済みの不変DTO（HarnessConfigV2）
- **所有権の明確化**: 本Unitが所有するのは設定の「構造」。`phaseDependencies`/`planningMode`の「意味論」はphase-dependency-model所有。`layers.L1`ルール定義の「意味論」はbiome-ast-engine所有

## 4. QA（不明点・確認事項）

### [Question] Q1: Preset個別上書きの優先順位

preset: "standard"で個別にcoverageThreshold: 95%に上書きする場合、他のstandardデフォルト値はそのまま維持するか？

**決定**: Deep merge（RFC 7396準拠）。配列は結合ではなく置換。プリセット展開後に最終バリデーション実行を契約として明文化。

[Answer] codexレビュー合意: Deep mergeが妥当。配列は置換、展開後に最終バリデーション実行。

### [Question] Q2: FeatureRegistryの実装タイミング

phasegate:enable/disableはValidator ID Registry（validator-system所有、Wave 2）に依存する。

**決定**: 段階的実装。FeatureRegistryをPortインターフェースとして定義し、Wave 1では`harnesses`セクションキーのみ返すアダプター、Wave 2でValidator ID追加アダプターに差し替え。

[Answer] codexレビュー合意: Port越しの段階実装が妥当。

### [Question] Q3: v0のEnvironmentOverride（環境変数オーバーライド）は維持するか

v0ではx-env-override custom propertiesで環境変数オーバーライドが定義されていた。

**決定**: v1では不要。環境変数オーバーライドはOrchestrationパッケージの責務。品質設定のSource of Truthを1つに保つ。

[Answer] codexレビュー合意: 品質ドメインの外側で適用されるべき。

## 5. 前提条件・リスク

- **型定義の先行確定**: HarnessConfigV2型はWave 1開始前に確定が必要（全Unit並列開発の前提）
- **JSONスキーマの安定性**: v2スキーマ変更は全Unitに波及。初期定義の品質が重要
- **Validator ID Registryとの統合**: Wave 2のvalidator-systemが完成するまでFeatureRegistryは部分的動作
- **所有権の契約化**: phaseDependencies/planningModeの構造定義元と意味論定義元を統合契約で明記すること
