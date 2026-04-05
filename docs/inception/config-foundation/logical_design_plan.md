# 論理設計計画: config-foundation

> **作成日**: 2026-03-13
> **モード**: Unit横断設計（Phase 1 計画）
> **対応ストーリー**: H04-01, H04-02, H04-03
> **前提ドキュメント**: `docs/product/construction/config-foundation/domain_model.md`, `docs/product/units/config_foundation_unit.md`, `docs/product/units/integration_contract.md`

---

## 1. スコープ

### 1.1 対象ストーリー

| Story ID | タイトル | この計画で扱う内容 |
|----------|---------|-------------------|
| H04-01 | phasegate.config.json v2スキーマ定義 | `HarnessConfigV2` の論理構造、JSONスキーマ検証、Shared Kernel公開境界 |
| H04-02 | Preset System定義と切替 | `minimal` / `standard` / `strict` の定義、Preset解決、個別上書き |
| H04-03 | GSD由来品質機能のデフォルト無効化 + phasegate:enable/disable機能切替 | デフォルト無効原則、機能一覧取得、CLIトグル操作 |

### 1.2 設計対象の層

| 層 | 対象 | 役割 |
|----|------|------|
| Domain | 対象 | `HarnessConfig` 集約、値オブジェクト、ドメインサービス、ポート定義 |
| Application | 対象 | 設定読込、検証、機能切替、機能一覧取得のユースケース |
| Infrastructure | 対象 | ファイルI/O、JSONスキーマ検証、Feature Registryアダプター |
| Presentation | 対象 | CLIコマンドハンドラ、引数解釈、終了コード・表示メッセージ |

### 1.3 対象外

- `phaseDependencies` / `planningMode` の意味論検証。config-foundationは構造のみを所有し、意味論は `phase-dependency-model` が所有する
- Validator ID Registryの正規定義。config-foundationは `FeatureRegistryPort` 経由で消費する
- v0の `orchestration` / `session` / `migrate-config`。これらはOrchestrationパッケージへ移管済み

---

## 2. 設計方針

### 2.1 アーキテクチャ層定義

v1の正規語彙 `domain` / `application` / `infrastructure` / `presentation` を使用する。`port` / `usecase` / `controller` は実装パターン名としてのみ用い、`@layer` には使用しない。

| 層 | 責務 | 依存先 |
|----|------|--------|
| Domain | 不変条件、Preset解決、Feature切替、Shared Kernel型、ポート定義 | なし |
| Application | ユースケース実行、ポート調停、DTO変換、トランザクション境界 | Domain |
| Infrastructure | `ConfigRepositoryPort` / `ConfigSchemaValidatorPort` / `FeatureRegistryPort` の実装 | Domain, Application |
| Presentation | CLI引数パース、UseCase呼び出し、表示形式と終了コードの決定 | Application, Domain |

依存方向は横断契約に従い、以下を厳守する。

```text
domain ← application ← infrastructure
domain ← application ← presentation
```

### 2.2 技術スタック

| 項目 | 採用方針 |
|------|---------|
| 言語 | TypeScript |
| 実行形態 | Node.js + `tsx` ベースのCLI |
| パッケージ管理 | pnpm |
| テスト | Vitest |
| スキーマ検証 | AJV系JSONスキーマバリデータ |
| 設定フォーマット | `phasegate.config.json`（2スペースJSON） |
| 共有契約 | `HarnessConfigV2`, Preset ID Registry, `HarnessError` |

補足方針:

- Preset解決は `PresetResolutionService` で実施し、deep mergeは RFC 7396 相当、配列は結合ではなく置換とする
- GSD由来の品質機能はデフォルトで `enabled: false` を維持する
- `HarnessConfigV2` は常にPreset解決済みDTOとして他Unitへ公開する。公開経路は `scripts/harness/shared-kernel/harness-config.ts` に一本化し、他Unitが `config-foundation/domain/` を直接参照することを禁止する

### 2.3 ディレクトリ構造方針

既存の `scripts/harness/` 配下を維持しつつ、config-foundationの内部構造を4層へ再編する。既存CLIエントリーポイントは薄いラッパーとして残し、内部実装を新構造へ委譲する。

```text
scripts/harness/
├── shared-kernel/
│   └── harness-config.ts          # HarnessConfigV2 の再エクスポート（他Unit公開面）
├── config-foundation/
│   ├── domain/
│   │   ├── harness-config.ts      # HarnessConfigV2 の正規実装
│   │   ├── value-objects/
│   │   ├── services/
│   │   └── ports/
│   ├── application/
│   │   ├── use-cases/
│   │   ├── dto/
│   │   └── facades/
│   ├── infrastructure/
│   │   ├── repositories/
│   │   ├── validators/
│   │   ├── registries/
│   │   ├── schemas/
│   │   └── presets/
│   └── presentation/
│       └── cli/
└── cli/
    ├── enable.ts
    └── disable.ts
```

構造ポリシー:

- Shared Kernel公開型は `scripts/harness/shared-kernel/harness-config.ts` に置き、他Unitはこのパス経由でのみ `HarnessConfigV2` を参照する。正規実装は `config-foundation/domain/harness-config.ts` 内に置き、`shared-kernel/harness-config.ts` は再エクスポートのみを行う。これは `harness-error`（`shared-kernel/harness-error.ts`）や `traceability-model`（`shared-kernel/story-id.ts`）と同じ公開方式への統一である
- CLIの公開コマンド名は `scripts/harness/cli/` に残し、内部ロジックは `presentation/cli/` へ寄せる
- `scripts/harness/core/config-loader.ts` は最終的に `application/facades/load-config.ts` を呼ぶ互換ファサードに寄せる

---

## 3. 層別設計の計画

### 3.1 Domain層

#### 集約・値オブジェクト設計の中心

- 集約は `HarnessConfig` の単一集約とし、`phasegate.config.json` 全体の整合性境界を担う
- 値オブジェクトは `ProjectConfig`, `Preset`, `LayersConfig`, `L1Config` - `L4Config`, `QuickModeConfig`, `PhaseDependenciesConfig`, `PlanningModeConfig`, `HarnessesConfig`, `FeatureToggle`, `FeatureName`, `PathsConfig`, `ReportingConfig` を軸に整理する
- `phaseDependencies` / `planningMode` は構造のみを保持し、意味論を持ち込まない

#### 型シグネチャ方針

| 対象 | 方針 |
|------|------|
| 集約生成 | `HarnessConfig.reconstitute(props: HarnessConfigProps): HarnessConfig` を基本形とし、生成時に不変条件を検証する |
| 集約コマンド | `enableFeature(name: FeatureName): void`, `disableFeature(name: FeatureName): void` のように、入力は値オブジェクトで受ける |
| 集約クエリ | `getLayerConfig(layer: LayerId): LayerConfig`, `isFeatureEnabled(name: FeatureName): boolean` のように読み取り専用で返す |
| 値オブジェクト | `static create(raw): ValueObject` もしくはprivate constructor + factoryで不正値を閉じ込め、`equals()` を持つ |
| ドメインサービス | statelessを原則とし、`PresetResolutionService.resolve(...)`, `FeatureRegistry.listAvailable(...)` のように副作用を持たないシグネチャにする |
| DTO変換 | Domain層から外へ出すときだけ `toResolvedConfig(): HarnessConfigV2` 相当の変換を行う |

#### ドメインサービス計画

| サービス | 主責務 | シグネチャ方針 |
|---------|--------|---------------|
| `PresetResolutionService` | preset展開、個別上書き、deep merge、配列置換 | `resolve(baseDocument, presetDefinition): HarnessConfigProps` |
| `FeatureRegistry` | 有効化可能な機能名の正規化、`FeatureName` 化、未知機能検出 | `listAvailable(source: FeatureRegistryPort): readonly FeatureName[]` |

### 3.2 Application層

Application層は「集約の取得・操作・永続化の調整役」に限定し、ビジネスルールはDomain層に閉じ込める。

| ユースケース | 対応ストーリー | 責務 |
|-------------|-------------|------|
| `LoadResolvedConfigUseCase` | H04-01, H04-02 | 設定読込、スキーマ検証、Preset解決、`HarnessConfigV2` DTO返却。全Unit向け `config-loader` の中核 |
| `ValidateConfigUseCase` | H04-01 | 設定ファイルまたはサンプル設定の妥当性確認。CLIやテストフィクスチャ検証で再利用 |
| `EnableFeatureUseCase` | H04-03 | 対象機能の存在確認、`HarnessConfig.enableFeature()` 実行、保存 |
| `DisableFeatureUseCase` | H04-03 | 対象機能の存在確認、`HarnessConfig.disableFeature()` 実行、保存 |
| `ListAvailableFeaturesUseCase` | H04-03 | `phasegate:enable --list` / `phasegate:disable --list` 用の機能一覧返却 |

補足方針:

- Preset切替専用のUseCaseは作らない。`project.preset` の変更を `LoadResolvedConfigUseCase` が解決する形でH04-02を満たす
- Application層の戻り値は `HarnessConfigV2` またはCLI用の薄いResult DTOに限定し、集約そのものをPresentationへ渡さない

### 3.3 Infrastructure層

| アダプター | 実装対象 | 技術選定 |
|-----------|---------|---------|
| `FileSystemConfigRepository` | `ConfigRepositoryPort` | `node:fs/promises` による `phasegate.config.json` 読込・保存 |
| `AjvConfigSchemaValidator` | `ConfigSchemaValidatorPort` | AJV系バリデータで `harness-config-v2.schema.json` を検証 |
| `StaticFeatureRegistryAdapter` | `FeatureRegistryPort` | Wave 1では `harnesses` セクションキーを起点に機能一覧を返す |
| `CompositeFeatureRegistryAdapter` | `FeatureRegistryPort` の発展形 | Wave 2以降に Validator ID Registry との合流を許容する差し替え点 |
| `PresetDefinitionStore` | Domainサービス向けデータ供給 | `minimal.json` / `standard.json` / `strict.json` などの静的定義を管理 |

技術選定ポリシー:

- JSONスキーマはInfrastructure資産として保持し、Domain層にAJV依存を持ち込まない
- Preset定義は静的データとして管理し、他Unitが参照しやすい公開面を残す
- Feature RegistryはWave 1時点で差し替え可能なAdapterとして設計し、config-foundationが他Unitの所有権を侵食しないようにする

### 3.4 Presentation層

CLIは既存のコマンド名を維持しつつ、Presentation層に責務を集約する。

| コマンド | コマンドハンドラ | 責務 |
|---------|----------------|------|
| `phasegate:enable <feature>` | `EnableFeatureCommandHandler` | 引数解釈、`--list` 判定、UseCase呼び出し、成功/失敗メッセージ、終了コード0/1/2の割当 |
| `phasegate:disable <feature>` | `DisableFeatureCommandHandler` | 引数解釈、`--list` 判定、UseCase呼び出し、成功/失敗メッセージ、終了コード0/1/2の割当 |
| `phasegate:enable --list` / `phasegate:disable --list` | `ListAvailableFeaturesCommandHandler` | 有効化可能な機能一覧の表示、未知機能エラー時の候補再表示 |

Presentation方針:

- CLIハンドラは入力解釈と表示に専念し、設定更新ロジックを持たない
- 未知機能エラーは `HarnessError` と利用可能一覧を組み合わせて表示する
- 既存の `scripts/harness/cli/*.ts` は `presentation/cli/*` の薄い起動スクリプトとして保つ

---

## 4. ポートインターフェース一覧（Domain層内に定義）

| ポート | 主メソッド | 用途 |
|--------|-----------|------|
| `ConfigRepositoryPort` | `load(configPath?: string): Promise<unknown>`, `save(configPath: string, document: unknown): Promise<void>` | `phasegate.config.json` の読込・保存 |
| `ConfigSchemaValidatorPort` | `validate(document: unknown): readonly HarnessError[]` | v2 JSONスキーマ適合性検証 |
| `FeatureRegistryPort` | `listAvailable(): readonly string[]` | `phasegate:enable/disable` で扱える機能名一覧の供給 |

ポート定義ポリシー:

- ポートはすべてDomain層に置き、実装はInfrastructure層に限定する
- ポートの戻り値はDomainが理解できる最小限の型に留める。Infrastructure固有型やAJVの詳細型は漏らさない
- `FeatureRegistryPort` はWave 1の静的一覧とWave 2の複合一覧を両方受け止められるよう、単純な一覧契約に固定する

---

## 5. テスト方針

| 層 | 方針 |
|----|------|
| Domain | モック禁止。集約・値オブジェクト・`PresetResolutionService` は実オブジェクトで検証し、必要ならin-memory fakeを使う |
| Application | ポートモック可。UseCaseの責務は「調停」に絞り、`ConfigRepositoryPort` / `ConfigSchemaValidatorPort` / `FeatureRegistryPort` のスタブ・モックで分岐を検証する |
| Infrastructure | 実ファイル・実スキーマ寄りの統合テストを優先し、テンポラリディレクトリでI/Oを検証する |
| Presentation | CLI引数と終了コードのテストを行い、UseCaseはスタブで差し替える |

全層共通ルール:

- AAAパターンを厳守する
- 実行結果は `actual` に代入する
- テストケース名は日本語で記述する
- Domain層ではドメインモデルをモックせず、仕様をそのままテストで表現する
- Presetの上書き、配列置換、デフォルト無効、未知機能エラーは回帰観点として必須にする

---

## 6. 見積もり

| 項目 | 見積もり | 根拠 |
|------|---------|------|
| 本番コードファイル数 | 24-30 | 集約1、値オブジェクト群、ドメインサービス2、ポート3、UseCase 5、Adapter 4-5、CLIハンドラ3前後 |
| テストファイル数 | 12-16 | Domain中心の細粒度テスト + UseCase/CLI/Adapter統合テスト |
| 複雑度 | Medium-High | 単一集約だが、Preset解決、Shared Kernel公開、CLI切替、Wave 2拡張点を同時に設計する必要がある |
| 主な高難度ポイント | 3点 | Preset deep merge、解決済みDTOと永続化ドキュメントの責務分離、Feature Registryの段階拡張 |

実装順の推奨:

1. Domain層の型と不変条件を確定
2. `LoadResolvedConfigUseCase` とスキーマValidatorを先に通す
3. `phasegate:enable/disable` のApplication + Presentationを接続
4. Feature RegistryのWave 2差し替え点を残して固定化する

---

## 7. QA（不明点・確認事項）

### [Question] Q1: `preset: "default"` の扱い

configurable_phase_gate_plan §4.1 で導入される `preset: "default"` は、config-foundation の `Preset` 値オブジェクトとしても受け入れるべきか。それとも「スキーマレベルの省略時フォールバック」として扱い、`Preset` 値オブジェクトには `full` / `standard` / `minimal` / `custom` のみを置くべきか。

**決定**: `"default"` はスキーマ入力の糖衣構文（syntactic sugar）として扱い、`HarnessConfigPhaseConfigProvider` 内で `"full"` へ解決する。`Preset` 値オブジェクトおよびドメイン層は `full` / `standard` / `minimal` / `custom` の 4 値のみを知る。これにより Domain 層に「default という曖昧な別名」が漏れず、`PresetResolutionService` の分岐も単純に保てる。

[Answer] configurable_phase_gate_plan §4.1 / §A-6 の方針と整合。Infrastructure 層（`HarnessConfigPhaseConfigProvider.getStoryReflectionConfig()`）で `default → full` フォールバックを実装する。

### [Question] Q2: `--preset` CLI オプション追加時のスコープ

`main.ts` に `--preset <name>` オプションを追加する際、config-foundation の CLI ハンドラ群（`EnableFeatureCommandHandler` 等）との役割分担はどうすべきか。

**決定**: `--preset` は **init 系コマンド（`phasegate init`）専用のオプション**として実装する。既存の `enable` / `disable` / `validate` コマンドには波及させない。init 以外のコマンド実行時に `--preset` を渡した場合は引数パースエラーとする。init 実装は `skill-deployer.ts` の `initHarnessConfig` を経由して `phasegate.config.json` の初期値を書き込む（configurable_phase_gate_plan §A-6-2）。

[Answer] configurable_phase_gate_plan §A-6 で定義された init 側の責務に閉じ込める。presentation/cli の enable/disable ハンドラには影響を与えない。

### [Question] Q3: JSON スキーマ拡張の後方互換性

`harness-config-v2.schema.json` に `phaseDependencies.storyReflection` セクションと `phaseDependencies.preset: "default"` を追加する際、既存の `phasegate.config.json`（これらのキーを持たない）がバリデーションエラーで動かなくなることはないか。

**決定**: 両フィールドとも **optional** で追加し、未指定時は `HarnessConfigPhaseConfigProvider` 層でデフォルト値にフォールバックする。スキーマ上の `required` 配列には追加しない。これにより既存プロジェクトの設定ファイルは無改修で引き続き有効。

[Answer] configurable_phase_gate_plan §4.1 の後方互換性要件と整合。Ajv スキーマレベルでは optional、Provider レベルでデフォルト補完、という二段構成で担保する。
