# ドメインモデル設計計画: config-foundation

> **作成日**: 2026-03-10
> **対象Unit**: config-foundation
> **Wave**: 1（基盤構築）
> **Phase**: Phase 1（計画）— 人間承認待ち

---

## 1. スコープ

### 対象Unitと担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-027 | orchestrationセクションの追加 | Must |
| US-028 | sessionセクションの追加 | Must |
| US-029 | GSD由来機能のデフォルト無効化 | Must |
| US-030 | harness:migrate-configによるv1→v2自動マイグレーション | Should |

### 他Unitとの境界

- **config-foundationは基盤Unit**であり、他Unitに依存しない。全Unitがconfig-foundationに依存する。
- **公開インターフェース**:
  - 設定ファイル: phasegate.config.json v2スキーマ（全Unit参照）
  - CLI: `harness:enable` / `harness:disable`（全Unit利用）
  - CLI: `harness:migrate-config`（外部利用者）
  - モジュール: config-loader（v2スキーマ読み込み、全Unit利用）
- **境界の原則**: config-foundationは「設定の読み込み・バリデーション・マイグレーション」のみを担う。設定値の「解釈」や「実行」は各利用Unitの責務。例えば、orchestration.modeの値を読み取るのはconfig-foundation、その値に基づいてWave並列実行を制御するのはorchestration-commandsの責務。
- **Shared Kernelとの関係**: v2スキーマの型定義（`HarnessConfigV2`インターフェース）はShared Kernelとして全Unitから参照される。

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞一覧

| 業務名詞 | 出典 | 説明 |
|---------|------|------|
| HarnessConfig | US-027, US-028 | phasegate.config.json全体を表す設定オブジェクト |
| OrchestrationSection | US-027 | mode / parallelization / modelProfile / contextStrategy / commitStrategy / workflow を含むセクション |
| SessionSection | US-028 | stateFile / roadmapFile のパス設定を含むセクション |
| ConfigSchema | US-027, US-028 | JSONスキーマバリデーション用のスキーマ定義 |
| FeatureFlag | US-029 | GSD由来機能の有効/無効状態 |
| FeatureName | US-029 | 有効化/無効化対象の機能名 |
| Preset | US-027 | minimal / standard / strict の3プリセット |
| ConfigVersion | US-030 | 設定ファイルのバージョン（v1 / v2） |
| MigrationResult | US-030 | マイグレーションの成功/失敗結果 |
| ConfigBackup | US-030 | マイグレーション前のバックアップ |
| DefaultValue | US-027, US-029 | 各設定項目のデフォルト値 |
| Mode | US-027 | orchestration.mode（実行モード） |
| ParallelizationConfig | US-027 | 並列実行設定 |
| ModelProfileConfig | US-027 | モデルプロファイル設定 |
| ContextStrategyConfig | US-027 | コンテキスト戦略設定 |
| CommitStrategyConfig | US-027 | コミット戦略設定 |
| WorkflowConfig | US-027 | ワークフロー設定 |
| FilePath | US-028 | stateFile / roadmapFile のファイルパス |

### 集約候補とその根拠

#### 集約候補 1: HarnessConfig（設定集約）

- **根拠**: phasegate.config.jsonファイル全体が1つの整合性境界を形成する。orchestrationセクションとsessionセクションは個別に変更可能だが、スキーマバリデーションは常にファイル全体に対して行われる。CLIツールの設定ファイルという特性上、ファイル単位での読み書きが自然な操作単位。
- **含む要素**: v1既存セクション（project, layers, harnesses, paths, reporting）+ orchestration + session + quick_mode
- **不変条件**: JSONスキーマに適合すること。GSD由来設定のデフォルト値が`enabled: false`であること。

#### 集約候補 2: FeatureToggle（機能トグル）

- **根拠**: US-029の`harness:enable`/`harness:disable`コマンドが操作する「機能の有効/無効状態」は、HarnessConfig内に格納されるが、独自の振る舞い（一覧表示、存在チェック、トグル操作）を持つ。ただし、状態はHarnessConfigに永続化されるため、独立した集約ではなくHarnessConfigの振る舞いの一部として扱う方が適切と考える。
- **判断**: HarnessConfig集約の振る舞いとして統合。独立集約にしない。

#### 集約候補 3: ConfigMigration（設定マイグレーション）

- **根拠**: US-030のマイグレーション処理は「v1設定を読み込み→v2セクション追加→バックアップ作成→書き出し」という一連の操作。マイグレーションは一回限りの操作であり、永続的な状態を持たない。ドメインサービスまたはアプリケーションサービスとして扱うのが適切。
- **判断**: 独立集約にしない。ドメインサービス `ConfigMigrationService` として設計。

---

## 3. 設計方針

### 集約の粒度方針

**単一集約アプローチ（HarnessConfig）を採用する。**

CLIツールの設定ファイル管理というドメイン特性を考慮すると、Webアプリケーションのような複雑な集約分割は不要。理由:

1. **操作単位がファイル**: phasegate.config.jsonは1ファイルとして読み書きされる。セクション単位のアトミックな更新はCLIの利用パターンに合わない。
2. **同時実行制御が不要**: CLIツールは単一プロセスで動作するため、楽観的ロックやイベントソーシングは不要。
3. **整合性境界がファイル全体**: スキーマバリデーションはファイル全体に対して行われ、セクション間の依存関係（例: orchestration.enabled=falseならworkflowも無効）もファイル内で完結する。

### 値オブジェクト vs エンティティの判断基準

| 概念 | 種別 | 根拠 |
|------|------|------|
| HarnessConfig | 集約ルート（エンティティ的） | 設定ファイルパスによる同一性を持つ。ただしCLIツールでは通常1インスタンスのみ存在 |
| OrchestrationConfig | 値オブジェクト | orchestrationセクション全体を不変オブジェクトとして扱う。変更時は新しいインスタンスを生成 |
| SessionConfig | 値オブジェクト | sessionセクション全体を不変オブジェクトとして扱う |
| FeatureName | 値オブジェクト | 機能名を表す文字列ラッパー。許可された値のバリデーション付き |
| FeatureToggleMap | 値オブジェクト | 機能名→有効/無効のマッピング |
| ConfigVersion | 値オブジェクト | v1 / v2 を表す列挙型的な値 |
| FilePath | 値オブジェクト | パス文字列のバリデーション付きラッパー |
| Preset | 値オブジェクト | minimal / standard / strict を表す列挙型 |
| ParallelizationConfig | 値オブジェクト | 並列実行設定 |
| ModelProfileConfig | 値オブジェクト | モデルプロファイル設定 |
| ContextStrategyConfig | 値オブジェクト | コンテキスト戦略設定 |
| CommitStrategyConfig | 値オブジェクト | コミット戦略設定 |
| WorkflowConfig | 値オブジェクト | ワークフロー設定 |

### Shared Kernelとの関係

- **`HarnessConfigV2` 型定義**: 統合契約で定義されたインターフェース（integration_contract §4.2）をShared Kernelとして全Unitに公開。config-foundationはこの型に準拠した設定の読み書きを提供する。
- **`HarnessError` 型**: 統合契約（integration_contract §4.1）で定義。harness-dxが提供する型だが、config-foundationのバリデーションエラーもこの型に準拠する。

### ドメインサービス

| サービス名 | 責務 |
|-----------|------|
| ConfigMigrationService | v1→v2マイグレーション。v1設定読み込み→バージョン判定→v2セクション追加→バックアップ作成 |
| ConfigValidationService | JSONスキーマに基づくバリデーション。HarnessConfig集約のファクトリメソッドとして組み込む可能性もある |

### ドメインイベント（候補）

CLIツールの特性上、ドメインイベントの必要性は低い。ただし以下のイベントは将来的にFUSE Hooks Engineとの連携で有用になる可能性がある:

| イベント | トリガー | 用途 |
|---------|---------|------|
| ConfigMigrated | マイグレーション完了時 | ログ記録、通知 |
| FeatureToggled | harness:enable/disable実行時 | 他Unit通知（将来） |

### ポートとアダプター

| ポート（インターフェース） | 方向 | 実装アダプター |
|------------------------|------|-------------|
| ConfigRepository | 駆動される側 | FileSystemConfigRepository（phasegate.config.json読み書き） |
| ConfigSchemaValidator | 駆動される側 | JsonSchemaValidator（JSONスキーマバリデーション） |
| BackupCreator | 駆動される側 | FileSystemBackupCreator（マイグレーション前バックアップ） |

---

## 4. QA（不明点・確認事項）

### [Question] Q1: orchestrationセクション内のサブ設定の粒度

orchestrationセクションにはmode / parallelization / modelProfile / contextStrategy / commitStrategy / workflowの6つのサブ設定が定義されている。これらのサブ設定はそれぞれ独立した値オブジェクトとして設計すべきか、それともフラットな設定オブジェクトとして扱うべきか。

**背景**: 統合契約（integration_contract §4.2）では`ParallelizationConfig`、`ModelProfileConfig`等の型が別途定義されているが、v1ではWave並列実行が未実装（Phase 2延期）のため、parallelizationやmodelProfileの詳細構造は確定していない。

**推奨案**: v1では各サブ設定を個別の値オブジェクトとして型定義するが、内部構造は最小限（`enabled: boolean` + 将来の拡張用フィールド）に留める。詳細なプロパティはPhase 2で拡張する。これにより型安全性を維持しつつ、過剰設計を回避できる。

[Answer]
推奨案を採用

---

### [Question] Q2: harness:enable / harness:disable の対象機能名の定義方法

US-029では「GSD由来機能をデフォルトで無効にする」とあるが、`harness:enable <feature>` の `<feature>` として許可される機能名をどこで定義すべきか。

**選択肢**:
- (A) ハードコードされた列挙型（FeatureName値オブジェクト内で定義）
- (B) phasegate.config.jsonのスキーマから動的に抽出
- (C) 別途features.jsonのような定義ファイルを用意

**推奨案**: (A) ハードコードされた列挙型。理由: 機能名は設計時に確定しており、動的に変化しない。型安全性が高く、存在しない機能名の指定をコンパイル時に検出できる。v1の対象機能は`orchestration`と`session`の2つのみであり、列挙で管理するのが最もシンプル。

[Answer]
Bでお願いします。

---

### [Question] Q3: v1設定の検出とマイグレーション判定基準

US-030のマイグレーションにおいて、現在の設定ファイルがv1なのかv2なのかをどのように判定するか。

**選択肢**:
- (A) `orchestration`セクションの有無で判定
- (B) 明示的な`version`フィールドを追加して判定
- (C) 両方を組み合わせ（`version`フィールドを正とし、なければセクション構造で推定）

**推奨案**: (B) 明示的な`version`フィールドの追加。v2では`"version": 2`をトップレベルに追加し、このフィールドがない場合をv1と判定する。これにより将来のv3以降のマイグレーションにも対応でき、判定ロジックが明確になる。ただし、v1既存ファイルにはversionフィールドがないため、「versionフィールド未設定 = v1」という推定を併用する。

[Answer]
推奨案を採用

---

### [Question] Q4: config-loaderモジュールの設計粒度

config-foundationは「config-loader（v2スキーマ読み込み）」を公開インターフェースとして提供する。このconfig-loaderはどの程度の責務を持つべきか。

**選択肢**:
- (A) 単純なファイル読み込み+パース+バリデーション
- (B) ファイル読み込み+パース+バリデーション+デフォルト値のマージ+プリセット解決
- (C) (B) + 環境変数オーバーライド + ファイルパス解決

**推奨案**: (B)。config-loaderは「phasegate.config.jsonを読み込み、バリデーション済みの完全な設定オブジェクトを返す」責務を持つ。デフォルト値のマージとプリセット解決はconfig-foundationの責務であり、利用Unitがこれを個別に行うのは重複。環境変数オーバーライド(C)はv1スコープ外。

[Answer]
cでお願いします。v1スコープ外だとしてもドメイン設計には含めるべきです

---

## 5. 前提条件・リスク

### 前提条件

1. **v1既存スキーマの継続**: v1のphasegate.config.jsonに含まれる既存セクション（project, layers, harnesses, paths, reporting）のスキーマは変更しない。v2は既存に追加する形で拡張する。
2. **単一設定ファイル原則（K13）**: GSD由来の設定も含め、全設定をphasegate.config.jsonに統合する。別ファイルへの分離は行わない。
3. **デフォルトOFF原則（Go/No-Go Gate #8）**: GSD由来機能は全てデフォルトで無効。既存v1利用者に影響を与えない。
4. **プロジェクトローカル原則（Go/No-Go Gate #6）**: 設定ファイルはプロジェクトルートに配置。グローバルパスへの設定は不可。

### リスク

| リスク | 影響度 | 対策 |
|--------|-------|------|
| v1スキーマとの後方互換性破壊 | 高 | v2はv1のスーパーセットとして設計。v1の全フィールドをそのまま維持。マイグレーションテストで検証 |
| 設定ファイルの肥大化 | 中 | プリセット体系でデフォルト値を提供し、明示的な設定を最小限に。orchestrationセクション内に封じ込め |
| 将来のv3マイグレーション | 低 | versionフィールド導入（Q3）でマイグレーションパスを確保 |
| config-loaderのインターフェース変更による全Unit影響 | 高 | Shared Kernelとしての`HarnessConfigV2`型を先に確定し、全Unitとの契約を明確にする |
