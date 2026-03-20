# ITテスト設計計画: config-foundation

> **作成日**: 2026-03-13
> **対応ストーリー**: H04-01, H04-02, H04-03
> **正規ソース**: `docs/product/construction/config-foundation/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. スコープ

- **対象Unit**: config-foundation
- **対象レイヤー**: application層、infrastructure層、presentation層
- **対象外**: domain層（ユニットテスト設計計画で扱う）

### テスト対象コンポーネント一覧

| 層 | 分類 | コンポーネント |
|----|------|-------------|
| application | UseCase | LoadResolvedConfigUseCase |
| application | UseCase | ValidateConfigUseCase |
| application | UseCase | EnableFeatureUseCase |
| application | UseCase | DisableFeatureUseCase |
| application | UseCase | ListAvailableFeaturesUseCase |
| application | Facade | load-config |
| infrastructure | Repository | FileSystemConfigRepository |
| infrastructure | Validator | AjvConfigSchemaValidator |
| infrastructure | Registry | StaticFeatureRegistryAdapter |
| infrastructure | Store | PresetDefinitionStore |
| presentation | CLI Handler | EnableFeatureCommandHandler |
| presentation | CLI Handler | DisableFeatureCommandHandler |
| presentation | CLI Handler | ListAvailableFeaturesCommandHandler |

### テスト対象外コンポーネント

| コンポーネント | ファイル | 除外理由 |
|-------------|---------|---------|
| 互換CLIエントリーポイント | `scripts/harness/cli/enable.ts` | Presentation層ハンドラへ委譲するだけの薄いラッパーであり、独自ロジックを持たない（`logical_design.md` §6.4） |
| 互換CLIエントリーポイント | `scripts/harness/cli/disable.ts` | 同上 |
| 互換ファサード | `scripts/harness/core/config-loader.ts` | `application/facades/load-config.ts` を呼ぶだけの薄いラッパーであり、独自ロジックを持たない（`logical_design.md` §1.3補足） |
| CompositeFeatureRegistryAdapter | `infrastructure/registries/composite-feature-registry-adapter.ts` | Wave 1では未使用（`logical_design.md` §5.4）。YAGNI原則に基づきWave 1テスト設計スコープ外 |

---

## 2. テスト対象分析

### Application層（UseCase）

| UseCase名 | コンストラクタ依存数 | テストケース概算 |
|-----------|------------------|---------------|
| LoadResolvedConfigUseCase | Port 2 + ドメインサービス 1 + 定数 1（ConfigRepositoryPort, ConfigSchemaValidatorPort / PresetResolutionService / presetDefinitions） | 8 |
| ValidateConfigUseCase | Port 1 + ドメインサービス 1 + 定数 1（ConfigSchemaValidatorPort / PresetResolutionService / presetDefinitions） | 6 |
| EnableFeatureUseCase | Port 3 + ドメインサービス 2 + 定数 1（ConfigRepositoryPort, ConfigSchemaValidatorPort, FeatureRegistryPort / PresetResolutionService, FeatureRegistry / presetDefinitions） | 10 |
| DisableFeatureUseCase | Port 3 + ドメインサービス 2 + 定数 1（同上） | 8 |
| ListAvailableFeaturesUseCase | Port 3 + ドメインサービス 2 + 定数 1（ConfigRepositoryPort, ConfigSchemaValidatorPort, FeatureRegistryPort / PresetResolutionService, FeatureRegistry / presetDefinitions） | 5 |
| load-config Facade | 0（composition root） | 3 |

LoadResolvedConfigUseCaseの主要テスト観点:

- 有効なraw documentからHarnessConfigV2 DTOを返すこと
- スキーマエラー時にConfigValidationErrorを送出すること
- 設定ファイル未存在時にConfigNotFoundErrorを送出すること
- Preset解決が正しく適用されること

EnableFeatureUseCaseの主要テスト観点:

- 利用可能な機能を有効化して保存できること
- 未知機能でUnsupportedFeatureErrorを送出すること
- 保存前の再検証で不整合を検出した場合は保存しないこと
- 保存失敗時にConfigPersistenceErrorを送出すること

DisableFeatureUseCaseの主要テスト観点:

- 有効な機能を無効化して保存できること
- 未知機能でUnsupportedFeatureErrorを送出すること
- sourceDocumentの再検証が行われること

ListAvailableFeaturesUseCaseの主要テスト観点:

- 全機能の一覧と現在のenabled状態を返すこと
- 設定読込失敗時にConfigValidationErrorを送出すること

### Infrastructure層（Adapter/Repository）

| Adapter名 | 操作数 | テストケース概算 |
|-----------|-------|---------------|
| FileSystemConfigRepository | 2（load, save） | 10 |
| AjvConfigSchemaValidator | 1（validate） | 8 |
| StaticFeatureRegistryAdapter | 1（listAvailable） | 3 |
| PresetDefinitionStore | 1（全Preset読込） | 5 |

FileSystemConfigRepositoryの主要テスト観点:

- `load`: configPath指定時のファイル読込、未指定時の親ディレクトリ探索、ファイル未存在時のエラー、不正JSONのConfigPersistenceError変換
- `save`: 2スペースJSON + 改行付きで保存、既存ファイルの上書き、書込み失敗時のエラー

AjvConfigSchemaValidatorの主要テスト観点:

- 有効なv2ドキュメントでエラーなしを返すこと
- 必須項目欠落をHarnessError配列に変換すること
- `harnesses.bundleSizeLimit < 0` を拒否すること
- `project.preset` の不正値を拒否すること
- 未知キー混入を拒否すること
- AJV ErrorObjectがDomain/Applicationに漏れないこと

StaticFeatureRegistryAdapterの主要テスト観点:

- Wave 1対象4機能（agentLessonCollection, cascadeUpdate, bundleSizeLimit, deadCodeGC）を返すこと
- 固定順で返すこと
- readonly配列であること

PresetDefinitionStoreの主要テスト観点:

- minimal/standard/strictの全Preset定義を読み込めること
- 各Presetが必要セクションを含むこと
- Preset間の差分が想定どおりであること（L3/L4のenabled、coverageThreshold等）

### Presentation層（CLI/Controller）

| コマンド/エンドポイント | メソッド | テストケース概算 |
|---------------------|--------|---------------|
| EnableFeatureCommandHandler | execute | 8 |
| DisableFeatureCommandHandler | execute | 6 |
| ListAvailableFeaturesCommandHandler | execute | 4 |

EnableFeatureCommandHandlerの主要テスト観点:

- 引数なしでUsage表示すること
- `--list` でListAvailableFeaturesUseCaseを呼び一覧表示し、exit 0を返すこと
- 有効な機能名で成功メッセージと更新パスを表示し、exit 0を返すこと
- 未知機能名で利用可能一覧を表示し、exit 1を返すこと
- 実行エラー時にexit 2を返すこと

DisableFeatureCommandHandlerの主要テスト観点:

- `--list` で一覧表示し、exit 0を返すこと
- 有効な機能名で無効化メッセージを表示し、exit 0を返すこと
- 未知機能名でexit 1を返すこと
- 実行エラー時にexit 2を返すこと

ListAvailableFeaturesCommandHandlerの主要テスト観点:

- `Available features:` 見出しが表示されること
- 各機能のenabled/disabledステータスが正しく表示されること
- 実行エラー時にexit 2を返すこと

---

## 3. テスト方針

### テストダブル方針

| テスト対象 | ドメインオブジェクト | Port | 外部I/O |
|-----------|-------------------|------|---------|
| Application層テスト | 実体（モック禁止） | モック可 | なし |
| Infrastructure層テスト | なし | 実装本体 | 実ファイル / 実AJV |
| Presentation層テスト | なし | UseCaseスタブ | console/argvスタブ |

### Application層テスト方針

- **Port（外部依存）のみモック使用可**: ConfigRepositoryPort、ConfigSchemaValidatorPort、FeatureRegistryPortはモック/スタブで差し替える
- **ドメイン実体はモック禁止**: HarnessConfig集約、値オブジェクト、PresetResolutionService、FeatureRegistryは実オブジェクトを使用する
- UseCaseの調停責務（読込→検証→操作→保存の分岐）に焦点を当てる

### Infrastructure層テスト方針

- **ファイルシステム操作**: `fs.mkdtempSync()` でテンポラリディレクトリを作成し、テスト後にクリーンアップする
- **AJV検証**: 実際のharness-config-v2.schema.jsonを読み込み、実AJVインスタンスで検証する
- **Preset定義**: 実際のminimal.json / standard.json / strict.jsonを読み込む

### Presentation層テスト方針

- **UseCaseはスタブで差し替え**: 成功/失敗の各パターンを制御する
- **console出力**: `console.log` / `console.error` をスパイし、出力内容を検証する
- **終了コード**: `process.exit` をスタブし、終了コードを検証する（実際にプロセスを終了しない）
- **argv**: `process.argv` を差し替えて引数パターンを検証する

### テストコード構造

- **AAAパターン**: Arrange / Act / Assert を厳守する
- **実行結果の変数名**: `actual` に統一する
- **テストケース名**: 全て日本語で記述する
- **describe/it構造**: `target` / `describe` / `context` / `it` パターンに従う
- **ファイル名**: kebab-caseで統一する

### テストファイル構成（想定）

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

## 4. QA（不明点・確認事項）

### [Question] Q1: load-config Facadeのテスト方針

load-config FacadeはInfrastructureアダプターを組み立てるcomposition rootであり、内部でFileSystemConfigRepository、AjvConfigSchemaValidator、PresetDefinitionStore、LoadResolvedConfigUseCaseを直接生成する。テスト時にPortをモックに差し替える手段がないため、実ファイルを用いた統合寄りのテストになる。これをIT設計計画のスコープに含めてよいか。

**推奨案:** load-config Facadeは実ファイル（テンポラリディレクトリに有効なharness.config.jsonを配置）を用いた統合テストとして扱う。テストケース数は最小限（正常系1、ファイル未存在1、スキーマ不正1）に留める。

[Answer]
推奨案を採用する。load-config Facadeは実ファイル（テンポラリディレクトリに有効なharness.config.jsonを配置）を用いた統合テストとして扱う。テストケース数は最小限（正常系1、ファイル未存在1、スキーマ不正1）に留める。

### [Question] Q2: CompositeFeatureRegistryAdapterのテスト範囲

~~論理設計によると、CompositeFeatureRegistryAdapterはWave 1では未使用だが差し替え点として定義される。テスト対象に含めるべきか。~~

**回答**: YAGNI原則に基づき、Wave 1ではテスト設計スコープに含めない。`logical_design.md` §5.4で「Wave 1では未使用だが差し替え点として定義する」と記載されており、Wave 1で実装・利用されないコンポーネントのテスト設計は行わない。Wave 2でValidator ID Registry合流時にテスト設計を行う。

---

## 5. 前提条件・リスク

### 前提条件

- `logical_design.md` が確定版であること
- テストフレームワークはVitest 3.0.0を使用する
- `target` / `context` ヘルパーが既存のテストヘルパーから利用可能であること
- harness-config-v2.schema.jsonが実装済みであること（Infrastructure層テストの前提）
- Preset定義JSON（minimal.json / standard.json / strict.json）が実装済みであること
- HarnessError型（harness-error Unit所有）のShared Kernelインターフェースが確定していること

### リスク

| リスク | 影響 | 軽減策 |
|--------|------|--------|
| FileSystemConfigRepositoryの親ディレクトリ探索テストが環境依存になる可能性 | CI環境での不安定テスト | テンポラリディレクトリ内にネストした構造を作成し、探索対象を完全制御する |
| Presentation層テストでprocess.exit/process.argvのスタブが他テストに影響する可能性 | テスト間干渉 | 各テストケースのafterEachで確実にリストアする |
| AjvConfigSchemaValidatorのスキーマ変更時にテストが大量に壊れる可能性 | テスト保守コスト増 | テスト用の有効ドキュメントをファクトリヘルパーで生成し、変更箇所を局所化する |
| load-config FacadeがComposition Rootであるため、依存の差し替えが困難 | テスト設計の柔軟性低下 | 統合テストとして割り切り、テストケース数を最小限にする |

### テストケース総数概算

| 分類 | ケース数 |
|------|---------|
| Application層（UseCase 5種 + Facade 1種） | 40 |
| Infrastructure層（4コンポーネント） | 26 |
| Presentation層（3ハンドラ） | 18 |
| **合計** | **84** |
