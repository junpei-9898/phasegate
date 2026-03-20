# 論理設計: config-foundation

> **作成日**: 2026-03-11
> **対応ストーリー**: US-027, US-028, US-029, US-030
> **モード**: Unit横断設計（Phase 2）
> **前提ドキュメント**: `domain_model.md`（同ディレクトリ）、`units/config_foundation_unit.md`、`units/integration_contract.md`

---

## 1. アーキテクチャ概要

### 1.1 層構成と責務

| 層 | 責務 | 依存先 |
|----|------|--------|
| Domain | ビジネスルール（集約・値オブジェクト・ドメインサービス）。外部依存を一切持たない | なし |
| Port | Domain層が外部とやり取りするためのインターフェース定義 | Domain |
| UseCase | アプリケーションサービス。集約の取得・操作・永続化の調整役 | Domain, Port |
| Controller | CLIコマンドハンドラ。入力パース・UseCase呼び出し・出力フォーマット | UseCase |
| Infrastructure | ポートの具体実装（ファイルI/O、ajvバリデーション、環境変数読み取り等） | Port |

### 1.2 依存方向

```
Controller → UseCase → Port ← Infrastructure
                        ↑
                      Domain
```

- **厳守**: Domain層は他のどの層にも依存しない
- **厳守**: UseCase層はDomain層とPort層のみに依存する
- **厳守**: Infrastructure層はPort層のみに依存する（UseCase層やController層に依存しない）
- Controller層はUseCase層に依存する。Domain型を参照してもよいが、Domain操作を直接行わない

### 1.3 ディレクトリ構成

```
scripts/harness/
├── config-foundation/
│   ├── domain/
│   │   ├── harness-config.ts              # 集約ルート
│   │   ├── values/
│   │   │   ├── config-version.ts          # ConfigVersion
│   │   │   ├── orchestration-config.ts    # OrchestrationConfig
│   │   │   ├── session-config.ts          # SessionConfig
│   │   │   ├── quick-mode-config.ts       # QuickModeConfig
│   │   │   ├── mode.ts                    # Mode
│   │   │   ├── file-path.ts              # FilePath
│   │   │   ├── preset.ts                 # Preset
│   │   │   ├── feature-toggle-map.ts     # FeatureToggleMap
│   │   │   ├── environment-override.ts   # EnvironmentOverride
│   │   │   ├── migration-result.ts       # MigrationResult
│   │   │   ├── validation-result.ts      # ValidationResult
│   │   │   ├── parallelization-config.ts # ParallelizationConfig
│   │   │   ├── model-profile-config.ts   # ModelProfileConfig
│   │   │   ├── context-strategy-config.ts# ContextStrategyConfig
│   │   │   ├── commit-strategy-config.ts # CommitStrategyConfig
│   │   │   └── workflow-config.ts        # WorkflowConfig
│   │   ├── services/
│   │   │   ├── config-migration-service.ts
│   │   │   └── config-validation-service.ts
│   │   ├── events/
│   │   │   ├── config-migrated.ts
│   │   │   └── feature-toggled.ts
│   │   └── errors/
│   │       └── config-domain-errors.ts
│   ├── port/
│   │   ├── config-repository.ts
│   │   ├── config-schema-validator.ts
│   │   ├── backup-creator.ts
│   │   └── environment-variable-reader.ts
│   ├── usecase/
│   │   ├── load-config-usecase.ts
│   │   ├── enable-feature-usecase.ts
│   │   ├── disable-feature-usecase.ts
│   │   ├── list-toggleable-features-usecase.ts
│   │   └── migrate-config-usecase.ts
│   ├── infrastructure/
│   │   ├── file-system-config-repository.ts
│   │   ├── json-schema-validator.ts
│   │   ├── file-system-backup-creator.ts
│   │   └── process-environment-reader.ts
│   └── index.ts                           # 公開API（loadConfigファサード）
├── cli/
│   ├── enable.ts                          # 既存→リファクタリング対象
│   ├── disable.ts                         # 既存→リファクタリング対象
│   └── migrate-config.ts                  # 新規
```

> **注記**: 既存の`scripts/harness/core/config-loader.ts`および`config-schema.ts`はv1コードとして残存し、v2移行完了後に段階的に置き換える。v2コードは`config-foundation/`配下に新規作成する。既存CLIファイル（`cli/enable.ts`、`cli/disable.ts`）は新UseCaseを呼び出すようリファクタリングする。

---

## 2. Domain層設計

### 2.1 集約ルート: HarnessConfig

#### 属性一覧

| 属性 | 型 | 説明 | 必須 |
|------|-----|------|------|
| configFilePath | FilePath | 設定ファイルの絶対パス。集約の同一性基準 | Yes |
| version | ConfigVersion | 設定ファイルのバージョン（V1 / V2） | Yes |
| project | ProjectConfig | プロジェクト設定（v1既存、TypeScript interface継承） | Yes |
| layers | LayerConfig | レイヤー設定（v1既存） | Yes |
| harnesses | HarnessesConfig | ハーネス設定（v1既存） | Yes |
| paths | PathsConfig | パス設定（v1既存） | Yes |
| reporting | ReportingConfig | レポート設定（v1既存） | Yes |
| orchestration | OrchestrationConfig | オーケストレーション設定（v2新規） | Yes（v2） |
| session | SessionConfig | セッション設定（v2新規） | Yes（v2） |
| quickMode | QuickModeConfig | Quick Mode設定（v2新規） | Yes（v2） |
| featureToggles | FeatureToggleMap | スキーマから動的抽出された機能トグル状態 | Yes |
| schema | object（内部保持） | JSONスキーマオブジェクト。トグル対象の動的抽出に使用。外部公開しない | Yes |
| domainEvents | DomainEvent[]（内部保持） | 未発行のドメインイベントキュー | Yes |

> **v1互換**: v1設定の場合、orchestration / session / quickModeはデフォルト値（全`enabled: false`）で初期化される。

#### メソッド一覧

##### `static create(rawJson: unknown, schema: object): HarnessConfig`

**ファクトリメソッド**。集約の唯一の生成手段。

- **入力**: `rawJson`（パース済みJSONオブジェクト）、`schema`（JSONスキーマオブジェクト）
- **出力**: `HarnessConfig`インスタンス
- **例外**: `ConfigValidationError`（スキーマバリデーション失敗時）
- **不変条件**: INV-1, INV-2, INV-3, INV-5

**処理フロー**:

1. `ConfigValidationService.validate(rawJson, schema)` を呼び出し、スキーマバリデーションを実行
2. バリデーション失敗時: `ConfigValidationError`をスロー
3. `ConfigValidationService.extractToggleableFeatures(schema)` でトグル対象機能名を抽出
4. `ConfigVersion`を判定（`detectVersion`相当のロジック）
5. 各値オブジェクトを生成（OrchestrationConfig, SessionConfig, QuickModeConfig等）
6. v2の場合: `version`フィールドの存在を検証（INV-3）
7. GSD由来設定のデフォルト値を検証（INV-2: `enabled: false`であること）
8. v1フィールドの保持を検証（INV-5: v2はv1のスーパーセット）
9. `FeatureToggleMap`を構築（抽出された機能名と現在の`enabled`状態から）
10. `HarnessConfig`インスタンスを返却

##### `enableFeature(featureName: string): void`

- **入力**: `featureName`（トグル対象の機能名。例: `"orchestration"`, `"session"`）
- **出力**: なし（自身の状態を変更）
- **例外**: `InvalidFeatureNameError`（featureNameがトグル対象に存在しない場合）
- **不変条件**: INV-4
- **副作用**: `FeatureToggled`ドメインイベントをキューに追加

**処理フロー**:

1. `featureToggles`にfeatureNameが存在するか検証
2. 存在しない場合: `InvalidFeatureNameError`をスロー（利用可能な機能名一覧を含む）
3. 対象セクションの`enabled`を`true`に更新
4. `featureToggles`を更新
5. `FeatureToggled`イベントをドメインイベントキューに追加

##### `disableFeature(featureName: string): void`

- `enableFeature`と同構造。`enabled`を`false`に更新する
- **不変条件**: INV-4
- **副作用**: `FeatureToggled`ドメインイベントをキューに追加

##### `getToggleableFeatures(): string[]`

- **入力**: なし
- **出力**: トグル可能な機能名の配列（例: `["orchestration", "session", "quick_mode", "parallelization", ...]`）
- **処理**: `featureToggles.getFeatureNames()`を返却

##### `applyPreset(preset: Preset): void`

- **入力**: `preset`（Preset値オブジェクト）
- **出力**: なし
- **処理**: プリセットに定義されたデフォルト値で各セクションの`enabled`状態を一括更新。ユーザーが明示的に設定した値は上書きしない（プリセットはデフォルト値の供給源）

##### `resolveEnvironmentOverrides(envVars: Map<string, string>): void`

- **入力**: `envVars`（環境変数のキー→値マップ）
- **出力**: なし
- **例外**: `ConfigValidationError`（オーバーライド適用後にスキーマバリデーション失敗した場合）
- **不変条件**: INV-7

**処理フロー**:

1. スキーマから`x-env-override`カスタムプロパティを持つフィールドを列挙
2. 各`x-env-override`について、対応する環境変数名が`envVars`に存在するか確認
3. 存在する場合: 対応する設定パス（ドット記法）に値を適用
4. 全オーバーライド適用後、スキーマバリデーションを再実行（INV-7）
5. バリデーション失敗時: `ConfigValidationError`をスロー

##### `resolveFilePaths(basePath: string): void`

- **入力**: `basePath`（プロジェクトルートの絶対パス）
- **出力**: なし
- **例外**: `InvalidFilePathError`（グローバルパスが検出された場合）
- **不変条件**: INV-6

**処理フロー**:

1. 全`FilePath`型の属性を走査
2. 相対パスの場合: `basePath`を基準に絶対パスに解決
3. 解決後のパスがプロジェクトルート配下であることを検証（INV-6）
4. 違反がある場合: `InvalidFilePathError`をスロー

##### `getOrchestration(): OrchestrationConfig`

- **出力**: OrchestrationConfig値オブジェクト
- **注記**: INV-8に基づき、`orchestration.enabled === false`の場合もオブジェクト自体は返却される。呼び出し側が`enabled`フラグを確認して利用する

##### `getSession(): SessionConfig`

- **出力**: SessionConfig値オブジェクト

##### `getVersion(): ConfigVersion`

- **出力**: ConfigVersion値オブジェクト

##### `toJSON(): object`

- **出力**: シリアライズ可能なプレーンオブジェクト（harness.config.jsonに書き出す形式）
- **処理**: 内部の値オブジェクトを再帰的にプレーンオブジェクトに変換。`schema`や`domainEvents`は含めない

##### `pullDomainEvents(): DomainEvent[]`

- **出力**: 未発行のドメインイベント配列
- **副作用**: 内部キューをクリア
- **用途**: UseCase層がイベントを取得してログ記録等に利用

### 2.2 値オブジェクト群

全値オブジェクトは不変（immutable）。変更操作は新しいインスタンスを返す。等価性は全属性の値比較で判定する。

#### 2.2.1 ConfigVersion

| 属性 | 型 | 説明 |
|------|-----|------|
| value | `"V1"` \| `"V2"` | バージョン識別子 |

**生成ルール**:
- `version`フィールドが存在しない、または`"1.0"`の場合 → `V1`
- `version`フィールドが`2`（数値）の場合 → `V2`

**メソッド**:
- `isV1(): boolean` — V1かどうかを返す
- `isV2(): boolean` — V2かどうかを返す
- `equals(other: ConfigVersion): boolean` — 等価判定

#### 2.2.2 OrchestrationConfig

| 属性 | 型 | デフォルト値 | 説明 |
|------|-----|------------|------|
| enabled | boolean | `false` | セクション全体の有効/無効 |
| mode | Mode | `Mode.single` | 実行モード |
| parallelization | ParallelizationConfig | `{ enabled: false }` | 並列実行設定 |
| modelProfile | ModelProfileConfig | `{ enabled: false }` | モデルプロファイル設定 |
| contextStrategy | ContextStrategyConfig | `{ enabled: false }` | コンテキスト戦略設定 |
| commitStrategy | CommitStrategyConfig | `{ enabled: false }` | コミット戦略設定 |
| workflow | WorkflowConfig | `{ enabled: false }` | ワークフロー設定 |

**バリデーションルール**: 全サブ設定がenabledフィールドを持つこと。

**生成**: `OrchestrationConfig.create(props)` — 全属性を受け取り、不変インスタンスを返す。

#### 2.2.3 SessionConfig

| 属性 | 型 | デフォルト値 | 説明 |
|------|-----|------------|------|
| enabled | boolean | `false` | セクション全体の有効/無効 |
| stateFile | FilePath | `FilePath.create(".harness/session-state.json")` | セッション状態ファイルパス |
| roadmapFile | FilePath | `FilePath.create(".harness/roadmap.json")` | ロードマップファイルパス |

**バリデーションルール**: stateFile, roadmapFileが有効なFilePathであること。

#### 2.2.4 QuickModeConfig

| 属性 | 型 | デフォルト値 | 説明 |
|------|-----|------------|------|
| enabled | boolean | `false` | セクション全体の有効/無効 |
| targetConditions | readonly string[] | `[]` | 対象条件 |
| excludeConditions | readonly string[] | `[]` | 除外条件 |
| validators | readonly string[] | `[]` | 使用バリデータ |

#### 2.2.5 Mode

| 値 | 説明 |
|---|------|
| `single` | 単一executor実行（v1デフォルト） |
| `parallel` | Wave並列実行（Phase 2以降） |

**生成**: `Mode.fromString(value: string): Mode` — 不正値の場合`InvalidModeError`をスロー。

#### 2.2.6 FilePath

| 属性 | 型 | 説明 |
|------|-----|------|
| value | string | パス文字列 |

**バリデーションルール**（生成時に検証）:
- 空文字列は不可 → `EmptyFilePathError`
- `~/`で始まるパスは不可 → `GlobalFilePathError`
- `$HOME`や`$USER`等の環境変数展開を含むパスは不可 → `GlobalFilePathError`
- 絶対パスかつプロジェクトルート外は不可 → `InvalidFilePathError`（resolveFilePaths時に検証）

**メソッド**:
- `isProjectLocal(projectRoot: string): boolean` — プロジェクトルート配下かどうかを判定
- `resolve(basePath: string): FilePath` — 相対パスをbasePathから絶対パスに解決した新インスタンスを返す
- `toString(): string` — パス文字列を返す
- `equals(other: FilePath): boolean` — 等価判定

#### 2.2.7 Preset

| 値 | 説明 |
|---|------|
| `minimal` | 最小構成（GSD由来機能すべてOFF） |
| `standard` | 標準構成（推奨設定） |
| `strict` | 厳格構成（全機能ON） |

**生成**: `Preset.fromString(value: string): Preset` — 不正値の場合`InvalidPresetError`をスロー。

#### 2.2.8 FeatureToggleMap

| 属性 | 型 | 説明 |
|------|-----|------|
| toggles | ReadonlyMap<string, boolean> | 機能名→有効/無効のマッピング |

**メソッド**:
- `isEnabled(featureName: string): boolean` — 指定機能が有効かどうか。存在しない場合は`false`
- `enable(featureName: string): FeatureToggleMap` — 指定機能を有効にした新インスタンスを返す
- `disable(featureName: string): FeatureToggleMap` — 指定機能を無効にした新インスタンスを返す
- `hasFeature(featureName: string): boolean` — 指定機能名がマップに存在するか
- `getFeatureNames(): string[]` — 全機能名の配列を返す

**生成ルール**: スキーマの`enabled`フィールドを持つセクション名を走査して自動構築する。ハードコードしない。

#### 2.2.9 EnvironmentOverride

| 属性 | 型 | 説明 |
|------|-----|------|
| variableName | string | 環境変数名（例: `HARNESS_ORCHESTRATION_MODE`） |
| configPath | string | 対象設定パス（ドット記法、例: `orchestration.mode`） |
| value | string | オーバーライド値 |

**生成**: スキーマの`x-env-override`カスタムプロパティから自動抽出。

#### 2.2.10 MigrationResult

| 属性 | 型 | 説明 |
|------|-----|------|
| success | boolean | マイグレーション成功/失敗 |
| backupPath | FilePath | バックアップファイルパス |
| migratedConfig | object \| null | マイグレーション後のJSON（成功時のみ） |
| errors | readonly string[] | エラーメッセージ一覧（失敗時） |
| warnings | readonly string[] | 警告メッセージ一覧 |

#### 2.2.11 ValidationResult

| 属性 | 型 | 説明 |
|------|-----|------|
| valid | boolean | バリデーション成功/失敗 |
| errors | readonly ValidationError[] | エラー一覧 |

**ValidationError構造**:

| 属性 | 型 | 説明 |
|------|-----|------|
| path | string | エラー箇所のJSONパス（例: `/orchestration/mode`） |
| message | string | エラーメッセージ |
| keyword | string | 違反したJSONスキーマキーワード（例: `"enum"`, `"required"`） |

#### 2.2.12 ParallelizationConfig / ModelProfileConfig / ContextStrategyConfig / CommitStrategyConfig / WorkflowConfig

全て同構造の値オブジェクト。

| 属性 | 型 | デフォルト値 |
|------|-----|------------|
| enabled | boolean | `false` |

**生成**: `XxxConfig.create(props: { enabled: boolean }): XxxConfig`

### 2.3 ドメインサービス

#### 2.3.1 ConfigMigrationService

v1→v2マイグレーションを実行するドメインサービス。複数ポートを協調させる必要があるため、集約のメソッドではなくドメインサービスとして実装する。

**コンストラクタ依存**:
- `configRepository: ConfigRepository`
- `backupCreator: BackupCreator`
- `configSchemaValidator: ConfigSchemaValidator`

##### `migrate(v1ConfigPath: FilePath, schema: object): MigrationResult`

**処理フロー**:

1. `configRepository.load(v1ConfigPath)` でv1設定を読み込み
2. `detectVersion(rawJson)` でバージョンを判定
3. 既にV2の場合: `MigrationResult`（success: true, warnings: ["既にv2形式です"]）を返却
4. `backupCreator.createBackup(v1ConfigPath)` でバックアップを作成
5. v2セクションをマージ:
   - `version: 2` を追加
   - `orchestration`セクションをデフォルト値（全`enabled: false`）で追加
   - `session`セクションをデフォルト値で追加
   - `quick_mode`セクションをデフォルト値で追加
6. v1既存フィールドは一切変更しない（INV-5: v2はv1スーパーセット）
7. `configSchemaValidator.validate(mergedJson, schema)` でv2スキーマバリデーション
8. バリデーション失敗: `MigrationResult`（success: false, errors含む）を返却
9. `configRepository.save(v1ConfigPath, mergedJson)` で上書き保存
10. `ConfigMigrated`ドメインイベントを返却用に生成
11. `MigrationResult`（success: true, backupPath, migratedConfig）を返却

##### `detectVersion(rawJson: unknown): ConfigVersion`

**処理フロー**:

1. `rawJson`がオブジェクトでない場合: `ConfigVersion.V1`を返す
2. `version`フィールドが`2`（数値）の場合: `ConfigVersion.V2`
3. それ以外: `ConfigVersion.V1`

#### 2.3.2 ConfigValidationService

JSONスキーマバリデーションとトグル対象抽出を行うドメインサービス。

**コンストラクタ依存**:
- `schemaValidator: ConfigSchemaValidator`

##### `validate(rawJson: unknown, schema: object): ValidationResult`

**処理フロー**:

1. `schemaValidator.validate(rawJson, schema)` を呼び出し
2. JSONスキーマバリデーション結果を`ValidationResult`値オブジェクトに変換して返却

##### `extractToggleableFeatures(schema: object): string[]`

**処理フロー**:

1. スキーマのプロパティ定義を再帰的に走査
2. `properties`内に`enabled`フィールド（type: boolean）を持つセクション名を収集
3. トップレベルの`version`, `preset`, `project`, `layers`, `harnesses`, `paths`, `reporting`は除外（これらはv1既存でトグル対象外）
4. 収集したセクション名の配列を返却

**抽出対象例**: `["orchestration", "session", "quick_mode", "parallelization", "modelProfile", "contextStrategy", "commitStrategy", "workflow"]`

### 2.4 ドメインイベント

#### 2.4.1 ConfigMigrated

| 属性 | 型 | 説明 |
|------|-----|------|
| occurredAt | Date | イベント発生日時 |
| sourceVersion | ConfigVersion | マイグレーション元バージョン |
| targetVersion | ConfigVersion | マイグレーション先バージョン |
| configFilePath | FilePath | 設定ファイルパス |
| backupFilePath | FilePath | バックアップファイルパス |

**トリガー**: `ConfigMigrationService.migrate()` 成功時

#### 2.4.2 FeatureToggled

| 属性 | 型 | 説明 |
|------|-----|------|
| occurredAt | Date | イベント発生日時 |
| featureName | string | トグルされた機能名 |
| newState | boolean | 新しい状態（true: 有効、false: 無効） |
| configFilePath | FilePath | 設定ファイルパス |

**トリガー**: `HarnessConfig.enableFeature()` / `HarnessConfig.disableFeature()` 実行時

### 2.5 ドメインエラー

全エラーは`ConfigDomainError`基底クラスを継承する。HarnessError型（統合契約§4.1）に変換可能なメソッド`toHarnessError()`を持つ。

| エラー型 | 発生条件 | code | severity |
|---------|---------|------|----------|
| `ConfigValidationError` | JSONスキーマバリデーション失敗 | `CONFIG_VALIDATION_FAILED` | error |
| `InvalidFeatureNameError` | 存在しない機能名を指定 | `INVALID_FEATURE_NAME` | error |
| `InvalidFilePathError` | パスがプロジェクトルート外 | `INVALID_FILE_PATH` | error |
| `EmptyFilePathError` | 空文字列のパスを指定 | `EMPTY_FILE_PATH` | error |
| `GlobalFilePathError` | グローバルパス（~/等）を指定 | `GLOBAL_FILE_PATH` | error |
| `InvalidModeError` | 不正なモード値を指定 | `INVALID_MODE` | error |
| `InvalidPresetError` | 不正なプリセット値を指定 | `INVALID_PRESET` | error |
| `MigrationError` | マイグレーション処理中のエラー | `MIGRATION_FAILED` | error |
| `AlreadyMigratedError` | 既にv2形式の設定に対するマイグレーション試行 | `ALREADY_MIGRATED` | warning |

**ConfigDomainError基底クラス構造**:

| 属性 | 型 | 説明 |
|------|-----|------|
| code | string | エラーコード |
| severity | `"error"` \| `"warning"` | 深刻度 |
| message | string | エラーメッセージ（人間可読） |
| suggestion | string | 修正方法の提案 |

**toHarnessError()メソッド**: `ConfigDomainError`→`HarnessError`型への変換。`adr_ref`は空文字列（ADR未作成のため）、`fix_example`はエラー型ごとに定義。

---

## 3. Port（ポートインターフェース）設計

全ポートはTypeScript interfaceとして定義する。Infrastructure層がこれを実装する。

### 3.1 ConfigRepository

```
interface ConfigRepository {
  load(filePath: FilePath): Promise<unknown>
  save(filePath: FilePath, config: object): Promise<void>
  exists(filePath: FilePath): Promise<boolean>
}
```

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| `load` | `filePath: FilePath` | `Promise<unknown>` | JSONファイルを読み込みパース済みオブジェクトを返す |
| `save` | `filePath: FilePath, config: object` | `Promise<void>` | オブジェクトをJSONとしてファイルに書き出す |
| `exists` | `filePath: FilePath` | `Promise<boolean>` | ファイルが存在するかどうかを返す |

### 3.2 ConfigSchemaValidator

```
interface ConfigSchemaValidator {
  validate(json: unknown, schema: object): ValidationResult
  extractCustomProperty(schema: object, propertyName: string): Map<string, unknown>
}
```

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| `validate` | `json: unknown, schema: object` | `ValidationResult` | JSONスキーマバリデーション実行 |
| `extractCustomProperty` | `schema: object, propertyName: string` | `Map<string, unknown>` | スキーマ内のカスタムプロパティ（例: `x-env-override`）を抽出 |

### 3.3 BackupCreator

```
interface BackupCreator {
  createBackup(filePath: FilePath): Promise<FilePath>
}
```

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| `createBackup` | `filePath: FilePath` | `Promise<FilePath>` | ファイルのバックアップを作成し、バックアップ先パスを返す |

**バックアップ先規約**: `.harness/backups/harness.config.{timestamp}.json`（Q5回答済み）

### 3.4 EnvironmentVariableReader

```
interface EnvironmentVariableReader {
  read(variableName: string): string | undefined
  readAll(): Map<string, string>
}
```

| メソッド | 入力 | 出力 | 説明 |
|---------|------|------|------|
| `read` | `variableName: string` | `string \| undefined` | 指定した環境変数の値を返す。未設定の場合undefined |
| `readAll` | なし | `Map<string, string>` | 全環境変数をMap形式で返す |

---

## 4. UseCase層設計

各UseCaseはアプリケーションサービスとして、ポートの取得→集約操作→ポートの永続化の調整を行う。ビジネスロジックは集約・ドメインサービスに委譲する。

### 4.1 LoadConfigUseCase

**責務**: 設定ファイルを読み込み、HarnessConfig集約を構築して返却する。他Unitからの利用エントリポイント。

**コンストラクタ依存**:
- `configRepository: ConfigRepository`
- `schemaValidator: ConfigSchemaValidator`
- `envReader: EnvironmentVariableReader`

**入力**: `configPath?: string`（省略時はプロジェクトルートからの自動検出）

**出力**: `HarnessConfig`

**処理フロー**:

1. `configPath`未指定の場合、プロジェクトルートから`harness.config.json`を探索
2. `configRepository.exists(filePath)` で存在確認
3. 存在しない場合: デフォルト設定で`HarnessConfig.create()`を呼び出し
4. `configRepository.load(filePath)` で設定ファイルを読み込み
5. 組み込みJSONスキーマを取得（Infrastructure層から提供）
6. `HarnessConfig.create(rawJson, schema)` で集約を生成
7. `envReader.readAll()` で環境変数を取得
8. `harnessConfig.resolveEnvironmentOverrides(envVars)` で環境変数オーバーライドを適用
9. `harnessConfig.resolveFilePaths(projectRoot)` でパス解決
10. `HarnessConfig`を返却

### 4.2 EnableFeatureUseCase

**責務**: 指定された機能を有効化し、設定ファイルを更新する。

**コンストラクタ依存**:
- `configRepository: ConfigRepository`
- `schemaValidator: ConfigSchemaValidator`
- `envReader: EnvironmentVariableReader`

**入力**: `featureName: string`, `configPath?: string`

**出力**: `void`

**処理フロー**:

1. `LoadConfigUseCase`相当の処理で`HarnessConfig`を取得
2. `harnessConfig.enableFeature(featureName)` を呼び出し
3. `harnessConfig.toJSON()` でシリアライズ
4. `configRepository.save(filePath, json)` で保存
5. `harnessConfig.pullDomainEvents()` でイベントを取得（ログ記録用）

### 4.3 DisableFeatureUseCase

**責務**: 指定された機能を無効化し、設定ファイルを更新する。

**コンストラクタ依存**: EnableFeatureUseCaseと同一。

**入力**: `featureName: string`, `configPath?: string`

**出力**: `void`

**処理フロー**: EnableFeatureUseCaseと同構造。ステップ2で`disableFeature(featureName)`を呼び出す。

### 4.4 ListToggleableFeaturesUseCase

**責務**: トグル可能な機能名一覧と各機能の現在のenabled状態を返却する。

**コンストラクタ依存**:
- `configRepository: ConfigRepository`
- `schemaValidator: ConfigSchemaValidator`
- `envReader: EnvironmentVariableReader`

**入力**: `configPath?: string`

**出力**: `Array<{ name: string; enabled: boolean }>`

**処理フロー**:

1. `LoadConfigUseCase`相当の処理で`HarnessConfig`を取得
2. `harnessConfig.getToggleableFeatures()` で機能名一覧を取得
3. 各機能名について`harnessConfig.featureToggles.isEnabled(name)` で状態を取得
4. `{ name, enabled }` の配列を返却

### 4.5 MigrateConfigUseCase

**責務**: v1設定をv2形式にマイグレーションする。

**コンストラクタ依存**:
- `configMigrationService: ConfigMigrationService`
- `configRepository: ConfigRepository`
- `schemaValidator: ConfigSchemaValidator`

**入力**: `configPath?: string`

**出力**: `MigrationResult`

**処理フロー**:

1. `configPath`未指定の場合、プロジェクトルートから`harness.config.json`を探索
2. `configRepository.exists(filePath)` で存在確認
3. 存在しない場合: エラー（`ConfigNotFoundError`）
4. 組み込みJSONスキーマ（v2）を取得
5. `configMigrationService.migrate(filePath, schema)` を呼び出し
6. `MigrationResult`を返却

---

## 5. Controller層設計（CLI）

既存CLIパターン（`scripts/harness/cli/`）に合わせる。各ハンドラは`process.argv`から引数を受け取り、UseCaseを呼び出し、結果をコンソールに出力する。

### 5.1 EnableFeatureHandler

**ファイル**: `scripts/harness/cli/enable.ts`（既存ファイルをリファクタリング）

**入力パース**:
- `process.argv[2]`: 機能名（必須）。`--list`フラグの場合は一覧表示モード
- 引数なしの場合: Usage表示してexit(1)

**UseCaseマッピング**:
- `--list`フラグ → `ListToggleableFeaturesUseCase.execute()`
- 機能名指定 → `EnableFeatureUseCase.execute(featureName)`

**出力フォーマット**:

成功時:
```
✓ Enabled feature: orchestration
Updated: /path/to/harness.config.json
```

一覧表示時:
```
Toggleable features:
  orchestration     [disabled]
  session           [disabled]
  quick_mode        [disabled]
  parallelization   [disabled]
  ...
```

**エラーハンドリング**:
- `InvalidFeatureNameError` → 利用可能な機能名一覧を含むエラーメッセージを表示してexit(1)
- `ConfigValidationError` → バリデーションエラー詳細を表示してexit(1)
- その他の例外 → `toHarnessError()`で変換し、suggestion付きで表示してexit(1)

**v1互換**: 既存のレイヤー/ハーネストグル機能はそのまま維持する。v2機能トグルを追加する形でリファクタリングする。判定順序: (1) v2機能名一覧に含まれるか → v2パス、(2) v1のレイヤー/ハーネス名に含まれるか → v1パス（既存ロジック維持）。

### 5.2 DisableFeatureHandler

**ファイル**: `scripts/harness/cli/disable.ts`（既存ファイルをリファクタリング）

**構造**: EnableFeatureHandlerと同構造。`DisableFeatureUseCase`を呼び出す。

**出力フォーマット**:

```
✓ Disabled feature: orchestration
Updated: /path/to/harness.config.json
```

### 5.3 MigrateConfigHandler

**ファイル**: `scripts/harness/cli/migrate-config.ts`（新規）

**入力パース**:
- `process.argv[2]`: オプションの設定ファイルパス。省略時は自動検出
- `--dry-run`フラグ: 実際には書き込まず、マイグレーション結果のみ表示

**UseCaseマッピング**: `MigrateConfigUseCase.execute(configPath)`

**出力フォーマット**:

成功時:
```
✓ Migration complete: v1 → v2
  Backup: .harness/backups/harness.config.1741654800000.json
  Updated: /path/to/harness.config.json

  Added sections:
    - orchestration (enabled: false)
    - session (enabled: false)
    - quick_mode (enabled: false)
```

既にv2の場合:
```
ℹ Already v2 format. No migration needed.
```

**エラーハンドリング**:
- 設定ファイル未検出 → `"harness.config.json not found. Run 'harness:init' first."` を表示してexit(1)
- バリデーション失敗 → エラー詳細とsuggestionを表示してexit(1)

**package.json登録**:
```
"harness:migrate-config": "npx tsx scripts/harness/cli/migrate-config.ts"
```

---

## 6. Infrastructure層設計（アダプター）

### 6.1 FileSystemConfigRepository

**実装ポート**: `ConfigRepository`

**利用ライブラリ**: `node:fs`（promises API）、`node:path`

**実装方針**:
- `load`: `fs.readFile` + `JSON.parse`。パースエラー時は`ConfigValidationError`をスロー
- `save`: `JSON.stringify(config, null, 2) + "\n"` で整形して`fs.writeFile`。既存のv1 config-loaderと同じインデント2を維持
- `exists`: `fs.access` でファイル存在確認

**設計上の注意点**:
- ファイルI/Oは全て非同期（async/await）
- エンコーディングは`utf-8`固定
- 書き出し時に末尾改行を付与（既存パターン準拠）

### 6.2 JsonSchemaValidator (ajv)

**実装ポート**: `ConfigSchemaValidator`

**利用ライブラリ**: `ajv`（Q1回答済み）

**実装方針**:
- コンストラクタで`Ajv`インスタンスを生成（`allErrors: true`で全エラーを収集）
- `validate`: ajvの`validate`関数を呼び出し、エラーを`ValidationResult`に変換
- `extractCustomProperty`: スキーマオブジェクトを再帰的に走査し、指定したカスタムプロパティ（例: `x-env-override`）を持つフィールドを`Map<configPath, propertyValue>`形式で返す

**ajv設定**:
- `allErrors: true`（全エラーを一括報告）
- `strict: false`（`x-env-override`等のカスタムキーワードを許容）
- `useDefaults: true`（スキーマ定義のdefault値を自動適用）

**設計上の注意点**:
- ajvインスタンスはシングルトンとして再利用（スキーマコンパイルのコスト削減）
- カスタムキーワード`x-env-override`はバリデーション対象外（メタデータとして利用）

### 6.3 FileSystemBackupCreator

**実装ポート**: `BackupCreator`

**利用ライブラリ**: `node:fs`（promises API）、`node:path`

**実装方針**:
- バックアップ先ディレクトリ: `.harness/backups/`（Q5回答済み）
- ファイル名: `harness.config.{timestamp}.json`（timestampは`Date.now()`のミリ秒エポック）
- ディレクトリが存在しない場合: `fs.mkdir`で再帰的に作成
- ファイルコピー: `fs.copyFile`

**設計上の注意点**:
- タイムスタンプの衝突は実用上発生しないが、同名ファイル存在時は上書きしない（エラーとする）
- バックアップ先パスは`FilePath`値オブジェクトで返却する

### 6.4 ProcessEnvironmentReader

**実装ポート**: `EnvironmentVariableReader`

**利用ライブラリ**: なし（`process.env`のみ）

**実装方針**:
- `read(variableName)`: `process.env[variableName]`を返す
- `readAll()`: `process.env`をMap形式に変換して返す

**設計上の注意点**:
- テスタビリティのためにポート化している。テスト時はモックに差し替える
- `process.env`の値は全て`string | undefined`

---

## 7. 公開API（Shared Kernel）

### 7.1 loadConfig ファサード関数

**ファイル**: `scripts/harness/config-foundation/index.ts`

**シグネチャ**:

```
export async function loadConfig(configPath?: string): Promise<HarnessConfigV2>
```

**DI隠蔽方針**:
- ファサード関数内部でInfrastructure層のアダプターをインスタンス化し、UseCaseに注入する
- 呼び出し側はDIコンテナや個別アダプターを意識しない
- 内部的には`LoadConfigUseCase`を構築・実行する

**他Unitからの利用方法**:

```
import { loadConfig } from "../config-foundation/index.js";

const config = await loadConfig();
const orchestration = config.orchestration;
if (orchestration.enabled) {
  // orchestration関連の処理
}
```

**キャッシュ方針**:
- 既存v1の`config-loader.ts`と同様にモジュールレベルでキャッシュを保持
- `clearConfigCache()`で明示的にクリア可能
- キャッシュキーは`configPath`（パス単位）

**v1互換エクスポート**:
- 既存の`loadConfig`（v1）は`config-loader.ts`に残存
- v2の`loadConfig`は`config-foundation/index.ts`からエクスポート
- 段階的移行: 各Unitがv2に対応するタイミングでimport先を切り替え

### 7.2 HarnessConfigV2型定義

**エクスポート元**: `scripts/harness/config-foundation/index.ts`

**型構造**（統合契約§4.2準拠）:

```
interface HarnessConfigV2 {
  version: number;                    // 2
  preset: "minimal" | "standard" | "strict";

  // v1既存（継承）
  project: ProjectConfig;
  layers: LayerConfig;
  harnesses: HarnessesConfig;
  paths: PathsConfig;
  reporting: ReportingConfig;

  // v2新規（GSD統合）
  orchestration: {
    enabled: boolean;
    mode: "single" | "parallel";
    parallelization: { enabled: boolean };
    modelProfile: { enabled: boolean };
    contextStrategy: { enabled: boolean };
    commitStrategy: { enabled: boolean };
    workflow: { enabled: boolean };
  };
  session: {
    enabled: boolean;
    stateFile: string;
    roadmapFile: string;
  };
  quick_mode: {
    enabled: boolean;
    targetConditions: string[];
    excludeConditions: string[];
    validators: string[];
  };
}
```

**エクスポート方針**:
- `HarnessConfigV2`型は`config-foundation/index.ts`からre-export
- v1の`HarnessConfig`型（`config-schema.ts`）はv1互換として残存
- 他Unitは`HarnessConfigV2`型のみをimportする

---

## 8. JSONスキーマ設計（v2）

### 8.1 スキーマ構造概要

**ファイル配置**: `scripts/harness/config-foundation/schema/harness-config-v2.schema.json`

**トップレベル構造**:

```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "project"],
  "properties": {
    "version": { "type": "number", "const": 2 },
    "preset": { "enum": ["minimal", "standard", "strict"], "default": "standard" },
    "project": { "$ref": "#/$defs/ProjectConfig" },
    "layers": { "$ref": "#/$defs/LayerConfig" },
    "harnesses": { "$ref": "#/$defs/HarnessesConfig" },
    "paths": { "$ref": "#/$defs/PathsConfig" },
    "reporting": { "$ref": "#/$defs/ReportingConfig" },
    "orchestration": { "$ref": "#/$defs/OrchestrationConfig" },
    "session": { "$ref": "#/$defs/SessionConfig" },
    "quick_mode": { "$ref": "#/$defs/QuickModeConfig" }
  },
  "additionalProperties": false,
  "$defs": { ... }
}
```

### 8.2 x-env-override カスタムプロパティ定義

スキーマの各フィールドに`x-env-override`カスタムプロパティを付与することで、環境変数オーバーライドのマッピングを宣言的に定義する（Q3回答済み）。

**定義形式**:

```
"mode": {
  "type": "string",
  "enum": ["single", "parallel"],
  "default": "single",
  "x-env-override": "HARNESS_ORCHESTRATION_MODE"
}
```

**主要マッピング一覧**:

| スキーマパス | 環境変数名 | 型 |
|------------|-----------|-----|
| `orchestration.mode` | `HARNESS_ORCHESTRATION_MODE` | string |
| `orchestration.enabled` | `HARNESS_ORCHESTRATION_ENABLED` | boolean |
| `session.enabled` | `HARNESS_SESSION_ENABLED` | boolean |
| `session.stateFile` | `HARNESS_SESSION_STATE_FILE` | string |
| `quick_mode.enabled` | `HARNESS_QUICK_MODE_ENABLED` | boolean |

**型変換ルール**:
- 環境変数は全て文字列。スキーマの`type`に基づいて変換する
- `boolean`: `"true"` / `"1"` → true、`"false"` / `"0"` → false
- `number`: `parseFloat()`で変換。NaNの場合はバリデーションエラー
- `string`: そのまま使用

### 8.3 enabledフィールドのトグル対象動的抽出仕様

**抽出アルゴリズム**:

1. スキーマの`properties`を走査
2. 各プロパティの`$ref`を解決して実体を取得
3. 実体のプロパティに`enabled`（type: boolean）が含まれるかを判定
4. 含まれる場合、そのプロパティ名をトグル対象として登録
5. ネストされたプロパティも再帰的に走査（例: `orchestration.parallelization.enabled`）

**トグル対象の階層**:
- トップレベルトグル: `orchestration`, `session`, `quick_mode`
- サブレベルトグル: `orchestration.parallelization`, `orchestration.modelProfile`, `orchestration.contextStrategy`, `orchestration.commitStrategy`, `orchestration.workflow`

**`enableFeature` / `disableFeature`の対象範囲**: トップレベルトグルとサブレベルトグルの両方。サブレベルトグルはドット記法で指定する（例: `"orchestration.parallelization"`）。

---

## 9. テスト設計

### 9.1 テスト対象×テストレイヤー対応表

| テスト対象 | ユニットテスト | インテグレーションテスト |
|-----------|:----------:|:------------:|
| HarnessConfig（集約ルート） | ○ | — |
| 値オブジェクト群 | ○ | — |
| ConfigMigrationService | ○ | — |
| ConfigValidationService | ○ | — |
| LoadConfigUseCase | ○ | — |
| EnableFeatureUseCase | ○ | — |
| DisableFeatureUseCase | ○ | — |
| ListToggleableFeaturesUseCase | ○ | — |
| MigrateConfigUseCase | ○ | — |
| EnableFeatureHandler（CLI） | ○ | — |
| DisableFeatureHandler（CLI） | ○ | — |
| MigrateConfigHandler（CLI） | ○ | — |
| FileSystemConfigRepository | ○ | — |
| JsonSchemaValidator (ajv) | ○ | — |
| FileSystemBackupCreator | ○ | — |
| ProcessEnvironmentReader | ○ | — |
| ファサード loadConfig | — | ○ |
| v1→v2マイグレーション全フロー | — | ○ |
| 既存CLI互換性 | — | ○ |

### 9.2 Domain層テスト方針

Domain層のテストではモックを使わず、全て実体を使用する（テスト規約準拠）。

#### HarnessConfig集約のテスト

**ファイル**: `scripts/harness/__tests__/config-foundation/domain/harness-config.test.ts`

不変条件INV-1〜INV-8を網羅的に検証する。

**テストケース例**:

```
target('create', () => {
  describe('HarnessConfigファクトリメソッドの生成', () => {
    it('有効なv2 JSONとスキーマからHarnessConfigが生成される', ...)
    it('有効なv1 JSONからv1互換のHarnessConfigが生成される', ...)

    context('JSONがスキーマに適合しない場合', () => {
      it('ConfigValidationErrorがスローされる', ...)               // INV-1
    })
    context('GSD由来設定のenabledがtrueに設定されている場合', () => {
      it('デフォルト値の検証でエラーにならない（ユーザー指定は尊重）', ...)
    })
    context('v2設定にversionフィールドがない場合', () => {
      it('ConfigValidationErrorがスローされる', ...)               // INV-3
    })
    context('v2設定からv1既存フィールドが欠落している場合', () => {
      it('ConfigValidationErrorがスローされる', ...)               // INV-5
    })
  })
})

target('enableFeature', () => {
  describe('指定された機能を有効化する', () => {
    it('対象機能のenabled状態がtrueになる', ...)
    it('FeatureToggledドメインイベントが生成される', ...)

    context('存在しない機能名を指定した場合', () => {
      it('InvalidFeatureNameErrorがスローされる', ...)             // INV-4
      it('エラーメッセージに利用可能な機能名一覧が含まれる', ...)
    })
  })
})

target('disableFeature', () => {
  describe('指定された機能を無効化する', () => {
    it('対象機能のenabled状態がfalseになる', ...)
    it('FeatureToggledドメインイベントが生成される', ...)

    context('存在しない機能名を指定した場合', () => {
      it('InvalidFeatureNameErrorがスローされる', ...)             // INV-4
    })
  })
})

target('resolveEnvironmentOverrides', () => {
  describe('環境変数によるオーバーライドを適用する', () => {
    it('x-env-overrideに対応する環境変数の値で設定が上書きされる', ...)

    context('オーバーライド適用後にスキーマバリデーションが失敗する場合', () => {
      it('ConfigValidationErrorがスローされる', ...)               // INV-7
    })
  })
})

target('resolveFilePaths', () => {
  describe('相対パスを絶対パスに解決する', () => {
    it('相対パスがプロジェクトルートを基準に絶対パスに変換される', ...)

    context('解決後のパスがプロジェクトルート外の場合', () => {
      it('InvalidFilePathErrorがスローされる', ...)                // INV-6
    })
  })
})

target('getOrchestration', () => {
  describe('OrchestrationConfig値オブジェクトを返す', () => {
    context('orchestration.enabledがfalseの場合', () => {
      it('OrchestrationConfigが返却される（INV-8: 値は保持されている）', ...)
    })
  })
})

target('toJSON', () => {
  describe('シリアライズ可能なオブジェクトを返す', () => {
    it('JSONとして書き出し可能な形式に変換される', ...)
    it('schemaやdomainEventsは含まれない', ...)
  })
})
```

#### 値オブジェクトのテスト

各値オブジェクトについて以下を検証する:

- **正常生成**: 有効な値から正しくインスタンスが生成される
- **バリデーション**: 不正値に対してドメインエラーがスローされる
- **等価性**: 同じ値を持つインスタンス同士がequalsでtrueを返す
- **不変性**: メソッド呼び出しが新インスタンスを返し、元インスタンスは変更されない

**FilePath テストケース例**:

```
target('create', () => {
  describe('FilePathを生成する', () => {
    it('有効な相対パスからFilePathが生成される', ...)

    context('空文字列が渡された場合', () => {
      it('EmptyFilePathErrorがスローされる', ...)
    })
    context('~/で始まるパスが渡された場合', () => {
      it('GlobalFilePathErrorがスローされる', ...)
    })
    context('$HOMEを含むパスが渡された場合', () => {
      it('GlobalFilePathErrorがスローされる', ...)
    })
  })
})
```

#### ドメインサービスのテスト

**ConfigMigrationServiceテスト**:

ポート（ConfigRepository, BackupCreator, ConfigSchemaValidator）はモックを使用する（管理下にない外部依存のため）。Domain層のオブジェクト（ConfigVersion, MigrationResult等）は実体を使用する。

```
target('migrate', () => {
  describe('v1設定をv2に変換する', () => {
    it('v1設定にv2セクションが追加されたMigrationResultが返される', ...)
    it('v1既存フィールドが変更されずに保持されている', ...)
    it('バックアップファイルが作成される', ...)
    it('GSD由来設定のenabledがfalseに設定される', ...)

    context('既にv2形式の設定が渡された場合', () => {
      it('警告付きのMigrationResult（success: true）が返される', ...)
    })
    context('マイグレーション後のバリデーションが失敗する場合', () => {
      it('MigrationResult（success: false）が返される', ...)
    })
  })
})

target('detectVersion', () => {
  describe('JSONからバージョンを判定する', () => {
    context('versionフィールドがない場合', () => {
      it('V1が返される', ...)
    })
    context('versionフィールドが2の場合', () => {
      it('V2が返される', ...)
    })
  })
})
```

**ConfigValidationServiceテスト**:

`ConfigSchemaValidator`ポートはモックを使用する。

```
target('validate', () => {
  describe('JSONスキーマバリデーションを実行する', () => {
    it('有効なJSONに対してvalid: trueのValidationResultが返される', ...)

    context('スキーマに適合しないJSONの場合', () => {
      it('valid: falseのValidationResultが返される', ...)
      it('errorsにエラー箇所と違反キーワードが含まれる', ...)
    })
  })
})

target('extractToggleableFeatures', () => {
  describe('スキーマからトグル対象を動的抽出する', () => {
    it('enabledフィールドを持つセクション名が抽出される', ...)
    it('v1既存セクション（project, layers等）は除外される', ...)
    it('ネストされたenabledフィールドも抽出される', ...)
  })
})
```

### 9.3 UseCase層テスト方針

**ポートのモック戦略**: 全ポート（ConfigRepository, ConfigSchemaValidator, BackupCreator, EnvironmentVariableReader）をモックする。Domain層のオブジェクトは実体を使用する。

**共通パターン**:
- `vi.fn()`でポートメソッドのモックを作成
- Arrange: モックの戻り値を設定
- Act: UseCaseのexecuteを呼び出し
- Assert: 結果値の検証 + ポートメソッドの呼び出し引数・回数の検証

**MigrateConfigUseCase テストケース例**:

```
target('execute', () => {
  describe('v1→v2マイグレーションを実行する', () => {
    it('マイグレーション成功時にMigrationResult（success: true）が返される', ...)
    it('ConfigMigrationService.migrateが正しい引数で呼び出される', ...)

    context('設定ファイルが存在しない場合', () => {
      it('ConfigNotFoundErrorがスローされる', ...)
    })
  })
})
```

### 9.4 Controller層テスト方針

**テスト対象**: 入力パース、UseCase呼び出し、出力フォーマット、エラーハンドリング。

**モック戦略**: UseCaseをモックする。`process.argv`と`console.log`/`console.error`をスタブする。

**テストケース例（MigrateConfigHandler）**:

```
target('harness:migrate-config', () => {
  describe('v1→v2マイグレーションCLIコマンド', () => {
    it('マイグレーション成功時にバックアップパスと更新パスが表示される', ...)

    context('設定ファイルが見つからない場合', () => {
      it('エラーメッセージとharness:initへの案内が表示される', ...)
    })
    context('--dry-runフラグが指定された場合', () => {
      it('ファイル書き込みが行われずにマイグレーション結果のみ表示される', ...)
    })
  })
})
```

### 9.5 Infrastructure層テスト方針

**テスト対象**: 各アダプターの具体的なI/O動作。

**モック戦略**:
- `FileSystemConfigRepository` / `FileSystemBackupCreator`: 実際のファイルシステム操作を行う（一時ディレクトリを使用）
- `JsonSchemaValidator`: ajvの実際の動作を検証（外部ライブラリのラッパーなので実体を使用）
- `ProcessEnvironmentReader`: `process.env`をテスト前に設定し、テスト後にクリーンアップ

**JsonSchemaValidator テストケース例**:

```
target('validate', () => {
  describe('ajvによるJSONスキーマバリデーション', () => {
    it('有効なJSONに対してvalid: trueが返される', ...)
    it('必須フィールド欠落時にvalid: falseが返される', ...)
    it('型不一致時にエラーパスとキーワードが正しく設定される', ...)
  })
})

target('extractCustomProperty', () => {
  describe('スキーマからカスタムプロパティを抽出する', () => {
    it('x-env-overrideが設定されたフィールドが抽出される', ...)
    it('カスタムプロパティが未設定のフィールドは除外される', ...)
    it('ネストされたフィールドのカスタムプロパティも抽出される', ...)
  })
})
```

### 9.6 テストダブル方針

| テスト対象層 | Domain | Port | Infrastructure |
|------------|--------|------|---------------|
| Domain層テスト | 実体 | モック | — |
| UseCase層テスト | 実体 | モック | — |
| Controller層テスト | — | — | モック（UseCase単位） |
| Infrastructure層テスト | — | — | 実体（一時ディレクトリ等） |
| インテグレーションテスト | 実体 | 実体 | 実体（一時ディレクトリ等） |

**テスト規約準拠事項**:
- テストケース名は全て日本語で記述する
- AAAパターン（Arrange-Act-Assert）で構成する
- テスト結果は`actual`に代入する
- ファイル名はkebab-case
- `target` / `describe` / `context` / `it` の構造を使用する
- 実装の詳細はテストケース名に表さない

---

## 10. ストーリーとの対応

### US-027: orchestrationセクションの追加

| AC | 対応する設計要素 |
|----|---------------|
| AC-1: orchestrationセクション追加 | Domain: OrchestrationConfig値オブジェクト、JSONスキーマ§8.1 |
| AC-2: mode/parallelization等の設定項目 | Domain: Mode, ParallelizationConfig, ModelProfileConfig, ContextStrategyConfig, CommitStrategyConfig, WorkflowConfig値オブジェクト |
| AC-3: JSONスキーマバリデーション通過 | Domain: ConfigValidationService、Infrastructure: JsonSchemaValidator |
| AC-4: GSD由来設定のデフォルトOFF | Domain: HarnessConfig.create()のINV-2検証、JSONスキーマdefault値 |
| AC-5: 3プリセットのデフォルト値 | Domain: Preset値オブジェクト、HarnessConfig.applyPreset() |

### US-028: sessionセクションの追加

| AC | 対応する設計要素 |
|----|---------------|
| AC-1: sessionセクション追加 | Domain: SessionConfig値オブジェクト、JSONスキーマ§8.1 |
| AC-2: stateFile/roadmapFile設定 | Domain: SessionConfig属性、FilePath値オブジェクト |
| AC-3: デフォルト値 | JSONスキーマdefault値、SessionConfig生成時のデフォルト |
| AC-4: JSONスキーマバリデーション通過 | Domain: ConfigValidationService、Infrastructure: JsonSchemaValidator |

### US-029: GSD由来機能のデフォルト無効化

| AC | 対応する設計要素 |
|----|---------------|
| AC-1: orchestrationのデフォルトOFF | Domain: INV-2、JSONスキーマdefault、OrchestrationConfig |
| AC-2: sessionのデフォルトOFF | Domain: INV-2、JSONスキーマdefault、SessionConfig |
| AC-3: デフォルト値検証テスト | テスト設計§9.2（HarnessConfig集約テスト） |
| AC-4: harness:enable | Controller: EnableFeatureHandler、UseCase: EnableFeatureUseCase |
| AC-5: harness:disable | Controller: DisableFeatureHandler、UseCase: DisableFeatureUseCase |
| AC-6: harness:enable --list | Controller: EnableFeatureHandler（--listフラグ）、UseCase: ListToggleableFeaturesUseCase |
| AC-7: 不正機能名エラー | Domain: InvalidFeatureNameError、Controller: エラーハンドリング |

### US-030: harness:migrate-configによるv1→v2自動マイグレーション

| AC | 対応する設計要素 |
|----|---------------|
| AC-1: migrate-configコマンド実行可能 | Controller: MigrateConfigHandler、package.json登録 |
| AC-2: v1→v2自動変換 | Domain: ConfigMigrationService.migrate() |
| AC-3: v1設定保持+v2セクション追加 | Domain: INV-5、ConfigMigrationService処理フロー |
| AC-4: バックアップ作成 | Port: BackupCreator、Infrastructure: FileSystemBackupCreator |
| AC-5: v2スキーマバリデーション通過 | Domain: ConfigValidationService、Infrastructure: JsonSchemaValidator |
