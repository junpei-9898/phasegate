# ITテスト設計: config-foundation

@story-id H04-01
@story-id H04-02
@story-id H04-03

> **作成日**: 2026-03-13
> **対応ストーリー**: H04-01, H04-02, H04-03
> **正規ソース**: `docs/product/construction/config-foundation/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`
> **Phase 1計画**: `docs/inception/config-foundation/it_test_design_plan.md`

---

## 1. 対象コンポーネント

### UseCase一覧

| UseCase | ファイル | 責務 |
|---------|---------|------|
| LoadResolvedConfigUseCase | `application/use-cases/load-resolved-config-use-case.ts` | 設定読込・スキーマ検証・Preset解決・DTO返却 |
| ValidateConfigUseCase | `application/use-cases/validate-config-use-case.ts` | 設定妥当性検証 |
| EnableFeatureUseCase | `application/use-cases/enable-feature-use-case.ts` | Feature有効化・保存 |
| DisableFeatureUseCase | `application/use-cases/disable-feature-use-case.ts` | Feature無効化・保存 |
| ListAvailableFeaturesUseCase | `application/use-cases/list-available-features-use-case.ts` | 利用可能機能一覧と現在状態の返却 |

### Infrastructure一覧

| Adapter | ファイル | 実装ポート |
|---------|---------|-----------|
| FileSystemConfigRepository | `infrastructure/repositories/file-system-config-repository.ts` | ConfigRepositoryPort |
| AjvConfigSchemaValidator | `infrastructure/validators/ajv-config-schema-validator.ts` | ConfigSchemaValidatorPort |
| StaticFeatureRegistryAdapter | `infrastructure/registries/static-feature-registry-adapter.ts` | FeatureRegistryPort |
| PresetDefinitionStore | `infrastructure/preset-definition-store.ts` | (データ供給) |

### Presentation一覧

| Handler | ファイル | 責務 |
|---------|---------|------|
| EnableFeatureCommandHandler | `presentation/cli/enable-feature-command-handler.ts` | harness:enable CLI |
| DisableFeatureCommandHandler | `presentation/cli/disable-feature-command-handler.ts` | harness:disable CLI |
| ListAvailableFeaturesCommandHandler | `presentation/cli/list-available-features-command-handler.ts` | 機能一覧表示 |

### Facade

| Facade | ファイル | 責務 |
|--------|---------|------|
| load-config | `application/facades/load-config.ts` | Composition root / 他Unit向け公開窓口 |

### 対象外コンポーネント

| コンポーネント | 除外理由 |
|-------------|---------|
| CompositeFeatureRegistryAdapter | Wave 1では未使用（QA Q2回答に基づく） |
| 互換CLIエントリーポイント (`cli/enable.ts`, `cli/disable.ts`) | Presentation層ハンドラへ委譲するだけの薄いラッパー |
| 互換ファサード (`core/config-loader.ts`) | `load-config.ts` を呼ぶだけの薄いラッパー |

---

## 2. テストファイル構成

```
scripts/harness/__tests__/config-foundation/
├── application/
│   ├── use-cases/
│   │   ├── load-resolved-config-use-case.test.ts
│   │   ├── validate-config-use-case.test.ts
│   │   ├── enable-feature-use-case.test.ts
│   │   ├── disable-feature-use-case.test.ts
│   │   └── list-available-features-use-case.test.ts
│   └── facades/
│       └── load-config.test.ts
├── infrastructure/
│   ├── repositories/
│   │   └── file-system-config-repository.test.ts
│   ├── validators/
│   │   └── ajv-config-schema-validator.test.ts
│   ├── registries/
│   │   └── static-feature-registry-adapter.test.ts
│   └── preset-definition-store.test.ts
└── presentation/
    └── cli/
        ├── enable-feature-command-handler.test.ts
        ├── disable-feature-command-handler.test.ts
        └── list-available-features-command-handler.test.ts
```

---

## 3. UseCaseテストケース

### 3.1 LoadResolvedConfigUseCase

**コンストラクタ依存（モック対象）**:
- `ConfigRepositoryPort`（モック）
- `ConfigSchemaValidatorPort`（モック）
- `PresetResolutionService`（実体）
- `presetDefinitions`（実定数）

#### 正常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待結果 |
|----------|-------------|---------|-----------------|---------|
| IT-CF-001 | 有効なraw documentからHarnessConfigV2 DTOを返すこと | configPath指定でload→スキーマ検証OK→Preset解決→DTO変換 | `configRepository.load` → `{ path: "/tmp/phasegate.config.json", document: validDoc }`, `schemaValidator.validate` → `[]` | `ResolvedConfigOutput` に `config: HarnessConfigV2` と `sourcePath` が含まれる |
| IT-CF-002 | configPath未指定時にリポジトリの探索結果を使用してDTOを返すこと | configPath省略でload→解決→DTO変換 | `configRepository.load(undefined)` → `{ path: "/discovered/path/phasegate.config.json", document: validDoc }`, `schemaValidator.validate` → `[]` | `sourcePath` がリポジトリの探索結果パスと一致する |
| IT-CF-003 | Preset解決によりsourceDocumentの差分がresolvedDocumentに反映されること | standard PresetのdocumentにcoverageThreshold上書きを含む | `configRepository.load` → standard Preset + `coverageThreshold: 95` の差分document, `schemaValidator.validate` → `[]` | 返却DTOの `layers.L3.coverageThreshold` が `95` である |
| IT-CF-004 | minimal Presetでデフォルト無効のGSD機能がすべてfalse/0で返ること | minimal Preset指定のdocument | `configRepository.load` → minimal document, `schemaValidator.validate` → `[]` | `harnesses.agentLessonCollection === false`, `harnesses.cascadeUpdate === false`, `harnesses.bundleSizeLimit === 0`, `harnesses.deadCodeGC === false` |

#### 異常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待エラー |
|----------|-------------|---------|-----------------|-----------|
| IT-CF-005 | スキーマ検証エラー時にConfigValidationErrorを送出すること | load成功後にスキーマ検証がエラーを返す | `configRepository.load` → validDoc, `schemaValidator.validate` → `[HarnessError]` | `ConfigValidationError`（errorCode: `L1-001`） |
| IT-CF-006 | 設定ファイル未存在時にConfigNotFoundErrorを送出すること | loadが例外を送出する | `configRepository.load` → `ConfigNotFoundError` をthrow | `ConfigNotFoundError` |
| IT-CF-007 | 不正なpreset値でInvalidPresetErrorを送出すること | スキーマ検証OK後、preset値が不正 | `configRepository.load` → `{ project: { preset: "unknown" } }`, `schemaValidator.validate` → `[]` | `InvalidPresetError`（errorCode: `L1-002`） |
| IT-CF-008 | Preset解決時のdeep mergeで構造不整合が発生した場合にConfigMergeErrorを送出すること | presetDefinitionが壊れている | `configRepository.load` → validDoc, `schemaValidator.validate` → `[]`, presetDefinitions中に不正構造 | `ConfigMergeError`（errorCode: `L1-008`） |

### 3.2 ValidateConfigUseCase

**コンストラクタ依存（モック対象）**:
- `ConfigSchemaValidatorPort`（モック）
- `PresetResolutionService`（実体）
- `presetDefinitions`（実定数）

#### 正常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待結果 |
|----------|-------------|---------|-----------------|---------|
| IT-CF-009 | 有効なドキュメントで valid: true を返すこと | スキーマ検証OK + Preset解決成功 | `schemaValidator.validate` → `[]` | `{ valid: true, errors: [] }` |
| IT-CF-010 | Preset解決を含む完全な検証が成功すること | standard Presetドキュメントを検証 | `schemaValidator.validate` → `[]` | `valid: true` |

#### 異常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待エラー |
|----------|-------------|---------|-----------------|-----------|
| IT-CF-011 | スキーマエラーをValidateConfigResult.errorsに詰めて返すこと | スキーマ検証がエラーを返す | `schemaValidator.validate` → `[error1, error2]` | `{ valid: false, errors: [error1, error2] }` |
| IT-CF-012 | Preset解決失敗時にHarnessErrorに変換してerrorsに含めること | スキーマ検証OK、Preset解決で例外 | `schemaValidator.validate` → `[]`, 不正preset値のdocument | `{ valid: false, errors: [...] }` にPreset関連エラーが含まれる |
| IT-CF-013 | deep merge失敗時にerrorsに変換して返すこと | スキーマ検証OK、merge中に構造不整合 | `schemaValidator.validate` → `[]`, 不正構造のdocument | `{ valid: false, errors: [...] }` にmergeエラーが含まれる |
| IT-CF-014 | 例外を送出せず常に結果DTOで返すこと | 各種エラーパターン | 上記異常系の各モック設定 | throwされずに `ValidateConfigResult` が返る |

### 3.3 EnableFeatureUseCase

**コンストラクタ依存（モック対象）**:
- `ConfigRepositoryPort`（モック）
- `ConfigSchemaValidatorPort`（モック）
- `FeatureRegistryPort`（モック）
- `PresetResolutionService`（実体）
- `FeatureRegistry`（実体）
- `presetDefinitions`（実定数）

#### 正常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待結果 |
|----------|-------------|---------|-----------------|---------|
| IT-CF-015 | 利用可能なboolean機能を有効化して保存できること | agentLessonCollectionをenable | `configRepository.load` → agentLessonCollection: false のdoc, `schemaValidator.validate` → `[]`（2回呼ばれる）, `featureRegistryPort.listAvailable` → 4機能, `configRepository.save` → void | `FeatureToggleResult` に `feature: "agentLessonCollection"`, `enabled: true`, `configPath` が含まれる |
| IT-CF-016 | bundleSizeLimitが0のとき有効化でデフォルト値500に更新されること | bundleSizeLimit=0をenable | `configRepository.load` → bundleSizeLimit: 0 のdoc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能, `configRepository.save` → void | saveに渡されるdocumentの `harnesses.bundleSizeLimit` が `500` である |
| IT-CF-017 | 保存前にsourceDocumentの再検証が行われること | enable成功パス | 上記正常系設定 | `schemaValidator.validate` が2回呼ばれる（初回読込時 + 保存前再検証時） |
| IT-CF-018 | configRepository.saveにtoSourceDocument()の結果が渡されること | enable成功パス | 上記正常系設定 | `configRepository.save` が `path` と `sourceDocument` で呼ばれる |

#### 異常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待エラー |
|----------|-------------|---------|-----------------|-----------|
| IT-CF-019 | 未知機能名でUnsupportedFeatureErrorを送出すること | 存在しないfeature名を指定 | `configRepository.load` → validDoc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能 | `UnsupportedFeatureError`（errorCode: `L1-004`）。利用可能一覧が含まれる |
| IT-CF-020 | 保存前の再検証で不整合を検出した場合は保存しないこと | enable後の再検証がエラーを返す | `configRepository.load` → validDoc, `schemaValidator.validate` → 1回目: `[]`, 2回目: `[error]`, `featureRegistryPort.listAvailable` → 4機能 | `ConfigValidationError` が送出され、`configRepository.save` が呼ばれない |
| IT-CF-021 | 保存失敗時にConfigPersistenceErrorを送出すること | save時にエラー | `configRepository.load` → validDoc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能, `configRepository.save` → throw | `ConfigPersistenceError` |
| IT-CF-022 | 設定ファイル読込失敗時にエラーを伝播すること | loadが失敗 | `configRepository.load` → throw `ConfigNotFoundError` | `ConfigNotFoundError` |

### 3.4 DisableFeatureUseCase

**コンストラクタ依存（モック対象）**: EnableFeatureUseCaseと同一

#### 正常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待結果 |
|----------|-------------|---------|-----------------|---------|
| IT-CF-023 | 有効なboolean機能を無効化して保存できること | deadCodeGCをdisable | `configRepository.load` → deadCodeGC: true のdoc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能, `configRepository.save` → void | `FeatureToggleResult` に `feature: "deadCodeGC"`, `enabled: false` が含まれる |
| IT-CF-024 | bundleSizeLimitを無効化すると値が0になること | bundleSizeLimit=500をdisable | `configRepository.load` → bundleSizeLimit: 500 のdoc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能, `configRepository.save` → void | saveに渡されるdocumentの `harnesses.bundleSizeLimit` が `0` である |
| IT-CF-025 | 無効化後にsourceDocumentの再検証が行われること | disable成功パス | 上記正常系設定 | `schemaValidator.validate` が2回呼ばれる |
| IT-CF-026 | 無効化結果のDTOにconfigPathが含まれること | disable成功パス | 上記正常系設定 | `FeatureToggleResult.configPath` がloadで返されたpathと一致する |

#### 異常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待エラー |
|----------|-------------|---------|-----------------|-----------|
| IT-CF-027 | 未知機能名でUnsupportedFeatureErrorを送出すること | 存在しないfeature名を指定 | `configRepository.load` → validDoc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能 | `UnsupportedFeatureError`（errorCode: `L1-004`） |
| IT-CF-028 | 保存前の再検証で不整合を検出した場合は保存しないこと | disable後の再検証がエラーを返す | `schemaValidator.validate` → 1回目: `[]`, 2回目: `[error]` | `ConfigValidationError` が送出され、`configRepository.save` が呼ばれない |
| IT-CF-029 | 保存失敗時にConfigPersistenceErrorを送出すること | save時にエラー | `configRepository.save` → throw | `ConfigPersistenceError` |

### 3.5 ListAvailableFeaturesUseCase

**コンストラクタ依存（モック対象）**:
- `ConfigRepositoryPort`（モック）
- `ConfigSchemaValidatorPort`（モック）
- `FeatureRegistryPort`（モック）
- `PresetResolutionService`（実体）
- `FeatureRegistry`（実体）
- `presetDefinitions`（実定数）

#### 正常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待結果 |
|----------|-------------|---------|-----------------|---------|
| IT-CF-030 | 全機能の一覧と現在のenabled状態を返すこと | 4機能すべてについてenabled状態を取得 | `configRepository.load` → strict Preset doc（一部機能有効）, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → `["agentLessonCollection", "cascadeUpdate", "bundleSizeLimit", "deadCodeGC"]` | `AvailableFeatureItem[]` が4件。各 `name` と `enabled` がPreset解決結果と一致 |
| IT-CF-031 | minimal Presetで全機能がdisabledで返ること | minimal Preset doc | `configRepository.load` → minimal doc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能 | 全AvailableFeatureItemの `enabled` が `false` |
| IT-CF-032 | strict Presetで一部機能がenabledで返ること | strict Preset doc | `configRepository.load` → strict doc, `schemaValidator.validate` → `[]`, `featureRegistryPort.listAvailable` → 4機能 | `agentLessonCollection: true`, `bundleSizeLimit: true`（500 > 0）, `deadCodeGC: true`, `cascadeUpdate: false` |

#### 異常系

| ケースID | テストケース名 | シナリオ | モック/スタブ設定 | 期待エラー |
|----------|-------------|---------|-----------------|-----------|
| IT-CF-033 | 設定読込失敗時にConfigValidationErrorを送出すること | スキーマ検証がエラーを返す | `configRepository.load` → validDoc, `schemaValidator.validate` → `[error]` | `ConfigValidationError` |
| IT-CF-034 | 設定ファイル未存在時にエラーを伝播すること | loadが失敗 | `configRepository.load` → throw `ConfigNotFoundError` | `ConfigNotFoundError` |

---

## 4. Infrastructureテストケース

### 4.1 FileSystemConfigRepository

**テスト環境**: `fs.mkdtempSync()` でテンポラリディレクトリを作成。各テスト後にクリーンアップ。

#### load

| ケースID | テストケース名 | 操作 | 入力/事前条件 | 期待結果 |
|----------|-------------|------|-------------|---------|
| IT-CF-035 | configPath指定時に対象ファイルを読み込んでdocumentを返すこと | `load(configPath)` | tmpDir内にphasegate.config.jsonを配置 | `{ path: absolutePath, document: parsedJSON }` |
| IT-CF-036 | configPath未指定時に親ディレクトリを探索して設定ファイルを発見すること | `load()` | tmpDir/sub/sub2/ をcwdとし、tmpDir直下にphasegate.config.jsonを配置 | `path` がtmpDir直下のphasegate.config.jsonの絶対パス |
| IT-CF-037 | 返されるpathが絶対パスであること | `load(configPath)` | tmpDir内にphasegate.config.jsonを配置 | `path` が `/` で始まる絶対パス |
| IT-CF-038 | 設定ファイルが存在しない場合にConfigNotFoundErrorを送出すること | `load("/nonexistent/path")` | ファイルなし | `ConfigNotFoundError` |
| IT-CF-039 | 不正なJSONの場合にConfigPersistenceErrorを送出すること | `load(configPath)` | 壊れたJSONを書き込んだファイル | `ConfigPersistenceError` |

#### save

| ケースID | テストケース名 | 操作 | 入力/事前条件 | 期待結果 |
|----------|-------------|------|-------------|---------|
| IT-CF-040 | 2スペースインデントJSON + 改行付きで保存すること | `save(path, document)` | 有効なdocument | ファイル内容が `JSON.stringify(document, null, 2) + "\n"` と一致 |
| IT-CF-041 | 既存ファイルを上書き保存できること | `save(existingPath, newDocument)` | 既存ファイルあり | ファイル内容がnewDocumentに更新される |
| IT-CF-042 | 書込み失敗時にConfigPersistenceErrorを送出すること | `save(readonlyPath, document)` | 書込み権限のないパス | `ConfigPersistenceError` |

### 4.2 AjvConfigSchemaValidator

**テスト環境**: 実際の `harness-config-v2.schema.json` を読み込み、実AJVインスタンスで検証する。

| ケースID | テストケース名 | 操作 | 入力/事前条件 | 期待結果 |
|----------|-------------|------|-------------|---------|
| IT-CF-043 | 有効なv2ドキュメントでエラーなしを返すこと | `validate(validDocument)` | 全必須フィールドを含む有効ドキュメント | `[]`（空配列） |
| IT-CF-044 | 必須項目欠落をHarnessError配列に変換すること | `validate(documentMissingProject)` | `project` セクションを欠くドキュメント | `HarnessError[]` に必須項目エラーが含まれる |
| IT-CF-045 | harnesses.bundleSizeLimitの負値を拒否すること | `validate(documentWithNegativeLimit)` | `harnesses.bundleSizeLimit: -1` | `HarnessError[]` にminimumエラーが含まれる |
| IT-CF-046 | project.presetの不正値を拒否すること | `validate(documentWithBadPreset)` | `project.preset: "invalid"` | `HarnessError[]` にenum不正エラーが含まれる |
| IT-CF-047 | 未知キー混入を拒否すること | `validate(documentWithExtraKey)` | トップレベルに `unknown: true` を追加 | `HarnessError[]` にadditionalPropertiesエラーが含まれる |
| IT-CF-048 | AJV ErrorObjectがDomain/Applicationに漏れないこと | `validate(invalidDocument)` | 任意の不正ドキュメント | 返却配列の各要素が `HarnessError` 型であり、AJVの `ErrorObject` プロパティを含まない |
| IT-CF-049 | planningMode.defaultの不正値を拒否すること | `validate(documentWithBadPlanningMode)` | `planningMode.default: "unknown"` | `HarnessError[]` にenum不正エラーが含まれる |
| IT-CF-050 | 複数エラーを一括で返すこと | `validate(documentWithMultipleErrors)` | 複数の不正フィールドを含むドキュメント | `HarnessError[]` のlengthが2以上 |

### 4.3 StaticFeatureRegistryAdapter

| ケースID | テストケース名 | 操作 | 入力/事前条件 | 期待結果 |
|----------|-------------|------|-------------|---------|
| IT-CF-051 | Wave 1対象4機能を返すこと | `listAvailable()` | なし | `["agentLessonCollection", "cascadeUpdate", "bundleSizeLimit", "deadCodeGC"]` を含む |
| IT-CF-052 | 固定順で返すこと | `listAvailable()` を2回呼ぶ | なし | 2回の結果が同一の順序である |
| IT-CF-053 | readonly配列であること | `listAvailable()` | なし | 返却値の変更を試みても元配列が変化しない |

### 4.4 PresetDefinitionStore

**テスト環境**: 実際の `infrastructure/presets/*.json` を読み込む。

| ケースID | テストケース名 | 操作 | 入力/事前条件 | 期待結果 |
|----------|-------------|------|-------------|---------|
| IT-CF-054 | minimal/standard/strictの全Preset定義を読み込めること | Storeから全Preset取得 | 実Preset JSONファイル | 3つのPresetキーがすべて存在する |
| IT-CF-055 | 各Presetが必要セクションを含むこと | 各Preset定義のキーを検証 | 実Preset JSONファイル | `layers`, `quickMode`, `harnesses`, `paths`, `reporting` セクションが各Presetに存在する |
| IT-CF-056 | minimal PresetでL3/L4がdisabledであること | minimal定義を検証 | 実Preset JSONファイル | `layers.L3.enabled === false`, `layers.L4.enabled === false` |
| IT-CF-057 | strict PresetでcoverageThresholdが95であること | strict定義を検証 | 実Preset JSONファイル | `layers.L3.coverageThreshold === 95` |
| IT-CF-058 | strict Presetでagent関連機能がenabledであること | strict定義のharnesses検証 | 実Preset JSONファイル | `harnesses.agentLessonCollection === true`, `harnesses.deadCodeGC === true`, `harnesses.bundleSizeLimit === 500` |

---

## 5. Presentationテストケース

### テスト方針

- Handlerの `execute` メソッドを関数引数として呼び出す（`process.argv` のモックではなく、引数を直接渡す）
- UseCaseはスタブで差し替え、成功/失敗の各パターンを制御する
- `console.log` / `console.error` をスパイし、出力内容を検証する
- `process.exit` をスタブし、終了コードを検証する（実際にプロセスを終了しない）

### 5.1 EnableFeatureCommandHandler

| ケースID | テストケース名 | 引数 | 期待出力/終了コード |
|----------|-------------|------|-------------------|
| IT-CF-059 | 引数なしでUsage表示を出力すること | `[]`（引数なし） | Usage説明テキストが `console.log` に出力される |
| IT-CF-060 | --listで利用可能機能一覧を表示しexit 0を返すこと | `["--list"]` | `Available features:` + 各機能行が出力、exit 0 |
| IT-CF-061 | --list表示時に各機能のenabled/disabledステータスが正しく表示されること | `["--list"]` | 各行に `[enabled]` または `[disabled]` が含まれる |
| IT-CF-062 | 有効な機能名で成功メッセージと更新パスを表示しexit 0を返すこと | `["agentLessonCollection"]` | `Enabled feature: agentLessonCollection` + `Updated: /path/to/phasegate.config.json` が出力、exit 0 |
| IT-CF-063 | 未知機能名で利用可能一覧を表示しexit 1を返すこと | `["unknownFeature"]` | `Unknown feature: unknownFeature` + 利用可能一覧が出力、exit 1 |
| IT-CF-064 | EnableFeatureUseCaseの実行エラー時にexit 2を返すこと | `["agentLessonCollection"]` | エラーメッセージが `console.error` に出力、exit 2 |
| IT-CF-065 | UnsupportedFeatureError時に利用可能一覧を表示すること | `["invalidName"]` | `Available features:` に4機能名が含まれる |
| IT-CF-066 | ConfigPersistenceError時にexit 2を返すこと | `["agentLessonCollection"]` | exit 2 |

### 5.2 DisableFeatureCommandHandler

| ケースID | テストケース名 | 引数 | 期待出力/終了コード |
|----------|-------------|------|-------------------|
| IT-CF-067 | --listで機能一覧を表示しexit 0を返すこと | `["--list"]` | `Available features:` + 各機能行が出力、exit 0 |
| IT-CF-068 | 有効な機能名で無効化メッセージを表示しexit 0を返すこと | `["deadCodeGC"]` | `Disabled feature: deadCodeGC` + `Updated: /path/to/phasegate.config.json` が出力、exit 0 |
| IT-CF-069 | 未知機能名でexit 1を返すこと | `["unknownFeature"]` | `Unknown feature: unknownFeature` + 利用可能一覧が出力、exit 1 |
| IT-CF-070 | 実行エラー時にexit 2を返すこと | `["deadCodeGC"]` | エラーメッセージが `console.error` に出力、exit 2 |
| IT-CF-071 | 引数なしでUsage表示を出力すること | `[]`（引数なし） | Usage説明テキストが出力される |
| IT-CF-072 | ConfigPersistenceError時にexit 2を返すこと | `["deadCodeGC"]` | exit 2 |

### 5.3 ListAvailableFeaturesCommandHandler

| ケースID | テストケース名 | 引数 | 期待出力/終了コード |
|----------|-------------|------|-------------------|
| IT-CF-073 | Available features見出しが表示されること | なし | `Available features:` が `console.log` に出力される |
| IT-CF-074 | 各機能のenabled/disabledステータスが正しく表示されること | なし | 各行に機能名と `[enabled]` または `[disabled]` が含まれる |
| IT-CF-075 | 実行成功時にexit 0を返すこと | なし | exit 0 |
| IT-CF-076 | 実行エラー時にexit 2を返すこと | なし（UseCase失敗） | エラーメッセージが `console.error` に出力、exit 2 |

---

## 6. Facadeテストケース (load-config)

> QA Q1回答に基づき、load-config Facadeは実ファイル（テンポラリディレクトリに有効なphasegate.config.jsonを配置）を用いた統合テストとする。テストケース数は最小限の3ケースに限定する。

**テスト環境**: `fs.mkdtempSync()` でテンポラリディレクトリを作成し、実際のphasegate.config.jsonを配置する。実Infrastructure（FileSystemConfigRepository, AjvConfigSchemaValidator, PresetDefinitionStore）を使用する。

| ケースID | テストケース名 | シナリオ | 入力/事前条件 | 期待結果 |
|----------|-------------|---------|-------------|---------|
| IT-CF-077 | 有効な設定ファイルからHarnessConfigV2を返すこと | tmpDirに有効なphasegate.config.jsonを配置し、`loadConfig(path)` を呼ぶ | 全必須セクションを含む有効なv2 JSON | `HarnessConfigV2` が返り、`project.name` と `project.preset` が入力と一致する |
| IT-CF-078 | 設定ファイル未存在時にエラーを送出すること | 存在しないパスを指定して `loadConfig(path)` を呼ぶ | ファイルなし | `ConfigNotFoundError` が送出される |
| IT-CF-079 | スキーマ不正時にConfigValidationErrorを送出すること | tmpDirにスキーマ不正のJSONを配置し、`loadConfig(path)` を呼ぶ | `project` セクションが欠けたJSON | `ConfigValidationError` が送出される |

---

## 7. テスト環境設定

### モック/スタブ方針

| テスト対象層 | ドメインオブジェクト | Port | 外部I/O |
|------------|-------------------|------|---------|
| Application層（UseCase） | 実体（モック禁止） | モック可 | なし |
| Infrastructure層 | なし | 実装本体 | 実ファイル / 実AJV |
| Presentation層 | なし | UseCaseスタブ | console/exitスタブ |
| Facade（load-config） | 実体 | 実体 | 実ファイル / 実AJV |

### fixture設計

#### Application層テスト用fixture

- **validSourceDocument**: 全必須セクションを含む有効なHarnessConfigSourceDocument。ファクトリヘルパーで生成し、スキーマ変更時の修正箇所を局所化する
- **validResolvedDocument**: Preset解決済みのHarnessConfigResolvedDocument
- **presetDefinitions**: 実際のminimal/standard/strict Preset定義を読み込んで使用する

#### Application層モック用ヘルパー

- **createMockConfigRepository()**: `load` / `save` をvi.fn()で生成する `ConfigRepositoryPort` モック
- **createMockSchemaValidator()**: `validate` をvi.fn()で生成する `ConfigSchemaValidatorPort` モック
- **createMockFeatureRegistry()**: `listAvailable` をvi.fn()で生成する `FeatureRegistryPort` モック

#### Infrastructure層テスト用fixture

- **テンポラリディレクトリ**: `fs.mkdtempSync(path.join(os.tmpdir(), 'cf-test-'))` で作成。`afterEach` でクリーンアップ
- **validConfigJson**: ファクトリヘルパーで有効なphasegate.config.json文字列を生成
- **invalidConfigJson**: 各バリデーションエラーパターンに対応する不正JSON

#### Presentation層テスト用ヘルパー

- **UseCaseスタブ**: 各UseCaseの成功/失敗パターンをvi.fn()で制御
- **consoleスパイ**: `vi.spyOn(console, 'log')` / `vi.spyOn(console, 'error')`。`afterEach` でリストア
- **exitスタブ**: `vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })` 等でexit呼び出しを捕捉。`afterEach` でリストア

### テストフレームワーク

- Vitest 3.0.0
- `target` / `describe` / `context` / `it` ヘルパー（既存テストヘルパーから利用）

### テストケース総数

| 分類 | ケース数 |
|------|---------|
| Application層（UseCase 5種） | 34 |
| Infrastructure層（4コンポーネント） | 24 |
| Presentation層（3ハンドラ） | 18 |
| Facade（load-config） | 3 |
| **合計** | **79** |
