# 論理設計: config-foundation

## WI-085 / WI-086 / WI-087 / WI-091 Configuration Surface

<!-- @work-item-id WI-085, WI-086, WI-087, WI-091 -->

The config foundation owns schema and resolution behavior for customizable documentation paths, agent hook installation defaults, workspace target detection inputs, and layer enablement overrides. Downstream units consume resolved config values rather than duplicating preset-only assumptions.

@work-item-id WI-140
`toValidatorSystemConfig` は resolved config から validator-system へ渡す L2 validators に `L2-014 work-item-status-staleness` を含める。これにより `validate --layer L2` と harness-api 経由の validation が同じ status gate catalog を使用する。

@story-id H04-01
@story-id H04-02
@story-id H04-03
@work-item-id WI-024
> **作成日**: 2026-03-13
> **対応ストーリー**: H04-01, H04-02, H04-03
> **モード**: Unit横断設計（Phase 2）
> **前提ドキュメント**: `domain_model.md`（同ディレクトリ）, `docs/product/units/config_foundation_unit.md`, `docs/product/units/integration_contract.md`, `docs/inception/config-foundation/logical_design_plan.md`

---

## 1. アーキテクチャ概要

### 1.1 層構成と責務

| 層 | 責務 | 依存先 |
|----|------|--------|
| domain | `HarnessConfig` 集約、値オブジェクト、不変条件、Preset解決ロジック、Feature切替ルール、ポート定義 | なし |
| application | 設定読込・検証・機能切替・機能一覧取得のユースケース、DTO変換、永続化調停 | domain |
| infrastructure | ファイルI/O、JSONスキーマ検証、Feature Registry実装、Preset定義供給 | domain, application |
| presentation | CLI引数解釈、UseCase呼び出し、メッセージ整形、終了コード決定 | application, domain |

設計原則:

- `domain ← application ← infrastructure`
- `domain ← application ← presentation`
- Domain層は外部ライブラリ、Node.js API、AJV、CLI入出力に依存しない
- Application層は集約を直接外へ返さず、`HarnessConfigV2` またはCLI用Result DTOへ変換する
- Shared Kernel公開面は `scripts/harness/shared-kernel/harness-config.ts` のみとし、他Unitは `config-foundation/domain/` を直接参照しない

### 1.2 依存方向

```text
                    ┌────────────────────────────────────────┐
                    │ presentation                           │
                    │ CLI handlers / argv parsing / messages │
                    └──────────────────┬─────────────────────┘
                                       │
                                       v
                    ┌────────────────────────────────────────┐
                    │ application                            │
                    │ use cases / DTO / facade               │
                    └───────────────┬───────────────┬────────┘
                                    │               │
                                    v               ^
                    ┌────────────────────────────────────────┐
                    │ domain                                 │
                    │ aggregate / value objects / services   │
                    │ ports                                  │
                    └───────────────^───────────────^────────┘
                                    │               │
                    ┌───────────────┴───────────────┴────────┐
                    │ infrastructure                         │
                    │ fs / ajv / registry / preset store     │
                    └────────────────────────────────────────┘
```

- infrastructure は domain のポートを実装するが、business ruleは持たない
- presentation は application を経由せずに domain 操作を行わない
- `phaseDependencies` / `planningMode` は構造を保持するだけで、意味論は `phase-dependency-model` に委譲する

### 1.3 ディレクトリ構成（全ファイル一覧）

```text
scripts/harness/
├── shared-kernel/
│   └── harness-config.ts
├── config-foundation/
│   ├── domain/
│   │   ├── harness-config.ts
│   │   ├── events/
│   │   │   ├── feature-toggled.ts
│   │   │   └── preset-applied.ts
│   │   ├── ports/
│   │   │   ├── config-repository-port.ts
│   │   │   ├── config-schema-validator-port.ts
│   │   │   └── feature-registry-port.ts
│   │   ├── services/
│   │   │   ├── feature-registry.ts
│   │   │   └── preset-resolution-service.ts
│   │   └── value-objects/
│   │       ├── custom-phase-rule.ts
│   │       ├── feature-name.ts
│   │       ├── feature-toggle.ts
│   │       ├── harnesses-config.ts
│   │       ├── l1-config.ts
│   │       ├── l2-config.ts
│   │       ├── l3-config.ts
│   │       ├── l4-config.ts
│   │       ├── layers-config.ts
│   │       ├── paths-config.ts
│   │       ├── phase-dependencies-config.ts
│   │       ├── planning-mode-config.ts
│   │       ├── preset.ts
│   │       ├── project-config.ts
│   │       ├── quick-mode-config.ts
│   │       └── reporting-config.ts
│   ├── application/
│   │   ├── dto/
│   │   │   ├── available-feature-item.ts
│   │   │   ├── feature-toggle-result.ts
│   │   │   ├── resolved-config-output.ts
│   │   │   └── validate-config-result.ts
│   │   ├── facades/
│   │   │   └── load-config.ts
│   │   └── use-cases/
│   │       ├── disable-feature-use-case.ts
│   │       ├── enable-feature-use-case.ts
│   │       ├── list-available-features-use-case.ts
│   │       ├── load-resolved-config-use-case.ts
│   │       └── validate-config-use-case.ts
│   ├── infrastructure/
│   │   ├── presets/
│   │   │   ├── minimal.json
│   │   │   ├── standard.json
│   │   │   └── strict.json
│   │   ├── registries/
│   │   │   ├── composite-feature-registry-adapter.ts
│   │   │   └── static-feature-registry-adapter.ts
│   │   ├── repositories/
│   │   │   └── file-system-config-repository.ts
│   │   ├── schemas/
│   │   │   ├── harness-config-v2.schema.json
│   │   │   └── harness-config-v3.schema.json
│   │   ├── validators/
│   │   │   └── ajv-config-schema-validator.ts
│   │   └── preset-definition-store.ts
│   └── presentation/
│       └── cli/
│           ├── disable-feature-command-handler.ts
│           ├── enable-feature-command-handler.ts
│           └── list-available-features-command-handler.ts
├── cli/
│   ├── disable.ts
│   └── enable.ts
└── core/
    └── config-loader.ts
```

補足:

- `scripts/harness/cli/enable.ts` / `disable.ts` は互換エントリーポイントとして残し、`presentation/cli/` のハンドラへ委譲する
- `scripts/harness/core/config-loader.ts` は他Unit互換ファサードとし、内部では `application/facades/load-config.ts` を呼ぶ
- `scripts/harness/shared-kernel/harness-config.ts` は `HarnessConfigV2` の再エクスポートのみを行う

Shared Kernel再エクスポート実装パターン:

```ts
export { HarnessConfigV2 } from '../config-foundation/domain/harness-config.js';
export type { HarnessConfigV2Props } from '../config-foundation/domain/harness-config.js';
```

設計制約:

- `scripts/harness/shared-kernel/harness-config.ts` は上記2行のみを公開し、独自ロジック・型変換・再定義を持たない
- 他Unitは Shared Kernel 公開境界として `shared-kernel/harness-config.ts` を参照し、`config-foundation/domain/` を直接importしない
- `phase2Extensions.initialCreationExpirationRules` は `p2:check-initial-creation` の公開 compatibility config として schema 検証対象に含める <!-- @work-item-id WI-170 -->

### 1.4 Preset定義の論理構造

`PresetResolutionService` が解決する標準Presetは以下の論理値を持つ。

| Preset | L1 | L2 | L3 | L4 | coverageThreshold | agentLessonCollection | cascadeUpdate | bundleSizeLimit | deadCodeGC |
|--------|----|----|----|----|-------------------|-----------------------|---------------|-----------------|------------|
| minimal | on | on | off | off | 0 | false | false | 0 | false |
| standard | on | on | on | off | 90 | false | false | 0 | false |
| strict | on | on | on | on | 95 | true | false | 500 | true |

設計判断:

- `bundleSizeLimit` は統合契約上 `number` 固定のため、`0` を「無効」のセンチネル値として扱う
- `cascadeUpdate` は全Presetで `false` 開始とし、CLIまたは明示設定でのみ有効化する
- 配列プロパティは deep merge 時に連結せず、上書き元の配列で置換する

---

## 2. Domain層設計

### 2.1 集約ルート: HarnessConfig

#### 2.1.1 集約責務

`HarnessConfig` は `phasegate.config.json` 1ファイル全体を整合性境界として扱う単一集約である。責務は以下の3点に限定する。

1. 生の永続化ドキュメントとPreset解決済みスナップショットを同時に保持し、両者の整合を保つ
2. `enableFeature` / `disableFeature` によって `harnesses` セクションの既定値を変更する
3. `HarnessConfigV2` として外部公開可能な解決済みDTOを返す

#### 2.1.2 属性一覧

| 属性 | 型 | 必須 | 説明 |
|------|----|------|------|
| `project` | `ProjectConfig` | Yes | 解決済み `project` セクション。`preset` を含む |
| `layers` | `LayersConfig` | Yes | 解決済み `layers` セクション |
| `quickMode` | `QuickModeConfig` | Yes | 解決済み `quickMode` セクション |
| `architecture` | `ArchitectureConfig` | Yes | 解決済み `architecture` セクション。preset/layers/allowedDependencies/metadataTagsを含む |
| `phaseDependencies` | `PhaseDependenciesConfig` | Yes | 解決済み `phaseDependencies` 構造 |
| `planningMode` | `PlanningModeConfig` | Yes | 解決済み `planningMode` 構造 |
| `harnesses` | `HarnessesConfig` | Yes | 解決済み `harnesses` セクション |
| `paths` | `PathsConfig` | Yes | 解決済み `paths` セクション |
| `reporting` | `ReportingConfig` | Yes | 解決済み `reporting` セクション |
| `sourceDocument` | `HarnessConfigSourceDocument` | Yes | 永続化対象の生ドキュメント。Preset未展開の差分表現を保持する内部属性 |
| `resolvedDocument` | `HarnessConfigResolvedDocument` | Yes | `sourceDocument + preset defaults` の解決結果を保持する内部属性 |
| `pendingEvents` | `readonly DomainEvent[]` | Yes | 未発行ドメインイベント。Wave 1では外部発火しないが pull 可能 |

`HarnessConfigSourceDocument` の構造:

| フィールド | 型 | 説明 |
|-----------|----|------|
| `project` | `{ name: string; preset: "minimal" \| "standard" \| "strict" }` | 永続化される project |
| `layers` | `Partial<ResolvedLayersDocument>` | トップレベルは必須。ネスト側でPreset上書き差分を保持 |
| `quickMode` | `Partial<ResolvedQuickModeDocument>` | トップレベルは必須。ネスト側でPreset上書き差分を保持 |
| `architecture` | `Partial<ArchitectureConfigDocument>` | architecture preset と metadata tag名の上書き差分を保持 |
| `phaseDependencies` | `ResolvedPhaseDependenciesDocument` | 構造値。Preset非依存 |
| `planningMode` | `ResolvedPlanningModeDocument` | 構造値。Preset非依存 |
| `harnesses` | `Partial<ResolvedHarnessesDocument>` | トップレベルは必須。ネスト側でPreset上書き差分とCLIトグル結果を保持 |
| `paths` | `ResolvedPathsDocument` | 永続値 |
| `reporting` | `ResolvedReportingDocument` | 永続値 |

#### 2.1.3 メソッド一覧

##### `static reconstitute(props: HarnessConfigReconstitutionProps): HarnessConfig`

- 入力:
  - `sourceDocument: HarnessConfigSourceDocument`
  - `resolvedDocument: HarnessConfigResolvedDocument`
  - `pendingEvents?: readonly DomainEvent[]`
- 出力: `HarnessConfig`
- 例外:
  - `ConfigValidationError`
  - `InvalidPresetError`
  - `InvalidHarnessesConfigError`
- 検証する不変条件: INV-1, INV-2, INV-4, INV-6

処理フロー:

1. `resolvedDocument` から各値オブジェクトを生成する
2. `sourceDocument.project.preset` と `resolvedDocument.project.preset` が一致することを確認する
3. `HarnessesConfig` 生成時に `bundleSizeLimit >= 0` を検証する
4. `phaseDependencies` / `planningMode` は構造のみ検証し、意味論チェックを行わない
5. `pendingEvents` が未指定なら空配列で初期化する
6. `HarnessConfig` を返す

##### `enableFeature(name: FeatureName): void`

- 入力: `name: FeatureName`
- 出力: なし
- 例外:
  - `UnsupportedFeatureError`
  - `FeatureActivationRuleError`
- 検証する不変条件: INV-4, INV-5

処理フロー:

1. `FeatureName` に対応する `harnesses` の対象フィールドを解決する
2. `agentLessonCollection` / `cascadeUpdate` / `deadCodeGC` は `true` に変更する
3. `bundleSizeLimit` は `0` の場合のみ既定有効値 `500` に更新する
4. 更新後の `HarnessesConfig` を再生成し、`sourceDocument.harnesses` と `resolvedDocument.harnesses` を同時更新する
5. `FeatureToggled` を `pendingEvents` に追加する

##### `disableFeature(name: FeatureName): void`

- 入力: `name: FeatureName`
- 出力: なし
- 例外:
  - `UnsupportedFeatureError`
- 検証する不変条件: INV-4, INV-5

処理フロー:

1. `FeatureName` に対応する対象フィールドを解決する
2. boolean feature は `false` に変更する
3. `bundleSizeLimit` は `0` に変更する
4. `sourceDocument.harnesses` と `resolvedDocument.harnesses` を更新する
5. `FeatureToggled` を `pendingEvents` に追加する

##### `getLayerConfig(layerId: "L1" | "L2" | "L3" | "L4"): L1Config | L2Config | L3Config | L4Config`

- 入力: `layerId`
- 出力: 指定レイヤーの設定値オブジェクト
- 例外: `UnknownLayerError`

処理フロー:

1. `layerId` に一致する値オブジェクトを `layers` から取得する
2. 存在しない場合は `UnknownLayerError` を送出する
3. 対応する `LxConfig` を返す

##### `isFeatureEnabled(name: FeatureName): boolean`

- 入力: `name: FeatureName`
- 出力: `boolean`
- 例外: `UnsupportedFeatureError`

判定ルール:

- `agentLessonCollection` / `cascadeUpdate` / `deadCodeGC` は boolean 値をそのまま返す
- `bundleSizeLimit` は `> 0` のとき `true` を返す

##### `toResolvedConfig(): HarnessConfigV2`

- 入力: なし
- 出力: `HarnessConfigV2`
- 例外: なし

処理フロー:

1. `resolvedDocument` を Shared Kernel DTO 形式へ射影する
2. 値オブジェクトをプリミティブに展開する
3. 新しいDTOを返し、内部参照は外部に公開しない

##### `toSourceDocument(): HarnessConfigSourceDocument`

- 入力: なし
- 出力: 永続化用プレーンオブジェクト
- 用途: `ConfigRepositoryPort.save()` の入力

処理フロー:

1. `sourceDocument` の defensive copy を作成する
2. 未設定差分フィールドは省略形のまま保持する
3. 2スペースJSON整形可能なプレーンオブジェクトを返す

##### `pullDomainEvents(): readonly DomainEvent[]`

- 入力: なし
- 出力: `readonly DomainEvent[]`
- 副作用: `pendingEvents` を空にする

#### 2.1.4 集約不変条件

| ID | 不変条件 | 実装箇所 |
|----|---------|---------|
| INV-1 | 入力ドキュメントは v2 JSONスキーマに適合している | `ValidateConfigUseCase` + `reconstitute` 前提 |
| INV-2 | `project.preset` の値に対応するPresetが必ず存在する | `Preset.create` |
| INV-3 | deep merge時に配列は結合せず置換される | `PresetResolutionService` |
| INV-4 | GSD由来品質機能の初期値はデフォルト無効である | Preset定義 + `HarnessesConfig` |
| INV-5 | `enableFeature` / `disableFeature` の対象は `FeatureRegistryPort` から供給された機能名のみである | Application層の事前検証 + `FeatureName` |
| INV-6 | `phaseDependencies` / `planningMode` は構造のみ保持し、意味論検証を行わない | `PhaseDependenciesConfig`, `PlanningModeConfig` |

### 2.2 値オブジェクト群

全値オブジェクトは immutable とし、生成は factory 経由で行う。`equals(other)` は全属性値の一致で判定する。

#### 2.2.1 ProjectConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `name` | `string` | プロジェクト名 |
| `preset` | `Preset` | 適用Preset ID |

生成ルール:

- `name` は空文字不可
- `preset` は `Preset.create(raw)` で生成する

メソッド:

- `static create(raw: { name: string; preset: string }): ProjectConfig`
- `rename(name: string): ProjectConfig`
- `changePreset(preset: Preset): ProjectConfig`
- `equals(other: ProjectConfig): boolean`

#### 2.2.2 Preset

| 属性 | 型 | 説明 |
|------|----|------|
| `value` | `"minimal" \| "standard" \| "strict"` | Preset ID |

生成ルール:

- 列挙値以外は `InvalidPresetError`

メソッド:

- `static create(raw: string): Preset`
- `isMinimal(): boolean`
- `isStandard(): boolean`
- `isStrict(): boolean`
- `equals(other: Preset): boolean`

#### 2.2.3 LayersConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `L1` | `L1Config` | L1設定 |
| `L2` | `L2Config` | L2設定 |
| `L3` | `L3Config` | L3設定 |
| `L4` | `L4Config` | L4設定 |

生成ルール:

- 4レイヤーが必須
- 各子VOの検証失敗をそのまま伝播する

メソッド:

- `static create(raw: ResolvedLayersDocument): LayersConfig`
- `get(layerId: "L1" | "L2" | "L3" | "L4"): L1Config | L2Config | L3Config | L4Config`
- `equals(other: LayersConfig): boolean`

#### 2.2.4 L1Config

| 属性 | 型 | 説明 |
|------|----|------|
| `enabled` | `boolean` | L1有効/無効 |
| `rules` | `Readonly<Record<string, "error" \| "warning" \| "off">>` | Biome ASTルール設定 |

生成ルール:

- `rules` の値は `error` / `warning` / `off` のみ

メソッド:

- `static create(raw: { enabled: boolean; rules: Record<string, string> }): L1Config`
- `isEnabled(): boolean`
- `getRuleSeverity(ruleName: string): "error" | "warning" | "off" | undefined`
- `equals(other: L1Config): boolean`

#### 2.2.5 L2Config

| 属性 | 型 | 説明 |
|------|----|------|
| `enabled` | `boolean` | L2有効/無効 |
| `validators` | `readonly string[]` | 実行対象バリデータID一覧 |

生成ルール:

- `validators` は重複不可

メソッド:

- `static create(raw: { enabled: boolean; validators: string[] }): L2Config`
- `contains(validatorId: string): boolean`
- `equals(other: L2Config): boolean`

#### 2.2.6 L3Config

| 属性 | 型 | 説明 |
|------|----|------|
| `enabled` | `boolean` | L3有効/無効 |
| `validators` | `readonly string[]` | 実行対象バリデータID一覧 |
| `coverageThreshold` | `number` | カバレッジ閾値 |

生成ルール:

- `coverageThreshold` は `0 <= value <= 100`

メソッド:

- `static create(raw: { enabled: boolean; validators: string[]; coverageThreshold: number }): L3Config`
- `hasCoverageGate(): boolean`
- `equals(other: L3Config): boolean`

#### 2.2.7 L4Config

| 属性 | 型 | 説明 |
|------|----|------|
| `enabled` | `boolean` | L4有効/無効 |
| `validators` | `readonly string[]` | 実行対象バリデータID一覧 |
| `schedule` | `string` | cron式 |

生成ルール:

- `schedule` は空文字不可

メソッド:

- `static create(raw: { enabled: boolean; validators: string[]; schedule: string }): L4Config`
- `equals(other: L4Config): boolean`

#### 2.2.8 QuickModeConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `allowedCategories` | `readonly string[]` | Quick Modeで許可されるカテゴリ |
| `maintainedLayers` | `readonly string[]` | 維持対象レイヤー |
| `relaxedGates` | `readonly string[]` | 緩和対象ゲート |

生成ルール:

- 各配列は重複不可
- 配列順は入力順を保持する

メソッド:

- `static create(raw: ResolvedQuickModeDocument): QuickModeConfig`
- `allows(category: string): boolean`
- `maintains(layerId: string): boolean`
- `equals(other: QuickModeConfig): boolean`

#### 2.2.9 PhaseDependenciesConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `preset` | `"default" \| "custom"` | 構造上のPreset |
| `override` | `boolean` | 上書きの有無 |
| `customRules` | `readonly CustomPhaseRule[]` | 追加ルール |

生成ルール:

- `customRules` の `phase` は空文字不可
- 意味論検証は行わない

メソッド:

- `static create(raw: ResolvedPhaseDependenciesDocument): PhaseDependenciesConfig`
- `hasCustomRules(): boolean`
- `equals(other: PhaseDependenciesConfig): boolean`

#### 2.2.10 CustomPhaseRule

| 属性 | 型 | 説明 |
|------|----|------|
| `phase` | `string` | フェーズID |
| `requires` | `readonly string[]` | 依存フェーズ一覧 |

生成ルール:

- `phase` は空文字不可
- `requires` は重複不可

メソッド:

- `static create(raw: { phase: string; requires: string[] }): CustomPhaseRule`
- `equals(other: CustomPhaseRule): boolean`

#### 2.2.11 PlanningModeConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `defaultMode` | `"interactive" \| "embedded-qa"` | デフォルトPlanning Mode |
| `perPhase` | `Readonly<Record<string, "interactive" \| "embedded-qa">>` | フェーズ別上書き |

生成ルール:

- `defaultMode` は列挙値のみ
- `perPhase` の値も同列挙値のみ

メソッド:

- `static create(raw: ResolvedPlanningModeDocument): PlanningModeConfig`
- `resolveFor(phase: string): "interactive" | "embedded-qa"`
- `equals(other: PlanningModeConfig): boolean`

#### 2.2.12 HarnessesConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `agentLessonCollection` | `boolean` | Lesson収集機能 |
| `cascadeUpdate` | `boolean` | Cascade Update機能 |
| `bundleSizeLimit` | `number` | バンドルサイズ閾値。`0` は無効 |
| `deadCodeGC` | `boolean` | Dead code GC機能 |

生成ルール:

- `bundleSizeLimit` は `0` 以上
- デフォルト無効原則により、Preset未展開初期値は `false/0/false` を許容する

メソッド:

- `static create(raw: ResolvedHarnessesDocument): HarnessesConfig`
- `enable(name: FeatureName): HarnessesConfig`
- `disable(name: FeatureName): HarnessesConfig`
- `isEnabled(name: FeatureName): boolean`
- `equals(other: HarnessesConfig): boolean`

#### 2.2.13 PathsConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `designDocs` | `string` | 設計確定文書のルート |
| `inceptionDocs` | `string` | 計画文書のルート |

生成ルール:

- いずれも空文字不可
- `~` や `$HOME` を含むグローバルパスは許容しない

メソッド:

- `static create(raw: { designDocs: string; inceptionDocs: string }): PathsConfig`
- `equals(other: PathsConfig): boolean`

#### 2.2.14 ReportingConfig

| 属性 | 型 | 説明 |
|------|----|------|
| `format` | `string` | レポート出力形式 |
| `outputDir` | `string` | 出力ディレクトリ |

生成ルール:

- 両方とも空文字不可

メソッド:

- `static create(raw: { format: string; outputDir: string }): ReportingConfig`
- `equals(other: ReportingConfig): boolean`

#### 2.2.15 FeatureName

| 属性 | 型 | 説明 |
|------|----|------|
| `value` | `"agentLessonCollection" \| "cascadeUpdate" \| "bundleSizeLimit" \| "deadCodeGC"` | トグル対象機能名 |

生成ルール:

- `FeatureRegistryPort` から供給された文字列一覧に含まれる場合のみ生成する

メソッド:

- `static create(raw: string, availableNames: readonly string[]): FeatureName`
- `toString(): string`
- `equals(other: FeatureName): boolean`

#### 2.2.16 FeatureToggle

| 属性 | 型 | 説明 |
|------|----|------|
| `name` | `FeatureName` | 対象機能 |
| `enabled` | `boolean` | 有効/無効 |

生成ルール:

- `enabled` は `HarnessesConfig.isEnabled(name)` から導出する

メソッド:

- `static create(name: FeatureName, enabled: boolean): FeatureToggle`
- `toggle(nextState: boolean): FeatureToggle`
- `equals(other: FeatureToggle): boolean`

### 2.3 ドメインサービス

#### 2.3.1 PresetResolutionService

Preset解決と個別上書きの deep merge を担う純粋ドメインサービス。

コンストラクタ依存:

- なし

メソッド:

##### `resolve(sourceDocument: HarnessConfigSourceDocument, presetDefinition: PresetDefinition): HarnessConfigResolvedDocument`

- 入力:
  - `sourceDocument`
  - `presetDefinition`
- 出力: `HarnessConfigResolvedDocument`
- 例外:
  - `InvalidPresetDefinitionError`
  - `ConfigMergeError`

処理フロー:

1. `presetDefinition` をベースドキュメントとして取得する
2. `sourceDocument` の各セクションを順に適用する
3. object 同士は再帰マージする
4. array は結合せず、`sourceDocument` 側の配列に置換する
5. primitive は `sourceDocument` 側で上書きする
6. 生成結果に `project.name` と `project.preset` を反映する
7. `HarnessConfigResolvedDocument` を返す

##### `applyFeatureOverride(document: HarnessConfigResolvedDocument, override: FeatureToggle): HarnessConfigResolvedDocument`

- 入力:
  - `document`
  - `override`
- 出力: `HarnessConfigResolvedDocument`

用途:

- CLIトグル後に `resolvedDocument.harnesses` を再構築するために使う

#### 2.3.2 FeatureRegistry

`FeatureRegistryPort` が返す文字列一覧を Domainで扱える `FeatureName` へ正規化するACL的サービス。

コンストラクタ依存:

- なし

メソッド:

##### `listAvailable(source: FeatureRegistryPort): readonly FeatureName[]`

- 入力: `source`
- 出力: `readonly FeatureName[]`

処理フロー:

1. `source.listAvailable()` を呼び出す
2. 文字列を重複排除し、安定ソートする
3. それぞれを `FeatureName.create()` へ変換する
4. `readonly FeatureName[]` を返す

##### `ensureAvailable(name: string, source: FeatureRegistryPort): FeatureName`

- 入力:
  - `name`
  - `source`
- 出力: `FeatureName`
- 例外: `UnsupportedFeatureError`

処理フロー:

1. `listAvailable(source)` を取得する
2. `name` と一致する `FeatureName` を探索する
3. 見つからない場合は利用可能一覧を含む `UnsupportedFeatureError` を送出する
4. 該当 `FeatureName` を返す

### 2.4 ドメインイベント

Wave 1ではイベントバス連携を行わないが、集約内部では将来拡張用にイベント型を定義する。

#### 2.4.1 FeatureToggled

| 属性 | 型 | 説明 |
|------|----|------|
| `occurredAt` | `Date` | 発生日時 |
| `projectName` | `string` | 対象プロジェクト |
| `featureName` | `string` | 切替対象 |
| `previousState` | `boolean` | 変更前状態 |
| `currentState` | `boolean` | 変更後状態 |

#### 2.4.2 PresetApplied

| 属性 | 型 | 説明 |
|------|----|------|
| `occurredAt` | `Date` | 発生日時 |
| `projectName` | `string` | 対象プロジェクト |
| `preset` | `"minimal" \| "standard" \| "strict"` | 適用されたPreset |
| `changedSections` | `readonly string[]` | 変更されたセクション一覧 |

### 2.5 ドメイン例外定義

config-foundation は Domain/構造を担う L1 層であるため、例外の `errorCode` は横断決定事項 `docs/inception/_shared/cross_cutting_decisions.md` §3 に従い `L{n}-{nnn}` 形式の `L1-xxx` を採番する。

| 例外 | errorCode | 発生条件 | 主な送出箇所 |
|------|-----------|----------|--------------|
| `ConfigValidationError` | `L1-001` | 入力ドキュメントまたは再構築対象がドメイン不変条件を満たさない | `HarnessConfig.reconstitute()` |
| `InvalidPresetError` | `L1-002` | `project.preset` が許可列挙値（`minimal` / `standard` / `strict`）に一致しない | `Preset.create()` |
| `InvalidHarnessesConfigError` | `L1-003` | `harnesses` セクションの構造や値が `HarnessesConfig` の制約に違反する | `HarnessesConfig.create()`, `HarnessConfig.reconstitute()` |
| `UnsupportedFeatureError` | `L1-004` | Feature Registry に存在しない機能名を有効化/無効化/参照しようとした | `FeatureName.create()`, `FeatureRegistry.ensureAvailable()`, `HarnessConfig.enableFeature()/disableFeature()` |
| `FeatureActivationRuleError` | `L1-005` | 機能有効化がドメインルールに反する状態遷移を要求した | `HarnessConfig.enableFeature()` |
| `UnknownLayerError` | `L1-006` | `L1`〜`L4` 以外、または未定義レイヤーを `getLayerConfig()` に要求した | `HarnessConfig.getLayerConfig()` |
| `InvalidPresetDefinitionError` | `L1-007` | Preset定義自体が必要セクションや値制約を満たさない | `PresetResolutionService.resolve()` |
| `ConfigMergeError` | `L1-008` | Preset解決時の deep merge で構造不整合や置換不能状態が発生した | `PresetResolutionService.resolve()` |

実装規約:

- 上記例外はすべて `errorCode` を必須属性として保持する
- `message` は人間可読説明、`errorCode` は機械可読識別子として分離する
- Application層は Domain例外を捕捉しても `errorCode` を変更せず、そのまま `HarnessError` やCLI出力へ伝搬する

---

## 3. Domain層ポート設計

### 3.1 ConfigRepositoryPort

```ts
export interface ConfigRepositoryPort {
  load(configPath?: string): Promise<{ path: string; document: unknown }>;
  save(configPath: string, document: unknown): Promise<void>;
}
```

| メソッド | 入力 | 出力 | 用途 |
|---------|------|------|------|
| `load` | `configPath?: string` | `Promise<{ path: string; document: unknown }>` | `phasegate.config.json` を読み込む。未指定時は既定探索し、保存用の実パスも返す |
| `save` | `configPath: string`, `document: unknown` | `Promise<void>` | 更新済み設定を保存する |

### 3.2 ConfigSchemaValidatorPort

```ts
export interface ConfigSchemaValidatorPort {
  validate(document: unknown): readonly HarnessError[];
}
```

| メソッド | 入力 | 出力 | 用途 |
|---------|------|------|------|
| `validate` | `document: unknown` | `readonly HarnessError[]` | v2スキーマ適合性検証。AJV固有型は返さない |

### 3.3 FeatureRegistryPort

```ts
export interface FeatureRegistryPort {
  listAvailable(): readonly string[];
}
```

| メソッド | 入力 | 出力 | 用途 |
|---------|------|------|------|
| `listAvailable` | なし | `readonly string[]` | `phasegate:enable/disable` が扱える機能名の一覧を供給する |

ポート設計ポリシー:

- Wave 1では `harnesses` セクションのキーのみを返す
- Wave 2以降は Validator ID Registry を合流させても、契約は `readonly string[]` のままとする

---

## 4. Application層設計

### 4.1 DTO一覧

| DTO | 型概要 | 用途 |
|-----|--------|------|
| `ResolvedConfigOutput` | `{ config: HarnessConfigV2; sourcePath: string }` | `load-config` ファサード戻り値 |
| `ValidateConfigResult` | `{ valid: boolean; errors: readonly HarnessError[] }` | バリデーション結果 |
| `FeatureToggleResult` | `{ feature: string; enabled: boolean; configPath: string }` | CLI成功メッセージ用 |
| `AvailableFeatureItem` | `{ name: string; enabled: boolean }` | `--list` 表示用 |

<!-- @work-item-id WI-092, WI-033 -->
### 4.1.1 ValidatorSystemConfigMapper

**ファイル**: `scripts/harness/config-foundation/application/mappers/validator-system-config-mapper.ts`

`toValidatorSystemConfig(resolvedConfig)` は、config-foundation の解決済み `HarnessConfigV2` から validator-system の composition root に渡す最小 config を生成する。渡す項目は `project.preset`、`layers.L2/L3/L4.enabled`、`layers.L4.validators`、`validate.failOnWarning` とする。validator-system 側で L4 の preset-style validator 名を内部IDへ正規化するため、`doc-freshness-checker` や `pointer-validator` などのプリセット名でも L4 の個別 enable/disable が反映される。

### 4.2 LoadResolvedConfigUseCase

**責務**: 設定読込、スキーマ検証、Preset解決、集約再構築、`HarnessConfigV2` DTO返却。

コンストラクタ依存:

- `configRepository: ConfigRepositoryPort`
- `schemaValidator: ConfigSchemaValidatorPort`
- `presetDefinitions: Readonly<Record<"minimal" | "standard" | "strict", PresetDefinition>>`
- `presetResolutionService: PresetResolutionService`

入力:

- `configPath?: string`

出力:

- `Promise<ResolvedConfigOutput>`

例外:

- `ConfigValidationError`
- `ConfigNotFoundError`

処理フロー:

1. `configRepository.load(configPath)` で `{ path, document }` を取得する
2. `schemaValidator.validate(document)` を実行する
3. エラーが1件でもあれば `ConfigValidationError` を送出する
4. `ProjectConfig` を読む前提で `document.project.preset` を抽出する
5. `presetDefinitions[preset]` を取得する
6. `presetResolutionService.resolve(document, presetDefinition)` で解決済みドキュメントを構築する
7. `HarnessConfig.reconstitute({ sourceDocument: document, resolvedDocument })` を実行する
8. `aggregate.toResolvedConfig()` と `path` を `ResolvedConfigOutput` に詰めて返す

### 4.3 ValidateConfigUseCase

**責務**: 永続化前またはfixture検証用に設定妥当性だけを返す。

コンストラクタ依存:

- `schemaValidator: ConfigSchemaValidatorPort`
- `presetDefinitions: Readonly<Record<"minimal" | "standard" | "strict", PresetDefinition>>`
- `presetResolutionService: PresetResolutionService`

入力:

- `document: unknown`

出力:

- `ValidateConfigResult`

例外:

- なし。常に結果DTOで返す

処理フロー:

1. `schemaValidator.validate(document)` を実行する
2. スキーマエラーが存在する場合は `valid: false` で返す
3. `project.preset` が有効なら `presetResolutionService.resolve()` を試行する
4. deep merge失敗やPreset不正時は `HarnessError` に変換して `errors` に加える
5. 問題がなければ `valid: true` を返す

### 4.4 EnableFeatureUseCase

**責務**: Feature存在確認、集約更新、保存。

コンストラクタ依存:

- `configRepository: ConfigRepositoryPort`
- `schemaValidator: ConfigSchemaValidatorPort`
- `featureRegistryPort: FeatureRegistryPort`
- `presetDefinitions: Readonly<Record<"minimal" | "standard" | "strict", PresetDefinition>>`
- `presetResolutionService: PresetResolutionService`
- `featureRegistry: FeatureRegistry`

入力:

- `featureName: string`
- `configPath?: string`

出力:

- `Promise<FeatureToggleResult>`

例外:

- `UnsupportedFeatureError`
- `ConfigValidationError`
- `ConfigPersistenceError`

処理フロー:

1. `configRepository.load(configPath)` で `{ path, document }` を取得し、LoadResolvedConfigUseCase と同じ解決手順で `HarnessConfig` を再構築する
2. `featureRegistry.ensureAvailable(featureName, featureRegistryPort)` で `FeatureName` を得る
3. `aggregate.enableFeature(featureNameVo)` を実行する
4. `schemaValidator.validate(aggregate.toSourceDocument())` を再実行し、保存前整合性を確認する
5. `configRepository.save(path, aggregate.toSourceDocument())` を実行する
6. `FeatureToggleResult` に `path` を詰めて返す

### 4.5 DisableFeatureUseCase

**責務**: Feature存在確認、無効化、保存。

コンストラクタ依存:

- EnableFeatureUseCaseと同一

入力:

- `featureName: string`
- `configPath?: string`

出力:

- `Promise<FeatureToggleResult>`

例外:

- `UnsupportedFeatureError`
- `ConfigValidationError`
- `ConfigPersistenceError`

処理フロー:

1. `configRepository.load(configPath)` で `{ path, document }` を取得し、LoadResolvedConfigUseCase と同じ解決手順で `HarnessConfig` を再構築する
2. `featureRegistry.ensureAvailable(...)` で `FeatureName` を得る
3. `aggregate.disableFeature(featureNameVo)` を実行する
4. `aggregate.toSourceDocument()` を再検証する
5. `configRepository.save(path, aggregate.toSourceDocument())` を実行する
6. 結果DTOに `path` を詰めて返す

### 4.6 ListAvailableFeaturesUseCase

**責務**: 利用可能機能一覧と現在状態の返却。

コンストラクタ依存:

- `configRepository: ConfigRepositoryPort`
- `schemaValidator: ConfigSchemaValidatorPort`
- `featureRegistryPort: FeatureRegistryPort`
- `presetDefinitions: Readonly<Record<"minimal" | "standard" | "strict", PresetDefinition>>`
- `presetResolutionService: PresetResolutionService`
- `featureRegistry: FeatureRegistry`

入力:

- `configPath?: string`

出力:

- `Promise<readonly AvailableFeatureItem[]>`

例外:

- `ConfigValidationError`

処理フロー:

1. `configRepository.load(configPath)` で `{ document }` を取得し、LoadResolvedConfigUseCase と同じ解決手順で `HarnessConfig` を再構築する
2. `featureRegistry.listAvailable(featureRegistryPort)` で候補一覧を取得する
3. 各候補に対して `aggregate.isFeatureEnabled(name)` を実行する
4. `{ name, enabled }` の配列として返す

### 4.7 load-config ファサード

**ファイル**: `scripts/harness/config-foundation/application/facades/load-config.ts`

責務:

- InfrastructureアダプターとPreset定義を組み立てる composition root
- 他Unitから `HarnessConfigV2` を取得するための唯一のApplication公開窓口

シグネチャ:

```ts
export async function loadConfig(configPath?: string): Promise<HarnessConfigV2>;
```

処理フロー:

1. `FileSystemConfigRepository`
2. `AjvConfigSchemaValidator`
3. `PresetDefinitionStore`
4. `PresetResolutionService`
5. `LoadResolvedConfigUseCase`

の順で依存を組み立て、`HarnessConfigV2` を返す。

---

## 5. Infrastructure層設計

### 5.1 FileSystemConfigRepository

実装対象ポート:

- `ConfigRepositoryPort`

技術選定:

- `node:fs/promises`
- `node:path`

実装方針:

- `load` は `configPath` 指定時はそのファイル、未指定時は `process.cwd()` から親方向に `phasegate.config.json` を探索し、解決した絶対パスを返す
- 読込時は `JSON.parse` 失敗を `ConfigPersistenceError` に包む
- `save` は `JSON.stringify(document, null, 2) + "\n"` で2スペースJSONを書き出す
- 保存先は常に既存の `phasegate.config.json` を上書きする

### 5.2 AjvConfigSchemaValidator

実装対象ポート:

- `ConfigSchemaValidatorPort`

技術選定:

- `ajv`
- JSON Schema draft-07

実装方針:

- 起動時に `harness-config-v2.schema.json` をcompile済みにする
- `validate(document)` は AJVエラーを `HarnessError[]` に変換して返す
- Domain/ApplicationにAJVの `ErrorObject` を漏らさない
- `additionalProperties: false` を基本とし、未知キー混入を防ぐ

### 5.3 StaticFeatureRegistryAdapter

実装対象ポート:

- `FeatureRegistryPort`

技術選定:

- 静的TypeScript配列

実装方針:

- Wave 1では `["agentLessonCollection", "cascadeUpdate", "bundleSizeLimit", "deadCodeGC"]` を返す
- 戻り順は固定し、CLI表示順と一致させる

### 5.4 CompositeFeatureRegistryAdapter

実装対象ポート:

- `FeatureRegistryPort`

技術選定:

- `StaticFeatureRegistryAdapter`
- 将来のValidator ID Registry adapter

実装方針:

- Wave 1では未使用だが差し替え点として定義する
- `listAvailable()` で複数供給源をマージし、重複排除後に返す
- CLI/API契約は変更しない

### 5.5 PresetDefinitionStore

実装対象:

- Application composition root向けのデータ供給

技術選定:

- `minimal.json`
- `standard.json`
- `strict.json`

実装方針:

- JSONファイルを読み込み、`Readonly<Record<PresetId, PresetDefinition>>` として返す
- Preset定義自体もスキーマ適合前提でテストする
- `PresetResolutionService` には plain data として渡し、Infrastructure依存をDomainへ持ち込まない

### 5.6 harness-config-v2.schema.json

役割:

- `HarnessConfigV2` の構造契約を表現するJSONスキーマ

実装方針:

- `project`, `layers`, `quickMode`, `phaseDependencies`, `planningMode`, `paths`, `reporting`, `harnesses` をトップレベル必須にする
- `layers` / `quickMode` / `harnesses` はトップレベル存在のみ必須とし、ネスト配下の一部プロパティはPreset解決前の差分表現として省略可能にする
- `project.preset` は `minimal` / `standard` / `strict`
- `planningMode.default` と `planningMode.perPhase.*` は `interactive` / `embedded-qa`
- `phaseDependencies.preset` は `default` / `custom`
- `harnesses.bundleSizeLimit` は `minimum: 0`

---

## 6. Presentation層設計

### 6.1 EnableFeatureCommandHandler

**ファイル**: `scripts/harness/config-foundation/presentation/cli/enable-feature-command-handler.ts`

入力:

- `process.argv[2]`: 機能名または `--list`
- `process.argv[3]`: 将来拡張の `--config <path>` 予約。Wave 1では省略可

処理:

1. 引数なしならUsage表示
2. `--list` の場合は `ListAvailableFeaturesUseCase` を呼ぶ
3. それ以外は `EnableFeatureUseCase` を呼ぶ
4. 成功時は更新内容と対象ファイルを表示する

終了コード:

| 条件 | 終了コード |
|------|-----------|
| 成功 | 0 |
| 機能名不明 | 1 |
| 実行エラー | 2 |

表示メッセージ:

成功時:

```text
Enabled feature: agentLessonCollection
Updated: /path/to/phasegate.config.json
```

一覧表示時:

```text
Available features:
  agentLessonCollection [disabled]
  cascadeUpdate         [disabled]
  bundleSizeLimit       [enabled]
  deadCodeGC            [disabled]
```

失敗時:

```text
Unknown feature: foo
Available features: agentLessonCollection, cascadeUpdate, bundleSizeLimit, deadCodeGC
```

### 6.2 DisableFeatureCommandHandler

**ファイル**: `scripts/harness/config-foundation/presentation/cli/disable-feature-command-handler.ts`

入力:

- `process.argv[2]`: 機能名または `--list`

処理:

1. `--list` の場合は `ListAvailableFeaturesUseCase` を呼ぶ
2. それ以外は `DisableFeatureUseCase` を呼ぶ
3. 成功時は無効化結果を表示する

終了コード:

| 条件 | 終了コード |
|------|-----------|
| 成功 | 0 |
| 機能名不明 | 1 |
| 実行エラー | 2 |

表示メッセージ:

```text
Disabled feature: deadCodeGC
Updated: /path/to/phasegate.config.json
```

### 6.3 ListAvailableFeaturesCommandHandler

**ファイル**: `scripts/harness/config-foundation/presentation/cli/list-available-features-command-handler.ts`

入力:

- なし

処理:

1. `ListAvailableFeaturesUseCase` を呼ぶ
2. nameの固定順で整形表示する
3. enable/disable双方から共通利用する

終了コード:

| 条件 | 終了コード |
|------|-----------|
| 成功 | 0 |
| 実行エラー | 2 |

表示メッセージ:

- `Available features:` 見出しを先頭に出す
- 各行は `<name> [enabled|disabled]`

### 6.4 互換CLIエントリーポイント

`scripts/harness/cli/enable.ts` / `disable.ts` の責務:

- 既存 `package.json` のコマンドエントリーを維持する
- Presentation層ハンドラを起動する薄いラッパーに限定する
- 今後 `harness-api` がCLI Command Registryへ登録する際も、このパスを正規入口として維持する

---

## 7. テスト方針

### 7.1 層別テスト方針

| 層 | テスト方針 |
|----|-----------|
| domain | 実オブジェクト中心。値オブジェクト・集約・`PresetResolutionService` はモック禁止 |
| application | ポートのみモック可。UseCaseは調停責務に限定して分岐を確認する |
| infrastructure | 実ファイルI/O、実AJVで統合寄りに検証する |
| presentation | argv、console出力、終了コードを検証する。UseCaseはスタブで差し替える |

共通ルール:

- AAAパターンを厳守する
- 実行結果は `actual` に代入する
- テストケース名は日本語で記述する
- Domain層ではドメインオブジェクトをモックしない
- 配列置換、デフォルト無効、未知機能エラーは回帰必須観点とする

### 7.2 テストケース概要

#### domain

| 対象 | 主なテストケース |
|------|----------------|
| `HarnessConfig` | Preset解決済みドキュメントから再構築できること |
| `HarnessConfig` | `enableFeature("agentLessonCollection")` で source/resolved 両方が更新されること |
| `HarnessConfig` | `disableFeature("bundleSizeLimit")` で値が `0` になること |
| `HarnessConfig` | `isFeatureEnabled("bundleSizeLimit")` が `0` と正数で正しく判定すること |
| `PresetResolutionService` | objectはdeep merge、arrayは置換されること |
| `PresetResolutionService` | standard上で `coverageThreshold=95` に個別上書きできること |
| `HarnessesConfig` | `bundleSizeLimit < 0` を拒否すること |
| `FeatureName` | 利用可能一覧にない文字列を拒否すること |

#### application

| 対象 | 主なテストケース |
|------|----------------|
| `LoadResolvedConfigUseCase` | validなraw documentから `HarnessConfigV2` を返すこと |
| `LoadResolvedConfigUseCase` | スキーマエラー時に `ConfigValidationError` を返すこと |
| `ValidateConfigUseCase` | スキーマエラーを `ValidateConfigResult.errors` に詰めて返すこと |
| `EnableFeatureUseCase` | 利用可能機能のみ保存されること |
| `EnableFeatureUseCase` | 保存前再検証で不整合を検出した場合は保存しないこと |
| `DisableFeatureUseCase` | featureを無効化して保存すること |
| `ListAvailableFeaturesUseCase` | 一覧と現在状態を返すこと |

#### infrastructure

| 対象 | 主なテストケース |
|------|----------------|
| `FileSystemConfigRepository` | 2スペースJSON + 改行付きで保存すること |
| `FileSystemConfigRepository` | `configPath` 未指定時に親ディレクトリ探索できること |
| `AjvConfigSchemaValidator` | 必須項目欠落を `HarnessError` に変換すること |
| `AjvConfigSchemaValidator` | `harnesses.bundleSizeLimit < 0` を拒否すること |
| `StaticFeatureRegistryAdapter` | Wave 1対象4機能を固定順で返すこと |
| `PresetDefinitionStore` | 全Presetを読めること |

#### presentation

| 対象 | 主なテストケース |
|------|----------------|
| `EnableFeatureCommandHandler` | `--list` で一覧表示し exit 0 を返すこと |
| `EnableFeatureCommandHandler` | 成功時に feature名と更新パスを表示すること |
| `EnableFeatureCommandHandler` | 未知機能で利用可能一覧を表示し exit 1 を返すこと |
| `DisableFeatureCommandHandler` | 成功時に無効化メッセージを表示すること |
| `ListAvailableFeaturesCommandHandler` | `enabled/disabled` 表示が正しいこと |

### 7.3 テストダブル方針

| テスト対象 | Domainオブジェクト | Port | 外部I/O |
|-----------|-------------------|------|---------|
| Domain層テスト | 実体 | in-memory fakeのみ可 | なし |
| Application層テスト | 実体 | モック可 | なし |
| Infrastructure層テスト | なし | 実装本体 | 実ファイル/実AJV |
| Presentation層テスト | なし | UseCaseスタブ | console/argvスタブ |

### 7.4 回帰観点

今回の3ストーリーに対する回帰観点を固定する。

| ストーリー | 回帰観点 |
|-----------|---------|
| H04-01 | `HarnessConfigV2` の必須セクションが全て解決済みDTOで返ること |
| H04-01 | Shared Kernel公開面が `scripts/harness/shared-kernel/harness-config.ts` に一本化されていること |
| H04-02 | minimal / standard / strict のPreset差分が想定どおりであること |
| H04-02 | array上書きが置換になること |
| H04-03 | GSD由来品質機能の初期値が `false/0` であること |
| H04-03 | `phasegate:enable --list` / `phasegate:disable --list` が同じ一覧を返すこと |
| H04-03 | 未知機能指定時に exit 1 と候補一覧を返すこと |

---

## 8. ストーリーとの対応

### H04-01: phasegate.config.json v2スキーマ定義

| 要求 | 対応設計 |
|------|---------|
| `HarnessConfigV2` の構造定義 | Domain `HarnessConfig` + Shared Kernel `harness-config.ts` |
| JSONスキーマ検証 | `ConfigSchemaValidatorPort` + `AjvConfigSchemaValidator` |
| Shared Kernel公開境界 | `scripts/harness/shared-kernel/harness-config.ts` |

### H04-02: Preset System定義と切替

| 要求 | 対応設計 |
|------|---------|
| 3Preset定義 | `infrastructure/presets/*.json` |
| Preset解決 | `PresetResolutionService` |
| 個別上書き | `sourceDocument` 差分 + deep merge |

### H04-03: GSD由来品質機能のデフォルト無効化 + phasegate:enable/disable

| 要求 | 対応設計 |
|------|---------|
| デフォルト無効 | Preset定義 + `HarnessesConfig` |
| feature一覧取得 | `FeatureRegistryPort` + `ListAvailableFeaturesUseCase` |
| CLIトグル | `EnableFeatureUseCase` / `DisableFeatureUseCase` + Presentation handlers |
| 未知機能エラー | `FeatureRegistry.ensureAvailable()` |

### WI-124 / WI-128 preset policy

CI template generation interprets preset policy against the live validator registry. `minimal` excludes L2-L4 metadata, `standard` includes L2/L3 gate metadata and scheduled L4 audit metadata for `consistency-check`, and `strict` includes L2-L4 with strict-only validators. @work-item-id WI-124

L4 remains default-off for standard rollout. Projects opt in through strict preset or explicit `layers.L4.enabled: true`; explicit `validate --layer L4` still runs L4 as an operator-requested audit. @work-item-id WI-128
<!-- @work-item-id WI-132, WI-133, WI-138 -->
## G4 Validator Config Propagation

`toValidatorSystemConfig()` includes `L2-015` in the default L2 validator list it passes to validator-system. This keeps contract traceability coverage active for resolved configs in the same way as L2-013 and L2-014.

<!-- @work-item-id WI-161, WI-163 -->
## P1 Validator Config Boundaries

Config-foundation owns resolved config projection, not every scanner policy. The public schema exposes `validate.failOnWarning`, `layers.*.enabled`, configured validator IDs, `harnesses.bundleSizeLimit`, `harnesses.deadCodeGC`, and architecture `capabilityPolicies` / `decisionPolicies`.

Operational scanner details such as L3-002 `largeLiteralEntries`, sync I/O detection, loop-await detection, security fixture allowlist markers, and dead-code graph exclusion rules are validator-system policy unless this Unit explicitly adds schema fields. CI template generation receives preset and layer state from config-foundation, then asks ci-governance/validator-system for the live validator surface.

<!-- @work-item-id WI-173 -->
## P3 Configuration Change Planning Boundary

`config:plan` is a planning surface for configuration changes, not a config mutation use case. It maps operator intent (`l4-strict`, `codex-hooks`, `ci-fail-on-warning`, `baseline-reset`, `quick-mode-strict`) to the config paths, managed setup targets, commands, risks, rollback, and validation checks that an agent must explain before editing.

Config-foundation remains the owner of schema and resolved config behavior. The planner must not invent schema fields; when a change requires mutation, the agent applies an explicit diff and then runs the planner-listed validations.

<!-- @work-item-id WI-172 -->
`setup:agent` may recommend creating or preserving `phasegate.config.json` as part of first-run setup, but config-foundation still owns the schema and default resolution. Setup orchestration delegates actual config creation to the existing initialization helper rather than maintaining a second config writer.

### WI-175 Config Plan Patch Preview

<!-- @work-item-id WI-175 -->

`config:plan` exposes a read-only `configPatch` preview for intents that touch `phasegate.config.json`. The preview contains `path`, `applicability`, `blockedReason`, `before`, `after`, and JSON pointer operations. Intents that only manage files or require external user-level actions return `configPatch.applicability = "not-applicable"` and explain the reason through managed targets and external actions.

### WI-201 Managed Config Apply Path

<!-- @work-item-id WI-201 -->

Applicable config plans need a PhaseGate-owned apply path for retrofit bootstrap. `config:plan --apply` should apply only the generated `configPatch.after` for intents whose `configPatch.applicability` is `applicable`, preserve dry-run as the review contract, and write rollback evidence before mutating `phasegate.config.json`. Non-applicable or blocked patch previews must refuse apply rather than becoming a generic JSON Patch executor.

### WI-156 L4-006 Config Projection

<!-- @work-item-id WI-156 -->

Preset L4 validator lists include `skill-catalog-drift` so resolved config can thread `L4-006` into validator-system. `toValidatorSystemConfig()` maps the public alias `skill-catalog-drift` to `L4-006` alongside the existing L4 aliases.
## Manual Planning Mode

<!-- @work-item-id WI-191 -->

`planningMode.default` and `planningMode.perPhase` accept `manual` in addition to `interactive` and `embedded-qa`. Manual mode is intended for reviewed retrofit adoption paths where existing plan evidence is accepted through an explicit configuration patch plan.
