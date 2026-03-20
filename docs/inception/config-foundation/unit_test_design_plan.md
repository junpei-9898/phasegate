# ユニットテスト設計計画: config-foundation

> **作成日**: 2026-03-13
> **対応ストーリー**: H04-01, H04-02, H04-03
> **正規ソース**: `docs/product/construction/config-foundation/domain_model.md`
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. スコープ

- **対象Unit**: config-foundation
- **対象レイヤー**: domain層のみ（集約、値オブジェクト、ドメインサービス、ドメイン例外）
- **対象外**: application / infrastructure / presentation（ITテスト設計計画で扱う）

### テスト対象コンポーネント一覧

| 分類 | コンポーネント | ファイル |
|------|-------------|---------|
| 集約ルート | HarnessConfig | `domain/harness-config.ts` |
| 値オブジェクト | ProjectConfig | `domain/value-objects/project-config.ts` |
| 値オブジェクト | Preset | `domain/value-objects/preset.ts` |
| 値オブジェクト | LayersConfig | `domain/value-objects/layers-config.ts` |
| 値オブジェクト | L1Config | `domain/value-objects/l1-config.ts` |
| 値オブジェクト | L2Config | `domain/value-objects/l2-config.ts` |
| 値オブジェクト | L3Config | `domain/value-objects/l3-config.ts` |
| 値オブジェクト | L4Config | `domain/value-objects/l4-config.ts` |
| 値オブジェクト | QuickModeConfig | `domain/value-objects/quick-mode-config.ts` |
| 値オブジェクト | PhaseDependenciesConfig | `domain/value-objects/phase-dependencies-config.ts` |
| 値オブジェクト | CustomPhaseRule | `domain/value-objects/custom-phase-rule.ts` |
| 値オブジェクト | PlanningModeConfig | `domain/value-objects/planning-mode-config.ts` |
| 値オブジェクト | HarnessesConfig | `domain/value-objects/harnesses-config.ts` |
| 値オブジェクト | PathsConfig | `domain/value-objects/paths-config.ts` |
| 値オブジェクト | ReportingConfig | `domain/value-objects/reporting-config.ts` |
| 値オブジェクト | FeatureName | `domain/value-objects/feature-name.ts` |
| 値オブジェクト | FeatureToggle | `domain/value-objects/feature-toggle.ts` |
| ドメインサービス | PresetResolutionService | `domain/services/preset-resolution-service.ts` |
| ドメインサービス | FeatureRegistry | `domain/services/feature-registry.ts` |

---

## 2. テスト対象分析

### 集約

| 集約名 | 不変条件数 | 状態遷移数 | テストケース概算 |
|--------|----------|----------|---------------|
| HarnessConfig | 6（INV-1〜INV-6） | 3（enableFeature, disableFeature, applyPreset） | 28 |

HarnessConfigの主要テスト観点:

- `reconstitute`: 正常再構築、sourceDocument/resolvedDocumentの不整合検出、各不変条件違反時の例外
- `enableFeature`: boolean機能のtrue化、bundleSizeLimitの0→500遷移、未知機能でUnsupportedFeatureError
- `disableFeature`: boolean機能のfalse化、bundleSizeLimitの0化
- `getLayerConfig`: L1〜L4の正常取得、不正レイヤーIDでUnknownLayerError
- `isFeatureEnabled`: boolean機能の判定、bundleSizeLimitが0と正数での判定
- `toResolvedConfig`: HarnessConfigV2 DTOへの変換、内部参照の非公開
- `toSourceDocument`: defensive copy、差分フィールドの省略保持

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| ProjectConfig | 2（name空文字不可、preset検証） | 6 |
| Preset | 1（列挙値制約） | 7 |
| LayersConfig | 1（4レイヤー必須） | 5 |
| L1Config | 1（rules値がerror/warning/offのみ） | 5 |
| L2Config | 1（validators重複不可） | 5 |
| L3Config | 1（coverageThreshold 0-100） | 7 |
| L4Config | 1（schedule空文字不可） | 5 |
| QuickModeConfig | 2（各配列重複不可、入力順保持） | 6 |
| PhaseDependenciesConfig | 1（customRulesのphase空文字不可） | 5 |
| CustomPhaseRule | 2（phase空文字不可、requires重複不可） | 5 |
| PlanningModeConfig | 2（defaultMode列挙値、perPhase値列挙値） | 7 |
| HarnessesConfig | 1（bundleSizeLimit >= 0） | 10 |
| PathsConfig | 2（空文字不可、グローバルパス禁止） | 6 |
| ReportingConfig | 2（format空文字不可、outputDir空文字不可） | 4 |
| FeatureName | 1（availableNamesに含まれること） | 5 |
| FeatureToggle | 1（name/enabledの組合せ） | 5 |

> **注**: `CustomPhaseRule` は `logical_design.md` の正規名称を採用している。`domain_model.md` のクラス図では `CustomRuleEntry` と表記されているが、論理設計の値オブジェクト定義（§2.2.10）で `CustomPhaseRule` に確定している。

### ドメインサービス

| サービス名 | メソッド数 | テストケース概算 |
|-----------|----------|---------------|
| PresetResolutionService | 2（resolve, applyFeatureOverride） | 18 |
| FeatureRegistry | 2（listAvailable, ensureAvailable） | 8 |

PresetResolutionServiceの主要テスト観点:

- `resolve`: objectのdeep merge、arrayの置換（結合しない）、primitiveの上書き、project.name/preset反映、InvalidPresetDefinitionError、ConfigMergeError
- `applyFeatureOverride`: FeatureToggleの適用結果

FeatureRegistryの主要テスト観点:

- `listAvailable`: 重複排除、安定ソート、FeatureName変換
- `ensureAvailable`: 存在する機能名の返却、存在しない機能名でUnsupportedFeatureError（利用可能一覧含む）

---

## 3. テスト方針

### 正常系/異常系のバランス

- 各値オブジェクトのcreateファクトリに対して、正常系1〜2ケース + 異常系1〜2ケースを基本とする
- 集約メソッドは正常系の操作フロー + 各不変条件違反の異常系をカバーする
- ドメインサービスは主要パスの正常系 + エッジケース + エラーケースを網羅する

### 境界値テストの対象

- `L3Config.coverageThreshold`: 0（下限）、100（上限）、-1（下限外）、101（上限外）
- `HarnessesConfig.bundleSizeLimit`: 0（無効境界）、1（有効最小）、-1（不正）
- `Preset`: "minimal"/"standard"/"strict"（有効値）、空文字・未知文字列（無効値）
- `PlanningModeConfig.defaultMode`: "interactive"/"embedded-qa"（有効値）、未知文字列（無効値）

### テストダブル方針

- **ドメイン実体のモック禁止**: 値オブジェクト、集約、PresetResolutionServiceは全て実オブジェクトを使用する
- **FeatureRegistryPort**: FeatureRegistryのテストではin-memory fakeを使用可能（Port境界のため）
- **ConfigSchemaValidatorPort / ConfigRepositoryPort**: domain層テストでは使用しない（Application層の責務）

### テストコード構造

- **AAAパターン**: Arrange / Act / Assert を厳守する
- **実行結果の変数名**: `actual` に統一する
- **テストケース名**: 全て日本語で記述する
- **describe/it構造**: `target` / `describe` / `context` / `it` パターンに従う
- **ファイル名**: kebab-caseで統一する（例: `harness-config.test.ts`）

### テストファイル構成（想定）

```
scripts/harness/__tests__/config-foundation/domain/
├── harness-config.test.ts
├── value-objects/
│   ├── project-config.test.ts
│   ├── preset.test.ts
│   ├── layers-config.test.ts
│   ├── l1-config.test.ts
│   ├── l2-config.test.ts
│   ├── l3-config.test.ts
│   ├── l4-config.test.ts
│   ├── quick-mode-config.test.ts
│   ├── phase-dependencies-config.test.ts
│   ├── custom-phase-rule.test.ts
│   ├── planning-mode-config.test.ts
│   ├── harnesses-config.test.ts
│   ├── paths-config.test.ts
│   ├── reporting-config.test.ts
│   ├── feature-name.test.ts
│   └── feature-toggle.test.ts
└── services/
    ├── preset-resolution-service.test.ts
    └── feature-registry.test.ts
```

---

## 4. QA（不明点・確認事項）

### [Question] Q1: FeatureRegistryPortのin-memory fakeの共有方法

FeatureRegistryのテストで使うin-memory fakeは、ドメインサービステスト内にローカル定義するか、テストヘルパーとして切り出すか。HarnessConfigのenableFeature/disableFeatureテストでも間接的にFeatureRegistryPortが必要になる可能性がある。

**推奨案:** テスト用ヘルパーディレクトリにfakeを配置し、domain層テスト全体で再利用する。

[Answer]
推奨案を採用する。テスト用ヘルパーディレクトリ（`__tests__/config-foundation/helpers/`）にin-memory fakeを配置し、domain層テスト全体で再利用する。

### [Question] Q2: ドメインイベント（FeatureToggled / PresetApplied）の単体テスト必要性

~~ドメインイベントは現時点ではデータ保持のみの構造体であり、ビジネスロジックを持たない。独立したテストファイルが必要か、それとも集約テスト内でイベント生成を検証すれば十分か。~~

**回答**: Wave 1スコープ外のため除外。`domain_model.md` §8で「Wave 1ではドメインイベント基盤は構築しない」と明記されている。ドメインイベント（FeatureToggled / PresetApplied）はテスト対象コンポーネント一覧から除去し、テストケース概算にも含めない。

---

## 5. 前提条件・リスク

### 前提条件

- `domain_model.md` と `logical_design.md` が確定版であること
- テストフレームワークはVitest 3.0.0を使用する
- `target` / `context` ヘルパーが既存のテストヘルパーから利用可能であること
- HarnessError型（harness-error Unit所有）のShared Kernelインターフェースが確定していること

### リスク

| リスク | 影響 | 軽減策 |
|--------|------|--------|
| HarnessConfigの不変条件数が多く、テストケースの組合せが膨大になる可能性 | テスト実装工数の増大 | 不変条件ごとに独立したcontextで整理し、代表的な違反パターンに絞る |
| PresetResolutionServiceのdeep mergeロジックが複雑で、テストデータ準備が大変 | テストの保守コスト増 | Preset定義（minimal/standard/strict）の実JSONを使い、現実的なデータで検証する |
| sourceDocumentとresolvedDocumentの二重管理により、テストのArrangeが冗長になる | テストの可読性低下 | テストヘルパーで有効なsource/resolvedペアを生成するファクトリを用意する |

### テストケース総数概算

| 分類 | ケース数 |
|------|---------|
| 集約（HarnessConfig） | 28 |
| 値オブジェクト（16種） | 91 |
| ドメインサービス（2種） | 26 |
| **合計** | **145** |
