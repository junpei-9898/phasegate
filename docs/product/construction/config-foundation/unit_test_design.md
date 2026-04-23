# ユニットテスト設計: config-foundation

@story-id H04-01
@story-id H04-02
@story-id H04-03
> **作成日**: 2026-03-13
> **対応ストーリー**: H04-01, H04-02, H04-03
> **正規ソース**: `docs/product/construction/config-foundation/domain_model.md`, `docs/product/construction/config-foundation/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`
> **Phase 1計画**: `docs/inception/config-foundation/unit_test_design_plan.md`

---

## 1. 対象ドメインモデル

### 集約

| 集約ルート | ファイル | 説明 |
|-----------|---------|------|
| HarnessConfig | `domain/harness-config.ts` | phasegate.config.json全体の整合性境界 |

### 値オブジェクト

| 値オブジェクト | ファイル | 説明 |
|-------------|---------|------|
| ProjectConfig | `domain/value-objects/project-config.ts` | `{ name, preset }` プロジェクト設定 |
| Preset | `domain/value-objects/preset.ts` | `"minimal" \| "standard" \| "strict"` |
| LayersConfig | `domain/value-objects/layers-config.ts` | `{ L1, L2, L3, L4 }` 4層設定 |
| L1Config | `domain/value-objects/l1-config.ts` | `{ enabled, rules }` |
| L2Config | `domain/value-objects/l2-config.ts` | `{ enabled, validators }` |
| L3Config | `domain/value-objects/l3-config.ts` | `{ enabled, validators, coverageThreshold }` |
| L4Config | `domain/value-objects/l4-config.ts` | `{ enabled, validators, schedule }` |
| QuickModeConfig | `domain/value-objects/quick-mode-config.ts` | `{ allowedCategories, maintainedLayers, relaxedGates }` |
| PhaseDependenciesConfig | `domain/value-objects/phase-dependencies-config.ts` | `{ preset, override, customRules }` |
| CustomPhaseRule | `domain/value-objects/custom-phase-rule.ts` | `{ phase, requires }` |
| PlanningModeConfig | `domain/value-objects/planning-mode-config.ts` | `{ defaultMode, perPhase }` |
| HarnessesConfig | `domain/value-objects/harnesses-config.ts` | `{ agentLessonCollection, cascadeUpdate, bundleSizeLimit, deadCodeGC }` |
| PathsConfig | `domain/value-objects/paths-config.ts` | `{ designDocs, inceptionDocs }` |
| ReportingConfig | `domain/value-objects/reporting-config.ts` | `{ format, outputDir }` |
| FeatureName | `domain/value-objects/feature-name.ts` | 機能名文字列 |
| FeatureToggle | `domain/value-objects/feature-toggle.ts` | `{ name, enabled }` |

### ドメインサービス

| サービス | ファイル | 説明 |
|---------|---------|------|
| PresetResolutionService | `domain/services/preset-resolution-service.ts` | Preset展開 + deep merge |
| FeatureRegistry | `domain/services/feature-registry.ts` | 機能名一覧提供（ACL） |

---

## 2. テストファイル構成

```
scripts/harness/__tests__/config-foundation/
├── helpers/
│   ├── in-memory-feature-registry-port.ts
│   └── harness-config-fixture.ts
├── domain/
│   ├── harness-config.test.ts
│   ├── value-objects/
│   │   ├── project-config.test.ts
│   │   ├── preset.test.ts
│   │   ├── layers-config.test.ts
│   │   ├── l1-config.test.ts
│   │   ├── l2-config.test.ts
│   │   ├── l3-config.test.ts
│   │   ├── l4-config.test.ts
│   │   ├── quick-mode-config.test.ts
│   │   ├── phase-dependencies-config.test.ts
│   │   ├── custom-phase-rule.test.ts
│   │   ├── planning-mode-config.test.ts
│   │   ├── harnesses-config.test.ts
│   │   ├── paths-config.test.ts
│   │   ├── reporting-config.test.ts
│   │   ├── feature-name.test.ts
│   │   └── feature-toggle.test.ts
│   └── services/
│       ├── preset-resolution-service.test.ts
│       └── feature-registry.test.ts
```

### ヘルパー設計

| ヘルパー | 説明 |
|---------|------|
| `in-memory-feature-registry-port.ts` | `FeatureRegistryPort` のin-memory fake実装。`listAvailable()` に返す文字列配列をコンストラクタで注入する。domain層テスト全体で再利用する |
| `harness-config-fixture.ts` | 有効な `sourceDocument` / `resolvedDocument` のペアを生成するファクトリ。Preset別（minimal/standard/strict）のバリエーションを提供する |

---

## 3. 集約テストケース

### HarnessConfig

#### 不変条件テスト

| ケースID | テストケース名（日本語） | 不変条件 | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-001 | sourceDocumentとresolvedDocumentのpreset値が不一致の場合、再構築に失敗する | INV-2 | sourceDocument.project.preset="minimal", resolvedDocument.project.preset="strict" | `ConfigValidationError`（L1-001） |
| UT-CF-002 | resolvedDocumentのharnesses.bundleSizeLimitが負値の場合、再構築に失敗する | INV-4 | bundleSizeLimit=-1 | `InvalidHarnessesConfigError`（L1-003） |
| UT-CF-003 | phaseDependenciesは構造のみ検証し、意味論エラーは発生しない | INV-6 | customRules内にphase-dependency-modelで無効な依存を含む | 正常に再構築される |
| UT-CF-004 | planningModeは構造のみ検証し、意味論エラーは発生しない | INV-6 | perPhaseに実在しないフェーズ名を含む | 正常に再構築される |
| UT-CF-005 | enableFeatureで存在しない機能名を指定した場合、エラーになる | INV-5 | FeatureName("unknownFeature") | `UnsupportedFeatureError`（L1-004） |
| UT-CF-006 | disableFeatureで存在しない機能名を指定した場合、エラーになる | INV-5 | FeatureName("unknownFeature") | `UnsupportedFeatureError`（L1-004） |

#### 生成テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-007 | 有効なsourceDocumentとresolvedDocumentからHarnessConfigを再構築できる | minimal Preset解決済みドキュメントペア | 各属性が値オブジェクトとして保持されている |
| UT-CF-008 | standard Presetの解決済みドキュメントからHarnessConfigを再構築できる | standard Preset解決済みドキュメントペア | L3が有効、coverageThreshold=90 |
| UT-CF-009 | strict Presetの解決済みドキュメントからHarnessConfigを再構築できる | strict Preset解決済みドキュメントペア | 全レイヤー有効、agentLessonCollection=true |
| UT-CF-010 | pendingEventsを指定しない場合、空配列で初期化される | pendingEvents省略 | pullDomainEvents()が空配列を返す |
| UT-CF-011 | pendingEventsを指定した場合、指定したイベントが保持される | pendingEvents=[FeatureToggled] | pullDomainEvents()が指定イベントを返す |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-012 | boolean機能を有効化すると、sourceDocumentとresolvedDocumentの両方が更新される | `enableFeature` | FeatureName("agentLessonCollection") | harnesses.agentLessonCollection=true（source/resolved両方） |
| UT-CF-013 | cascadeUpdateを有効化すると、sourceDocumentとresolvedDocumentの両方が更新される | `enableFeature` | FeatureName("cascadeUpdate") | harnesses.cascadeUpdate=true（source/resolved両方） |
| UT-CF-014 | deadCodeGCを有効化すると、sourceDocumentとresolvedDocumentの両方が更新される | `enableFeature` | FeatureName("deadCodeGC") | harnesses.deadCodeGC=true（source/resolved両方） |
| UT-CF-015 | bundleSizeLimitが0の場合、有効化すると既定値500に設定される | `enableFeature` | FeatureName("bundleSizeLimit"), 初期値0 | harnesses.bundleSizeLimit=500 |
| UT-CF-016 | bundleSizeLimitが既に正値の場合、有効化しても値は変更されない | `enableFeature` | FeatureName("bundleSizeLimit"), 初期値300 | harnesses.bundleSizeLimit=300（変更なし） |
| UT-CF-017 | boolean機能を無効化するとfalseに変更される | `disableFeature` | FeatureName("agentLessonCollection"), 初期値true | harnesses.agentLessonCollection=false |
| UT-CF-018 | bundleSizeLimitを無効化すると0に変更される | `disableFeature` | FeatureName("bundleSizeLimit"), 初期値500 | harnesses.bundleSizeLimit=0 |
| UT-CF-019 | enableFeature実行後にFeatureToggledイベントがpendingEventsに追加される | `enableFeature` | FeatureName("agentLessonCollection") | pullDomainEvents()にFeatureToggledが含まれる |
| UT-CF-020 | disableFeature実行後にFeatureToggledイベントがpendingEventsに追加される | `disableFeature` | FeatureName("cascadeUpdate") | pullDomainEvents()にFeatureToggledが含まれる |
| UT-CF-021 | L1を指定するとL1Configが返される | `getLayerConfig` | "L1" | L1Configインスタンス |
| UT-CF-022 | L2を指定するとL2Configが返される | `getLayerConfig` | "L2" | L2Configインスタンス |
| UT-CF-023 | L3を指定するとL3Configが返される | `getLayerConfig` | "L3" | L3Configインスタンス |
| UT-CF-024 | L4を指定するとL4Configが返される | `getLayerConfig` | "L4" | L4Configインスタンス |
| UT-CF-025 | 不正なレイヤーIDを指定するとエラーになる | `getLayerConfig` | "L5" | `UnknownLayerError`（L1-006） |
| UT-CF-026 | boolean機能が有効の場合にtrueを返す | `isFeatureEnabled` | FeatureName("agentLessonCollection"), 値=true | true |
| UT-CF-027 | boolean機能が無効の場合にfalseを返す | `isFeatureEnabled` | FeatureName("agentLessonCollection"), 値=false | false |
| UT-CF-028 | bundleSizeLimitが正値の場合にtrueを返す | `isFeatureEnabled` | FeatureName("bundleSizeLimit"), 値=500 | true |
| UT-CF-029 | bundleSizeLimitが0の場合にfalseを返す | `isFeatureEnabled` | FeatureName("bundleSizeLimit"), 値=0 | false |
| UT-CF-030 | 解決済みDTOに変換できる | `toResolvedConfig` | 有効なHarnessConfig | HarnessConfigV2 DTOが返される |
| UT-CF-031 | 変換結果のDTOは内部参照を公開しない | `toResolvedConfig` | 有効なHarnessConfig | 返却DTOの変更が集約に影響しない |
| UT-CF-032 | 永続化用プレーンオブジェクトに変換できる | `toSourceDocument` | 有効なHarnessConfig | HarnessConfigSourceDocumentが返される |
| UT-CF-033 | 変換結果はdefensive copyである | `toSourceDocument` | 有効なHarnessConfig | 返却オブジェクトの変更が集約に影響しない |
| UT-CF-034 | 未設定差分フィールドは省略形のまま保持される | `toSourceDocument` | sourceDocumentにPreset上書き差分のみ設定 | 省略されたフィールドが出力に含まれない |
| UT-CF-035 | pullDomainEventsを呼ぶとpendingEventsが空になる | `pullDomainEvents` | enableFeature実行後 | 1回目はイベントあり、2回目は空配列 |

---

## 4. 値オブジェクトテストケース

### ProjectConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-036 | 有効なプロジェクト名とPresetで生成できる | `{ name: "my-project", preset: "standard" }` | 正常に生成 |
| UT-CF-037 | プロジェクト名が空文字の場合、生成に失敗する | `{ name: "", preset: "standard" }` | エラー |
| UT-CF-038 | 無効なPreset値の場合、生成に失敗する | `{ name: "my-project", preset: "invalid" }` | `InvalidPresetError`（L1-002） |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-039 | 同じname・presetを持つProjectConfigは等しい | 同値のProjectConfig 2つ | `equals()` がtrue |
| UT-CF-040 | 異なるnameを持つProjectConfigは等しくない | nameが異なるProjectConfig | `equals()` がfalse |
| UT-CF-041 | 異なるpresetを持つProjectConfigは等しくない | presetが異なるProjectConfig | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-042 | renameで新しい名前のProjectConfigが返される | `rename` | 新しいname | 新nameを持つ新しいProjectConfig |
| UT-CF-043 | changePresetで新しいPresetのProjectConfigが返される | `changePreset` | 新しいPreset | 新Presetを持つ新しいProjectConfig |

### Preset

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-044 | "minimal"でPresetを生成できる | "minimal" | 正常に生成 |
| UT-CF-045 | "standard"でPresetを生成できる | "standard" | 正常に生成 |
| UT-CF-046 | "strict"でPresetを生成できる | "strict" | 正常に生成 |
| UT-CF-047 | 空文字でPresetを生成するとエラーになる | "" | `InvalidPresetError`（L1-002） |
| UT-CF-048 | 未知の文字列でPresetを生成するとエラーになる | "custom" | `InvalidPresetError`（L1-002） |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-049 | 同じ値のPresetは等しい | Preset("minimal") と Preset("minimal") | `equals()` がtrue |
| UT-CF-050 | 異なる値のPresetは等しくない | Preset("minimal") と Preset("strict") | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-051 | minimalの場合にisMinimalがtrueを返す | `isMinimal` | Preset("minimal") | true |
| UT-CF-052 | minimalでない場合にisMinimalがfalseを返す | `isMinimal` | Preset("standard") | false |
| UT-CF-053 | standardの場合にisStandardがtrueを返す | `isStandard` | Preset("standard") | true |
| UT-CF-054 | strictの場合にisStrictがtrueを返す | `isStrict` | Preset("strict") | true |

### LayersConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-055 | 4レイヤー全て指定して生成できる | 有効なL1〜L4の設定 | 正常に生成 |
| UT-CF-056 | L1が欠落している場合、生成に失敗する | L1が未定義 | エラー |
| UT-CF-057 | L2が欠落している場合、生成に失敗する | L2が未定義 | エラー |
| UT-CF-058 | L3が欠落している場合、生成に失敗する | L3が未定義 | エラー |
| UT-CF-059 | L4が欠落している場合、生成に失敗する | L4が未定義 | エラー |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-060 | 全レイヤーが等しいLayersConfigは等しい | 同値のLayersConfig 2つ | `equals()` がtrue |
| UT-CF-061 | いずれかのレイヤーが異なるLayersConfigは等しくない | L3のcoverageThresholdが異なる | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-062 | L1を指定すると対応するL1Configが返される | `get` | "L1" | L1Configインスタンス |
| UT-CF-063 | L4を指定すると対応するL4Configが返される | `get` | "L4" | L4Configインスタンス |

### L1Config

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-064 | 有効なrules値（error/warning/off）で生成できる | `{ enabled: true, rules: { "no-eval": "error", "no-var": "warning" } }` | 正常に生成 |
| UT-CF-065 | rules値にerror/warning/off以外が含まれる場合、生成に失敗する | `{ enabled: true, rules: { "no-eval": "fatal" } }` | エラー |
| UT-CF-066 | rulesが空オブジェクトでも生成できる | `{ enabled: true, rules: {} }` | 正常に生成 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-067 | 同じenabled・rulesのL1Configは等しい | 同値のL1Config 2つ | `equals()` がtrue |
| UT-CF-068 | enabledが異なるL1Configは等しくない | enabled=true と enabled=false | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-069 | enabled=trueの場合にisEnabledがtrueを返す | `isEnabled` | enabled=true | true |
| UT-CF-070 | 存在するルール名のseverityを取得できる | `getRuleSeverity` | 存在するルール名 | 該当severity |
| UT-CF-071 | 存在しないルール名の場合にundefinedを返す | `getRuleSeverity` | 存在しないルール名 | undefined |

### L2Config

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-072 | 重複のないvalidatorsで生成できる | `{ enabled: true, validators: ["v1", "v2"] }` | 正常に生成 |
| UT-CF-073 | validatorsに重複がある場合、生成に失敗する | `{ enabled: true, validators: ["v1", "v1"] }` | エラー |
| UT-CF-074 | validatorsが空配列でも生成できる | `{ enabled: false, validators: [] }` | 正常に生成 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-075 | 同じenabled・validatorsのL2Configは等しい | 同値のL2Config 2つ | `equals()` がtrue |
| UT-CF-076 | validatorsの内容が異なるL2Configは等しくない | validators=["v1"] と validators=["v2"] | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-077 | 含まれるvalidatorIdに対してcontainsがtrueを返す | `contains` | 存在するvalidatorId | true |
| UT-CF-078 | 含まれないvalidatorIdに対してcontainsがfalseを返す | `contains` | 存在しないvalidatorId | false |

### L3Config

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-079 | coverageThresholdが0の場合に生成できる | `{ enabled: true, validators: [], coverageThreshold: 0 }` | 正常に生成 |
| UT-CF-080 | coverageThresholdが100の場合に生成できる | `{ enabled: true, validators: [], coverageThreshold: 100 }` | 正常に生成 |
| UT-CF-081 | coverageThresholdが50の場合に生成できる | `{ enabled: true, validators: [], coverageThreshold: 50 }` | 正常に生成 |
| UT-CF-082 | coverageThresholdが-1の場合、生成に失敗する | `{ enabled: true, validators: [], coverageThreshold: -1 }` | エラー |
| UT-CF-083 | coverageThresholdが101の場合、生成に失敗する | `{ enabled: true, validators: [], coverageThreshold: 101 }` | エラー |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-084 | 同じ属性のL3Configは等しい | 同値のL3Config 2つ | `equals()` がtrue |
| UT-CF-085 | coverageThresholdが異なるL3Configは等しくない | threshold=90 と threshold=95 | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-086 | coverageThresholdが0より大きい場合にhasCoverageGateがtrueを返す | `hasCoverageGate` | coverageThreshold=90 | true |
| UT-CF-087 | coverageThresholdが0の場合にhasCoverageGateがfalseを返す | `hasCoverageGate` | coverageThreshold=0 | false |

### L4Config

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-088 | 有効なscheduleで生成できる | `{ enabled: true, validators: [], schedule: "0 0 * * *" }` | 正常に生成 |
| UT-CF-089 | scheduleが空文字の場合、生成に失敗する | `{ enabled: true, validators: [], schedule: "" }` | エラー |
| UT-CF-090 | validatorsに重複がある場合、生成に失敗する | `{ enabled: true, validators: ["v1", "v1"], schedule: "daily" }` | エラー |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-091 | 同じ属性のL4Configは等しい | 同値のL4Config 2つ | `equals()` がtrue |
| UT-CF-092 | scheduleが異なるL4Configは等しくない | schedule="daily" と schedule="weekly" | `equals()` がfalse |

### QuickModeConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-093 | 重複のない各配列で生成できる | `{ allowedCategories: ["a"], maintainedLayers: ["L1"], relaxedGates: ["g1"] }` | 正常に生成 |
| UT-CF-094 | allowedCategoriesに重複がある場合、生成に失敗する | `{ allowedCategories: ["a", "a"], ... }` | エラー |
| UT-CF-095 | maintainedLayersに重複がある場合、生成に失敗する | `{ ..., maintainedLayers: ["L1", "L1"], ... }` | エラー |
| UT-CF-096 | relaxedGatesに重複がある場合、生成に失敗する | `{ ..., relaxedGates: ["g1", "g1"] }` | エラー |
| UT-CF-097 | 配列の入力順が保持される | `{ allowedCategories: ["c", "a", "b"], ... }` | ["c", "a", "b"]の順 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-098 | 同じ配列内容のQuickModeConfigは等しい | 同値のQuickModeConfig 2つ | `equals()` がtrue |
| UT-CF-099 | allowedCategoriesが異なるQuickModeConfigは等しくない | 異なるallowedCategories | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-100 | 含まれるカテゴリに対してallowsがtrueを返す | `allows` | 存在するcategory | true |
| UT-CF-101 | 含まれないカテゴリに対してallowsがfalseを返す | `allows` | 存在しないcategory | false |
| UT-CF-102 | 含まれるレイヤーに対してmaintainsがtrueを返す | `maintains` | 存在するlayerId | true |
| UT-CF-103 | 含まれないレイヤーに対してmaintainsがfalseを返す | `maintains` | 存在しないlayerId | false |

### PhaseDependenciesConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-104 | 有効なpreset・override・customRulesで生成できる | `{ preset: "default", override: false, customRules: [] }` | 正常に生成 |
| UT-CF-105 | customRulesのphaseが空文字の場合、生成に失敗する | `{ ..., customRules: [{ phase: "", requires: ["a"] }] }` | エラー |
| UT-CF-106 | customRulesを含むcustom presetで生成できる | `{ preset: "custom", override: true, customRules: [{ phase: "design", requires: ["review"] }] }` | 正常に生成 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-107 | 同じ属性のPhaseDependenciesConfigは等しい | 同値 2つ | `equals()` がtrue |
| UT-CF-108 | presetが異なるPhaseDependenciesConfigは等しくない | preset="default" と preset="custom" | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-109 | customRulesが存在する場合にhasCustomRulesがtrueを返す | `hasCustomRules` | customRulesが1件以上 | true |
| UT-CF-110 | customRulesが空の場合にhasCustomRulesがfalseを返す | `hasCustomRules` | customRules=[] | false |

### CustomPhaseRule

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-111 | 有効なphaseとrequiresで生成できる | `{ phase: "design", requires: ["review"] }` | 正常に生成 |
| UT-CF-112 | phaseが空文字の場合、生成に失敗する | `{ phase: "", requires: ["review"] }` | エラー |
| UT-CF-113 | requiresに重複がある場合、生成に失敗する | `{ phase: "design", requires: ["review", "review"] }` | エラー |
| UT-CF-114 | requiresが空配列でも生成できる | `{ phase: "design", requires: [] }` | 正常に生成 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-115 | 同じphase・requiresのCustomPhaseRuleは等しい | 同値 2つ | `equals()` がtrue |
| UT-CF-116 | phaseが異なるCustomPhaseRuleは等しくない | phase="design" と phase="implement" | `equals()` がfalse |

### PlanningModeConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-117 | "interactive"をdefaultModeとして生成できる | `{ default: "interactive", perPhase: {} }` | 正常に生成 |
| UT-CF-118 | "embedded-qa"をdefaultModeとして生成できる | `{ default: "embedded-qa", perPhase: {} }` | 正常に生成 |
| UT-CF-119 | 未知の文字列をdefaultModeとして指定するとエラーになる | `{ default: "unknown", perPhase: {} }` | エラー |
| UT-CF-120 | perPhaseの値に有効な列挙値を指定して生成できる | `{ default: "interactive", perPhase: { design: "embedded-qa" } }` | 正常に生成 |
| UT-CF-121 | perPhaseの値に無効な列挙値を指定するとエラーになる | `{ default: "interactive", perPhase: { design: "invalid" } }` | エラー |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-122 | 同じdefaultMode・perPhaseのPlanningModeConfigは等しい | 同値 2つ | `equals()` がtrue |
| UT-CF-123 | defaultModeが異なるPlanningModeConfigは等しくない | "interactive" と "embedded-qa" | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-124 | perPhaseに定義されたフェーズはその値を返す | `resolveFor` | perPhaseに存在するphase | perPhaseの値 |
| UT-CF-125 | perPhaseに定義されていないフェーズはdefaultModeを返す | `resolveFor` | perPhaseに存在しないphase | defaultModeの値 |

### HarnessesConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-126 | 全機能をfalse/0で生成できる | `{ agentLessonCollection: false, cascadeUpdate: false, bundleSizeLimit: 0, deadCodeGC: false }` | 正常に生成 |
| UT-CF-127 | bundleSizeLimitが正値で生成できる | `{ ..., bundleSizeLimit: 500, ... }` | 正常に生成 |
| UT-CF-128 | bundleSizeLimitが負値の場合、生成に失敗する | `{ ..., bundleSizeLimit: -1, ... }` | `InvalidHarnessesConfigError`（L1-003） |
| UT-CF-129 | 全機能をtrue/正値で生成できる | `{ agentLessonCollection: true, cascadeUpdate: true, bundleSizeLimit: 500, deadCodeGC: true }` | 正常に生成 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-130 | 全属性が同じHarnessesConfigは等しい | 同値 2つ | `equals()` がtrue |
| UT-CF-131 | bundleSizeLimitが異なるHarnessesConfigは等しくない | 0 と 500 | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-132 | boolean機能をenableするとtrueに変更された新インスタンスが返される | `enable` | FeatureName("agentLessonCollection") | agentLessonCollection=trueの新HarnessesConfig |
| UT-CF-133 | bundleSizeLimitが0の状態でenableすると既定値500になる | `enable` | FeatureName("bundleSizeLimit"), 初期値0 | bundleSizeLimit=500 |
| UT-CF-134 | bundleSizeLimitが既に正値の場合にenableしても値は変更されない | `enable` | FeatureName("bundleSizeLimit"), 初期値300 | bundleSizeLimit=300 |
| UT-CF-135 | boolean機能をdisableするとfalseに変更された新インスタンスが返される | `disable` | FeatureName("agentLessonCollection") | agentLessonCollection=falseの新HarnessesConfig |
| UT-CF-136 | bundleSizeLimitをdisableすると0に変更される | `disable` | FeatureName("bundleSizeLimit") | bundleSizeLimit=0 |
| UT-CF-137 | boolean機能が有効の場合にisEnabledがtrueを返す | `isEnabled` | FeatureName("agentLessonCollection"), 値=true | true |
| UT-CF-138 | boolean機能が無効の場合にisEnabledがfalseを返す | `isEnabled` | FeatureName("cascadeUpdate"), 値=false | false |
| UT-CF-139 | bundleSizeLimitが正値の場合にisEnabledがtrueを返す | `isEnabled` | FeatureName("bundleSizeLimit"), 値=500 | true |
| UT-CF-140 | bundleSizeLimitが0の場合にisEnabledがfalseを返す | `isEnabled` | FeatureName("bundleSizeLimit"), 値=0 | false |

### PathsConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-141 | 有効なパスで生成できる | `{ designDocs: "docs/product", inceptionDocs: "docs/inception" }` | 正常に生成 |
| UT-CF-142 | designDocsが空文字の場合、生成に失敗する | `{ designDocs: "", inceptionDocs: "docs/inception" }` | エラー |
| UT-CF-143 | inceptionDocsが空文字の場合、生成に失敗する | `{ designDocs: "docs/product", inceptionDocs: "" }` | エラー |
| UT-CF-144 | designDocsに~を含むグローバルパスを指定するとエラーになる | `{ designDocs: "~/docs", inceptionDocs: "docs/inception" }` | エラー |
| UT-CF-145 | inceptionDocsに$HOMEを含むグローバルパスを指定するとエラーになる | `{ designDocs: "docs/product", inceptionDocs: "$HOME/docs" }` | エラー |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-146 | 同じパスのPathsConfigは等しい | 同値 2つ | `equals()` がtrue |
| UT-CF-147 | designDocsが異なるPathsConfigは等しくない | 異なるdesignDocs | `equals()` がfalse |

### ReportingConfig

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-148 | 有効なformatとoutputDirで生成できる | `{ format: "json", outputDir: "reports" }` | 正常に生成 |
| UT-CF-149 | formatが空文字の場合、生成に失敗する | `{ format: "", outputDir: "reports" }` | エラー |
| UT-CF-150 | outputDirが空文字の場合、生成に失敗する | `{ format: "json", outputDir: "" }` | エラー |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-151 | 同じformat・outputDirのReportingConfigは等しい | 同値 2つ | `equals()` がtrue |
| UT-CF-152 | formatが異なるReportingConfigは等しくない | format="json" と format="html" | `equals()` がfalse |

### FeatureName

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-153 | 利用可能一覧に含まれる名前で生成できる | "agentLessonCollection", availableNames=["agentLessonCollection", ...] | 正常に生成 |
| UT-CF-154 | 利用可能一覧に含まれない名前を指定するとエラーになる | "unknownFeature", availableNames=["agentLessonCollection", ...] | `UnsupportedFeatureError`（L1-004） |
| UT-CF-155 | 全4機能名で生成できる | "agentLessonCollection"/"cascadeUpdate"/"bundleSizeLimit"/"deadCodeGC" | 正常に生成 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-156 | 同じ値のFeatureNameは等しい | FeatureName("agentLessonCollection") 2つ | `equals()` がtrue |
| UT-CF-157 | 異なる値のFeatureNameは等しくない | FeatureName("agentLessonCollection") と FeatureName("cascadeUpdate") | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-158 | toStringで機能名文字列が返される | `toString` | FeatureName("bundleSizeLimit") | "bundleSizeLimit" |

### FeatureToggle

#### 制約テスト

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-159 | 有効なFeatureNameとenabledで生成できる | FeatureName("agentLessonCollection"), enabled=true | 正常に生成 |
| UT-CF-160 | enabled=falseで生成できる | FeatureName("cascadeUpdate"), enabled=false | 正常に生成 |

#### 等値性テスト

| ケースID | テストケース名（日本語） | 比較対象 | 期待結果 |
|----------|----------------------|---------|---------|
| UT-CF-161 | 同じname・enabledのFeatureToggleは等しい | 同値 2つ | `equals()` がtrue |
| UT-CF-162 | enabledが異なるFeatureToggleは等しくない | enabled=true と enabled=false | `equals()` がfalse |
| UT-CF-163 | nameが異なるFeatureToggleは等しくない | 異なるFeatureName | `equals()` がfalse |

#### 振る舞いテスト

| ケースID | テストケース名（日本語） | メソッド | 入力 | 期待結果 |
|----------|----------------------|---------|------|---------|
| UT-CF-164 | toggleでenabledが反転した新インスタンスが返される | `toggle` | enabled=false → nextState=true | enabled=trueの新FeatureToggle |
| UT-CF-165 | toggleで同じ状態を指定しても新インスタンスが返される | `toggle` | enabled=true → nextState=true | enabled=trueの新FeatureToggle |

---

## 5. ドメインサービステストケース

### PresetResolutionService

#### resolve

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-166 | minimal Presetのベース定義にsourceDocumentが上書きされた解決済みドキュメントが返される | minimal presetDefinition + sourceDocument | preset展開 + 上書き適用された resolvedDocument |
| UT-CF-167 | standard Presetの解決でL3が有効、coverageThreshold=90になる | standard presetDefinition + 上書きなし | L3.enabled=true, coverageThreshold=90 |
| UT-CF-168 | strict Presetの解決で全レイヤーが有効になる | strict presetDefinition + 上書きなし | L1〜L4全てenabled=true |
| UT-CF-169 | objectフィールドはdeep mergeされる | presetのlayers.L3 + sourceDocumentのlayers.L3上書き | presetのベース + sourceDocumentの差分が統合 |
| UT-CF-170 | arrayフィールドは結合ではなく置換される | presetのvalidators=["a","b"] + sourceDocumentのvalidators=["c"] | validators=["c"] |
| UT-CF-171 | primitiveフィールドはsourceDocument側で上書きされる | presetのcoverageThreshold=90 + sourceDocumentのcoverageThreshold=95 | coverageThreshold=95 |
| UT-CF-172 | project.nameとproject.presetが解決済みドキュメントに反映される | sourceDocument.project.name="my-project" | resolvedDocument.project.name="my-project" |
| UT-CF-173 | 無効なPreset定義の場合にエラーになる | 必要セクションが欠落したpresetDefinition | `InvalidPresetDefinitionError`（L1-007） |
| UT-CF-174 | deep merge中に構造不整合が発生した場合にエラーになる | objectとprimitiveが混在する不整合 | `ConfigMergeError`（L1-008） |
| UT-CF-175 | standard上でcoverageThresholdを95に個別上書きできる | standard preset + coverageThreshold=95の上書き | coverageThreshold=95 |
| UT-CF-176 | sourceDocumentに差分がない場合、Preset定義がそのまま解決済みドキュメントになる | 最小限のsourceDocument（project.name/presetのみ） | preset定義の値がそのまま使われる |

#### applyFeatureOverride

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-177 | boolean機能のFeatureToggle(true)を適用すると該当フィールドがtrueになる | resolvedDocument + FeatureToggle(agentLessonCollection, true) | harnesses.agentLessonCollection=true |
| UT-CF-178 | boolean機能のFeatureToggle(false)を適用すると該当フィールドがfalseになる | resolvedDocument + FeatureToggle(cascadeUpdate, false) | harnesses.cascadeUpdate=false |
| UT-CF-179 | bundleSizeLimitのFeatureToggle(true)を適用すると既定値500が設定される | resolvedDocument(bundleSizeLimit=0) + FeatureToggle(bundleSizeLimit, true) | harnesses.bundleSizeLimit=500 |
| UT-CF-180 | bundleSizeLimitのFeatureToggle(false)を適用すると0が設定される | resolvedDocument(bundleSizeLimit=500) + FeatureToggle(bundleSizeLimit, false) | harnesses.bundleSizeLimit=0 |
| UT-CF-181 | 他のharnesses属性は変更されない | resolvedDocument + FeatureToggle(agentLessonCollection, true) | 他の属性が元の値を維持する |

### FeatureRegistry

#### listAvailable

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-182 | FeatureRegistryPortから取得した文字列がFeatureNameに変換される | source: ["agentLessonCollection", "cascadeUpdate", "bundleSizeLimit", "deadCodeGC"] | 4つのFeatureNameの配列 |
| UT-CF-183 | 重複する文字列が排除される | source: ["agentLessonCollection", "agentLessonCollection", "cascadeUpdate"] | 2つのFeatureNameの配列 |
| UT-CF-184 | 結果が安定ソートされる | source: ["deadCodeGC", "agentLessonCollection", "bundleSizeLimit"] | ソート済みのFeatureName配列 |
| UT-CF-185 | 空の一覧が返された場合に空配列になる | source: [] | 空配列 |

#### ensureAvailable

| ケースID | テストケース名（日本語） | 入力 | 期待結果 |
|----------|----------------------|------|---------|
| UT-CF-186 | 存在する機能名の場合にFeatureNameが返される | "agentLessonCollection", source: [4機能] | FeatureName("agentLessonCollection") |
| UT-CF-187 | 存在しない機能名の場合にエラーになる | "unknownFeature", source: [4機能] | `UnsupportedFeatureError`（L1-004） |
| UT-CF-188 | エラーメッセージに利用可能な機能一覧が含まれる | "unknownFeature", source: [4機能] | エラーメッセージに全4機能名が含まれる |
| UT-CF-189 | 空文字の機能名の場合にエラーになる | "", source: [4機能] | `UnsupportedFeatureError`（L1-004） |

---

## 6. 境界値・異常系

| ケースID | テストケース名（日本語） | 対象 | 入力 | 期待結果 |
|----------|----------------------|------|------|---------|
| UT-CF-190 | coverageThresholdの下限値0で生成できる | L3Config | coverageThreshold=0 | 正常に生成 |
| UT-CF-191 | coverageThresholdの上限値100で生成できる | L3Config | coverageThreshold=100 | 正常に生成 |
| UT-CF-192 | coverageThresholdの下限外-1で生成に失敗する | L3Config | coverageThreshold=-1 | エラー |
| UT-CF-193 | coverageThresholdの上限外101で生成に失敗する | L3Config | coverageThreshold=101 | エラー |
| UT-CF-194 | bundleSizeLimitの無効境界値0で生成できる | HarnessesConfig | bundleSizeLimit=0 | 正常に生成 |
| UT-CF-195 | bundleSizeLimitの有効最小値1で生成できる | HarnessesConfig | bundleSizeLimit=1 | 正常に生成 |
| UT-CF-196 | bundleSizeLimitの不正値-1で生成に失敗する | HarnessesConfig | bundleSizeLimit=-1 | `InvalidHarnessesConfigError`（L1-003） |
| UT-CF-197 | 全機能がデフォルト無効値で生成される（デフォルト無効原則） | HarnessesConfig | 全機能=false/0 | 正常に生成、全isEnabled=false |
| UT-CF-198 | 不正なレイヤーID "L0" を指定するとエラーになる | HarnessConfig.getLayerConfig | "L0" | `UnknownLayerError`（L1-006） |
| UT-CF-199 | 不正なレイヤーID "L5" を指定するとエラーになる | HarnessConfig.getLayerConfig | "L5" | `UnknownLayerError`（L1-006） |
| UT-CF-200 | 空文字のレイヤーIDを指定するとエラーになる | HarnessConfig.getLayerConfig | "" | `UnknownLayerError`（L1-006） |
| UT-CF-201 | coverageThresholdが小数値の場合に生成に失敗する | L3Config | coverageThreshold=90.5 | エラー（整数制約を設ける場合）もしくは正常（小数許容の場合） |

---

## 7. テスト環境設定

### テストフレームワーク

- **Vitest 3.0.0**: 既存の `scripts/harness/__tests__/vitest.config.ts` を共有する
- `target` / `describe` / `context` / `it` ヘルパーを使用する

### テストダブル方針

| 対象 | 方針 |
|------|------|
| 値オブジェクト | モック禁止。実オブジェクトを使用する |
| 集約（HarnessConfig） | モック禁止。実オブジェクトを使用する |
| PresetResolutionService | モック禁止。実オブジェクトを使用する |
| FeatureRegistry | モック禁止。実オブジェクトを使用する |
| FeatureRegistryPort | in-memory fakeを使用する（`helpers/in-memory-feature-registry-port.ts`） |
| ConfigSchemaValidatorPort | domain層テストでは使用しない（Application層の責務） |
| ConfigRepositoryPort | domain層テストでは使用しない（Application層の責務） |

### ヘルパー詳細

#### in-memory-feature-registry-port.ts

- `FeatureRegistryPort` インターフェースを実装するfakeクラス
- コンストラクタで `string[]` を受け取り、`listAvailable()` でそのまま返す
- デフォルトでは `["agentLessonCollection", "cascadeUpdate", "bundleSizeLimit", "deadCodeGC"]` を返すファクトリメソッドを提供する

#### harness-config-fixture.ts

- Preset別（minimal/standard/strict）の有効な `sourceDocument` / `resolvedDocument` ペアを生成するファクトリ
- テスト間で冗長な Arrange を排除し、可読性を向上させる
- `createMinimalFixture()` / `createStandardFixture()` / `createStrictFixture()` メソッドを提供する
- 各フィクスチャは `HarnessConfig.reconstitute()` に直接渡せる形式とする

### 既知の受容リスク

| ID | 対象 | 内容 | 判定 |
|----|------|------|------|
| R-UT-CF-1 | L1-005 FeatureActivationRuleError | logical_design.md にエラー型が宣言されているが、`enableFeature()` の処理フローに当該エラーを発生させるドメインルール（状態遷移制約・相互排他ルール等）が未定義であり、現設計では到達不能である。既存の検証はすべて `UnsupportedFeatureError`（L1-004）で処理される。**設計ギャップであり、テストギャップではない。** 将来ドメインルールが追加された時点でテストケースを追加する。 | 受容 |

### テストケース総数

| 分類 | ケース数 |
|------|---------|
| 集約（HarnessConfig） | 35 |
| 値オブジェクト（16種） | 95 |
| ドメインサービス（2種） | 24 |
| 境界値・異常系 | 12 |
| **合計** | **166** |

> **注**: 境界値・異常系のケースの一部は値オブジェクト・集約テストケースと重複するが、回帰テストの観点から独立セクションとして明示する。
