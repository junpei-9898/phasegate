# 論理設計計画: config-foundation

> **作成日**: 2026-03-11
> **モード**: 横断（Unit全体の論理設計）
> **対応ストーリー**: US-027, US-028, US-029, US-030

---

## 1. スコープ

### 対象Unit
- **config-foundation**（Wave 1 基盤構築）

### 対象ストーリー
| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-027 | orchestrationセクションの追加 | Must |
| US-028 | sessionセクションの追加 | Must |
| US-029 | GSD由来機能のデフォルト無効化 | Must |
| US-030 | harness:migrate-configによるv1→v2自動マイグレーション | Should |

### 設計対象の層
| 層 | 対象 | 理由 |
|----|------|------|
| Domain | 対象 | 集約ルート・値オブジェクト・ドメインサービスの詳細設計 |
| UseCase | 対象 | アプリケーションサービス（設定読込・マイグレーション・トグル操作）の設計 |
| Controller（CLI） | 対象 | CLIコマンドハンドラ（harness:enable/disable, harness:migrate-config）の設計 |
| Infrastructure（アダプター） | 対象 | ポート実装（ファイルI/O、JSONスキーマバリデーション、環境変数読取）の設計 |
| DB | **対象外** | ファイルシステムベースのローカルツール。RDBは使用しない |
| BFF / Frontend | **対象外** | CLIツールのためUI層は不要 |

---

## 2. 設計方針

### 2.1 アーキテクチャ層の定義

ヘキサゴナルアーキテクチャ（ポート&アダプター）に基づき、以下の4層で構成する。

```
Controller（CLI）
    ↓
UseCase（アプリケーションサービス）
    ↓
Domain（集約・値オブジェクト・ドメインサービス）
    ↑
Port ← Infrastructure（アダプター）
```

**根拠**:
- architecture-philosophy.mdの依存方向ルール `domain → port → usecase → controller` に準拠
- CLIツールのためControllerはHTTPではなくCLIコマンドハンドラとして実装
- ドメインモデルの豊かさを優先し、ビジネスロジック（バリデーション、トグル操作、プリセット解決等）はHarnessConfig集約に配置
- ドメインサービス（ConfigMigrationService, ConfigValidationService）は複数ポート連携が必要な場合に限定して使用

### 2.2 技術スタックの前提

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript |
| リンター/フォーマッター | Biome |
| テストフレームワーク | Vitest |
| パッケージマネージャ | pnpm |
| JSONスキーマバリデーション | ajv（候補） |
| 設定ファイル形式 | JSON（phasegate.config.json） |

### 2.3 ディレクトリ構造方針

```
src/
└── units/
    └── config-foundation/
        ├── domain/
        │   ├── models/          # 集約ルート・エンティティ
        │   ├── value-objects/   # 値オブジェクト
        │   ├── services/        # ドメインサービス
        │   ├── events/          # ドメインイベント
        │   └── ports/           # ポートインターフェース
        ├── usecases/            # ユースケース
        ├── controllers/         # CLIコマンドハンドラ
        └── infrastructure/      # アダプター実装
```

---

## 3. 設計内容サマリー

### 3.1 Domain層

#### 集約ルート: HarnessConfig
- ファクトリメソッド `create(rawJson, schema)` で生成。生JSONとスキーマを受け取り、バリデーション・デフォルト値マージ・プリセット解決・環境変数オーバーライド・パス解決を一括実行
- `enableFeature(featureName)` / `disableFeature(featureName)`: スキーマから動的抽出されたトグル対象の操作
- `getToggleableFeatures()`: スキーマの`enabled`フィールドを持つセクション名を動的抽出して返す
- `applyPreset(preset)`: minimal / standard / strict プリセットに基づくデフォルト値の一括適用
- `resolveEnvironmentOverrides(envVars)`: 環境変数オーバーライドの適用（適用後のスキーマバリデーション再実行）
- `resolveFilePaths(basePath)`: 相対パスから絶対パスへの解決
- `toJSON()`: 永続化用のシリアライズメソッド（ConfigRepositoryへの書き出しに使用）

#### 値オブジェクト群
- **ConfigVersion**: V1 / V2の列挙型。`versionフィールド`の有無で判定
- **OrchestrationConfig**: orchestrationセクション全体の不変オブジェクト（Mode, ParallelizationConfig等を内包）
- **SessionConfig**: sessionセクション全体の不変オブジェクト
- **QuickModeConfig**: quick_modeセクション全体の不変オブジェクト
- **Mode**: single / parallel の列挙型
- **FilePath**: パス文字列ラッパー。空文字列・グローバルパス（~/, $HOME）を不許可。`isProjectLocal()` バリデーションメソッド
- **Preset**: minimal / standard / strict の列挙型
- **FeatureToggleMap**: 機能名→boolean のイミュータブルマップ。`isEnabled()` / `toggle()` メソッド
- **EnvironmentOverride**: 環境変数名・設定パス（ドット記法）・値の組
- **MigrationResult**: マイグレーション結果（success, backupPath, errors）

#### ドメインサービス
- **ConfigMigrationService**: v1→v2マイグレーション。ConfigRepository（読み書き）とBackupCreator（バックアップ）を利用。`migrate(v1Config)` → MigrationResult、`detectVersion(rawJson)` → ConfigVersion
- **ConfigValidationService**: JSONスキーマバリデーション。ConfigSchemaValidator ポートを利用。`validate(rawJson, schema)` → ValidationResult、`extractToggleableFeatures(schema)` → string[]

#### ドメインイベント
- **ConfigMigrated**: マイグレーション完了時に発行（v1パス、v2パス、バックアップパス）
- **FeatureToggled**: enableFeature/disableFeature実行時に発行（機能名、新状態）

#### ポート（インターフェース）
- **ConfigRepository**: `load(filePath): Promise<unknown>`, `save(filePath, config): Promise<void>`
- **ConfigSchemaValidator**: `validate(json, schema): ValidationResult`
- **BackupCreator**: `createBackup(filePath): Promise<FilePath>`
- **EnvironmentVariableReader**: `read(variableName): string | undefined`, `readAll(): Map<string, string>`

### 3.2 UseCase層

以下のユースケースを設計する。各ユースケースはポートの取得・永続化の調整役に徹し、ビジネスロジックは集約に委譲する。

| ユースケース | 対応ストーリー | 責務 |
|-------------|-------------|------|
| **LoadConfigUseCase** | US-027, US-028, US-029（横断） | 設定ファイル読み込み→HarnessConfig生成→返却。全Unitのconfig-loader基盤 |
| **EnableFeatureUseCase** | US-029 | 指定機能の有効化。HarnessConfig.enableFeature()呼び出し→永続化 |
| **DisableFeatureUseCase** | US-029 | 指定機能の無効化。HarnessConfig.disableFeature()呼び出し→永続化 |
| **ListToggleableFeaturesUseCase** | US-029 | トグル可能な機能一覧を取得。HarnessConfig.getToggleableFeatures()呼び出し |
| **MigrateConfigUseCase** | US-030 | v1→v2マイグレーション実行。ConfigMigrationService.migrate()の調整 |

#### ユースケース間の関係
- LoadConfigUseCase は他のユースケースから内部的に利用される（設定読み込みは共通処理）
- EnableFeatureUseCase / DisableFeatureUseCase はLoadConfigの結果に対して操作を行い、ConfigRepositoryで永続化する

### 3.3 Controller層（CLI）

CLIコマンドハンドラとして以下を設計する。

| コマンド | ハンドラ | 利用UseCase |
|---------|---------|------------|
| `harness:enable <feature>` | EnableFeatureHandler | EnableFeatureUseCase, ListToggleableFeaturesUseCase |
| `harness:disable <feature>` | DisableFeatureHandler | DisableFeatureUseCase, ListToggleableFeaturesUseCase |
| `harness:migrate-config` | MigrateConfigHandler | MigrateConfigUseCase |

#### CLIハンドラの責務
- コマンドライン引数のパース
- ユースケース呼び出し
- 結果のフォーマットとCLI出力（成功メッセージ / エラーメッセージ）
- エラーハンドリング（HarnessErrorフォーマットへの変換）

### 3.4 Infrastructure層（アダプター）

| アダプター | 実装対象ポート | 実装概要 |
|-----------|-------------|---------|
| **FileSystemConfigRepository** | ConfigRepository | `fs.readFile` / `fs.writeFile` によるphasegate.config.jsonのI/O。JSONパース/シリアライズを含む |
| **JsonSchemaValidator** | ConfigSchemaValidator | ajv等のJSONスキーマライブラリによるバリデーション実行。v2スキーマ定義ファイルの読み込み |
| **FileSystemBackupCreator** | BackupCreator | ファイルコピーによるバックアップ作成。バックアップ先: `{元ファイル名}.backup.{timestamp}.json` |
| **ProcessEnvironmentReader** | EnvironmentVariableReader | `process.env` からの環境変数読み取り |

### 3.5 Shared Kernel

- **HarnessConfigV2型定義**: config-foundationが提供し、全Unitが参照するTypeScript型定義。統合契約 Section 4.2に準拠
- **HarnessError型**: harness-dxが提供する統一エラーフォーマット。config-foundationのバリデーションエラー出力時にこの型に準拠

### 3.6 JSONスキーマ定義

- v2スキーマファイルをInfrastructure層に配置（JSONファイルとして管理）
- スキーマにはv1既存セクション + v2新規セクション（orchestration, session, quick_mode）を定義
- `enabled`フィールドを持つセクションがトグル対象として動的抽出される設計に対応

---

## 4. QA（不明点・確認事項）

### [Question] Q1: JSONスキーマバリデーションライブラリの選定

JSONスキーマバリデーションの実装にajvを使用する想定だが、他の候補（zod等）を検討すべきか。ajvはJSON Schema標準（Draft-07 / 2020-12）に準拠しており、スキーマファイルを外部JSON定義として管理できる。zodはTypeScriptネイティブだがJSON Schemaファイルとの直接的な互換性が低い。

**推奨案:** ajvを採用。理由: (1) ドメインモデルでスキーマから動的にトグル対象を抽出する設計があり、JSONスキーマファイルを正規のデータとして扱える必要がある (2) JSON Schema標準への準拠 (3) 既存エコシステムとの親和性

[Answer]
推奨案にしましょう

### [Question] Q2: config-loaderモジュールの公開形態

統合契約で「config-loader（v2スキーマ読み込み）」が全Unit利用の公開インターフェースとして定義されている。これはLoadConfigUseCaseをラップした関数として公開するのか、それともUseCaseそのものをエクスポートするのか。他Unitからの利用しやすさを考慮すると、シンプルな関数API（例: `loadConfig(configPath?): Promise<HarnessConfigV2>`）として公開するのが適切と考える。

**推奨案:** ファサード関数 `loadConfig(configPath?)` を公開API として提供。内部でLoadConfigUseCaseとアダプターのDIを隠蔽し、他Unitは依存注入を意識せず利用可能にする。

[Answer]
推奨案にしましょう

### [Question] Q3: 環境変数オーバーライドのマッピング定義場所

EnvironmentOverride（環境変数名→設定パスのマッピング）の定義をどこに置くか。選択肢: (A) ドメイン内にハードコード (B) JSONスキーマに拡張プロパティとして埋め込む (C) 別の設定ファイルで管理。

**推奨案:** (B) JSONスキーマの`x-env-override`カスタムプロパティとして定義。スキーマが設定構造のSingle Source of Truthとなり、トグル対象の動的抽出と同じ思想で環境変数マッピングも管理できる。

[Answer]
推奨案にしましょう

### [Question] Q4: 既存CLIインフラとの統合方式

既存のharness CLIコマンド（harness:status, harness:init等）がどのようなCLIフレームワーク/パターンで実装されているか未確認。新規コマンド（harness:enable/disable, harness:migrate-config）は既存パターンに合わせる必要がある。

**推奨案:** 既存のCLIコマンド実装を確認し、同一のコマンド登録パターン・引数パース方式に従う。Phase 2（実行）開始前に既存コード調査を実施する。

[Answer]
推奨案にしましょう

### [Question] Q5: バックアップファイルの配置先と命名規則

FileSystemBackupCreatorが作成するバックアップファイルの配置先について、プロジェクトルート直下か`.harness/`ディレクトリ配下か。

**推奨案:** `.harness/backups/harness.config.{timestamp}.json` として`.harness/`配下に配置。プロジェクトルートの汚染を防ぎ、.gitignoreで管理しやすい。

[Answer]
推奨案にしましょう

---

## 5. 前提条件・リスク

### 前提条件
1. **ドメインモデル確定済み**: `docs/product/construction/config_foundation/domain_model.md` の集約・値オブジェクト・ポート定義を正とする
2. **統合契約準拠**: `docs/product/units/integration_contract.md` のHarnessConfigV2型定義・HarnessError型定義に準拠する
3. **外部依存なし**: config-foundationは基盤Unitであり、他Unitへの依存は持たない
4. **既存v1スキーマとの後方互換**: v2はv1のスーパーセットであり、v1の全フィールドを維持する（INV-5）
5. **GSD由来設定のデフォルトOFF**: Progressive adoption原則に基づき、全GSD由来設定は`enabled: false`がデフォルト（INV-2）

### リスク
1. **既存CLIコマンドとの整合性**: 既存のharness CLIがどのようなパターンで実装されているか未調査。Phase 2開始前に既存コードの調査が必要（Q4参照）
2. **JSONスキーマの複雑性**: v2スキーマが条件付きバリデーション（orchestration.enabled=falseの場合のサブ設定無視など）を必要とする場合、スキーマ定義が複雑化する可能性がある
3. **スキーマからの動的抽出の堅牢性**: `enabled`フィールドを持つセクションを動的抽出する設計は柔軟だが、スキーマ構造の変更に対して脆弱になる可能性がある。スキーマのバージョニングと合わせて堅牢性を担保する必要がある
4. **環境変数オーバーライドの型安全性**: 環境変数は常にstring型であるため、boolean/number型の設定値へのオーバーライド時に型変換が必要。変換失敗時のエラーハンドリングを設計に含める必要がある
