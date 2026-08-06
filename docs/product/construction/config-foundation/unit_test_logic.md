# ユニットテストロジック設計: config-foundation

@story-id H04-01
@story-id H04-02
@story-id H04-03
> **作成日**: 2026-03-14
> **参照元**: `domain_model.md` / `unit_test_design.md` / `coverage_report.md`
> **前提アーキテクチャ**: ヘキサゴナル + DDD（domain → port → usecase → controller）
> **テスト規約反映**: 日本語ケース名 / AAA / `actual` 命名 / `target > describe > context > it` / ドメインモック禁止

## 1. テストファイル構成

| ファイルパス | 対象モデル | ケース数 |
|---|---|---:|
> **パス欄について**: 設計時点の配置から実装が移動したファイルがある（WI-365 で実測して更新）。
> 下表は **現行の実配置**を示す。設計ケース数は当初計画値のままで、実装数との差分は §6 に記録する。

| ファイルパス | 対象モデル | 設計ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/config-foundation/harness-config.test.ts` | HarnessConfig | 38 |
| `scripts/harness/__tests__/config-foundation/domain/value-objects/project-config.test.ts` | ProjectConfig | 8 |
| `scripts/harness/__tests__/config-foundation/domain/value-objects/preset.test.ts` | Preset | 11 |
| `scripts/harness/__tests__/config-foundation/domain/value-objects/layers-config.test.ts` | LayersConfig | 9 |
| `scripts/harness/__tests__/config-foundation/domain/value-objects/l1-config.test.ts` | L1Config | 8 |
| `scripts/harness/__tests__/config-foundation/domain/value-objects/l2-config.test.ts` | L2Config | 7 |
| `scripts/harness/__tests__/config-foundation/domain/value-objects/l3-config.test.ts` | L3Config | 14 |
| `scripts/harness/__tests__/config-foundation/domain/value-objects/l4-config.test.ts` | L4Config | 5 |
| `scripts/harness/__tests__/unit/config-foundation/quick-mode-config.test.ts` | QuickModeConfig | 11 |
| `scripts/harness/__tests__/unit/config-foundation/phase-dependencies-config.test.ts` | PhaseDependenciesConfig | 7 |
| `scripts/harness/__tests__/unit/config-foundation/custom-phase-rule.test.ts` | CustomPhaseRule | 6 |
| `scripts/harness/__tests__/unit/config-foundation/planning-mode-config.test.ts` | PlanningModeConfig | 9 |
| `scripts/harness/__tests__/unit/config-foundation/harnesses-config.test.ts` | HarnessesConfig | 19 |
| `scripts/harness/__tests__/unit/config-foundation/paths-config.test.ts` | PathsConfig | 7 |
| `scripts/harness/__tests__/unit/config-foundation/reporting-config.test.ts` | ReportingConfig | 5 |
| `scripts/harness/__tests__/unit/config-foundation/feature-name.test.ts` | FeatureName | 6 |
| `scripts/harness/__tests__/unit/config-foundation/feature-toggle.test.ts` | FeatureToggle | 7 |
| `scripts/harness/__tests__/unit/config-foundation/preset-resolution-service.test.ts` | PresetResolutionService | 16 |
| `scripts/harness/__tests__/unit/config-foundation/feature-registry.test.ts` | FeatureRegistry | 8 |
| **合計** |  | **201** |

## 2. 共通ヘルパー・ファクトリ

### 2.1 共通インポート方針

- `target` と `context` は `describe` のエイリアスとして import する。
- すべての `it()` 名は日本語で記述する。
- Act フェーズは必ず `const actual = ...` または `const actual = () => ...` に統一する。
- `beforeEach` にテスト固有 Arrange を隠さず、各ケースの Arrange に必要な差分だけを書く。

### 2.2 推奨ヘルパー

| ヘルパー名 | 用途 | 擬似コード |
|---|---|---|
| `createMinimalFixture()` | minimal preset の `sourceDocument` / `resolvedDocument` ペア生成 | `return { sourceDocument, resolvedDocument }` |
| `createStandardFixture()` | standard preset の有効ドキュメント生成 | `coverageThreshold=90` を含む resolved を返す |
| `createStrictFixture()` | strict preset の有効ドキュメント生成 | `L1-L4 enabled=true` を含む resolved を返す |
| `createFeatureRegistryPort(names?)` | `FeatureRegistryPort` の in-memory fake | `listAvailable()` が `names` を返す |
| `createFeatureRegistry(names?)` | 実 `FeatureRegistry` 生成 | fake port を注入して `new FeatureRegistry(port)` |
| `createFeatureName(name, names?)` | 利用可能一覧付き `FeatureName` 生成 | `FeatureName.create(name, names)` 相当 |
| `createFeatureToggle(name, enabled)` | `FeatureToggle` 生成 | 実 `FeatureName` を使って生成 |
| `reconstituteHarnessConfig(fixture, pendingEvents?)` | `HarnessConfig` 再構築の定型化 | `HarnessConfig.reconstitute({ sourceDocument, resolvedDocument, pendingEvents })` |
| `expectDomainError(actual, ErrorType, code)` | エラー型とコードの確認 | `expect(actual).toThrowError(ErrorType)` とメッセージ内コード確認 |

### 2.3 共通 Arrange の原則

- 値オブジェクトは必ず実オブジェクトで組み立てる。
- `HarnessConfig` の Arrange は fixture から開始し、対象ケースの差分だけ上書きする。
- エラー系は `const actual = () => ...` を使い、Assert で型とコードを確認する。
- defensive copy 系は `actual` 取得後に返却オブジェクトを書き換え、再度集約や値オブジェクトを読んで不変性を確認する。

### 2.4 共通 Vitest 骨格

```ts
target('HarnessConfig.reconstitute', () => {
  describe('再構築する', () => {
    context('sourceDocumentとresolvedDocumentのpreset値が不一致の場合', () => {
      it('再構築に失敗する', () => {
        // Arrange
        // Act
        const actual = () => HarnessConfig.reconstitute(...);
        // Assert
      });
    });
  });
});
```

## 3. テストケース詳細ロジック

### 3.1 `domain/harness-config.test.ts`

- `target('HarnessConfig')`
- `describe('再構築する')` に `UT-CF-001` から `UT-CF-011`
- `describe('機能を切り替える')` に `UT-CF-012` から `UT-CF-020`
- `describe('レイヤーと機能状態を参照する')` に `UT-CF-021` から `UT-CF-029`
- `describe('DTOとイベントを扱う')` に `UT-CF-030` から `UT-CF-035`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-001 | `再構築する / sourceDocumentとresolvedDocumentのpreset値が不一致の場合 / 再構築に失敗する` | minimal fixture を生成し、`resolvedDocument.project.preset` だけ `strict` に差し替える。 | `const actual = () => reconstituteHarnessConfig(fixture)` | `ConfigValidationError` を送出し、メッセージに `L1-001` が含まれることを確認する。 |
| UT-CF-002 | `再構築する / resolvedDocumentのbundleSizeLimitが負値の場合 / 再構築に失敗する` | minimal fixture の `resolvedDocument.harnesses.bundleSizeLimit` を `-1` に差し替える。 | `const actual = () => reconstituteHarnessConfig(fixture)` | `InvalidHarnessesConfigError` を送出し、コード `L1-003` を確認する。 |
| UT-CF-003 | `再構築する / phaseDependenciesに意味論上の不正依存が含まれる場合 / 構造検証だけで再構築できる` | fixture の `resolvedDocument.phaseDependencies.customRules` に phase-dependency-model では無効だが構造は正しい値を入れる。 | `const actual = reconstituteHarnessConfig(fixture)` | 例外が発生しないこと、`actual.toResolvedConfig().phaseDependencies.customRules` に入力値が保持されることを確認する。 |
| UT-CF-004 | `再構築する / planningMode.perPhaseに実在しないフェーズ名がある場合 / 構造検証だけで再構築できる` | fixture の `resolvedDocument.planningMode.perPhase.unknownPhase` に有効モードを設定する。 | `const actual = reconstituteHarnessConfig(fixture)` | 例外が発生しないこと、`actual.toResolvedConfig().planningMode.perPhase.unknownPhase` が残ることを確認する。 |
| UT-CF-005 | `再構築した集約で機能を有効化する / 存在しない機能名を指定した場合 / エラーになる` | fixture から集約を生成し、`unknownFeature` を許可しない `FeatureName` を別途生成する。 | `const actual = () => harnessConfig.enableFeature(featureName)` | `UnsupportedFeatureError` を送出し、コード `L1-004` を確認する。 |
| UT-CF-006 | `再構築した集約で機能を無効化する / 存在しない機能名を指定した場合 / エラーになる` | fixture から集約を生成し、`unknownFeature` を許可しない `FeatureName` を別途生成する。 | `const actual = () => harnessConfig.disableFeature(featureName)` | `UnsupportedFeatureError` を送出し、コード `L1-004` を確認する。 |
| UT-CF-007 | `再構築する / minimal fixtureを渡した場合 / 値オブジェクトを保持した集約を返す` | `createMinimalFixture()` をそのまま使う。 | `const actual = reconstituteHarnessConfig(fixture)` | `project` が `ProjectConfig`、`layers.L1-L4` が各値オブジェクト、`harnesses` が `HarnessesConfig` として保持されることを確認する。 |
| UT-CF-008 | `再構築する / standard fixtureを渡した場合 / standardの設定を保持した集約を返す` | `createStandardFixture()` を使う。 | `const actual = reconstituteHarnessConfig(fixture)` | `actual.getLayerConfig('L3')` が有効であり、`actual.toResolvedConfig().layers.L3.coverageThreshold === 90` を確認する。 |
| UT-CF-009 | `再構築する / strict fixtureを渡した場合 / strictの設定を保持した集約を返す` | `createStrictFixture()` を使う。 | `const actual = reconstituteHarnessConfig(fixture)` | `L1-L4` がすべて有効で、`actual.isFeatureEnabled(agentLessonCollection)` が `true` であることを確認する。 |
| UT-CF-010 | `再構築する / pendingEventsを省略した場合 / 空配列で初期化される` | valid fixture を用意し、`pendingEvents` を渡さない。 | `const actual = reconstituteHarnessConfig(fixture)` | `actual.pullDomainEvents()` が `[]` を返すことを確認する。 |
| UT-CF-011 | `再構築する / pendingEventsを指定した場合 / 指定したイベントを保持する` | valid fixture と `FeatureToggled` イベント配列を用意する。 | `const actual = reconstituteHarnessConfig(fixture, pendingEvents)` | `actual.pullDomainEvents()` が渡したイベントと等価であることを確認する。 |
| UT-CF-012 | `機能を切り替える / agentLessonCollectionを有効化する場合 / sourceとresolvedの両方が更新される` | `agentLessonCollection=false` の fixture から集約を生成し、`FeatureName('agentLessonCollection')` を用意する。 | `const actual = harnessConfig.enableFeature(featureName)` | `harnessConfig.toSourceDocument().harnesses.agentLessonCollection` と `harnessConfig.toResolvedConfig().harnesses.agentLessonCollection` がともに `true` であることを確認する。 |
| UT-CF-013 | `機能を切り替える / cascadeUpdateを有効化する場合 / sourceとresolvedの両方が更新される` | `cascadeUpdate=false` の fixture と `FeatureName('cascadeUpdate')` を用意する。 | `const actual = harnessConfig.enableFeature(featureName)` | source と resolved の `cascadeUpdate` が `true` に更新されることを確認する。 |
| UT-CF-014 | `機能を切り替える / deadCodeGCを有効化する場合 / sourceとresolvedの両方が更新される` | `deadCodeGC=false` の fixture と `FeatureName('deadCodeGC')` を用意する。 | `const actual = harnessConfig.enableFeature(featureName)` | source と resolved の `deadCodeGC` が `true` に更新されることを確認する。 |
| UT-CF-015 | `機能を切り替える / bundleSizeLimitが0の状態で有効化する場合 / 既定値500になる` | `bundleSizeLimit=0` の fixture と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessConfig.enableFeature(featureName)` | `toSourceDocument()` と `toResolvedConfig()` の両方で `bundleSizeLimit === 500` を確認する。 |
| UT-CF-016 | `機能を切り替える / bundleSizeLimitが既に正値の場合 / 値を維持する` | `bundleSizeLimit=300` の fixture と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessConfig.enableFeature(featureName)` | 両 DTO の `bundleSizeLimit` が `300` のままであることを確認する。 |
| UT-CF-017 | `機能を切り替える / boolean機能を無効化する場合 / falseに更新される` | `agentLessonCollection=true` の fixture と `FeatureName('agentLessonCollection')` を用意する。 | `const actual = harnessConfig.disableFeature(featureName)` | source と resolved の `agentLessonCollection` が `false` に更新されることを確認する。 |
| UT-CF-018 | `機能を切り替える / bundleSizeLimitを無効化する場合 / 0に更新される` | `bundleSizeLimit=500` の fixture と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessConfig.disableFeature(featureName)` | source と resolved の `bundleSizeLimit` が `0` になることを確認する。 |
| UT-CF-019 | `機能を切り替える / enableFeature実行後 / FeatureToggledイベントが追加される` | 有効な集約と `FeatureName('agentLessonCollection')` を用意する。 | `const actual = harnessConfig.enableFeature(featureName)` | `harnessConfig.pullDomainEvents()` に `featureName` と `enabled=true` を持つ `FeatureToggled` が 1 件含まれることを確認する。 |
| UT-CF-020 | `機能を切り替える / disableFeature実行後 / FeatureToggledイベントが追加される` | `cascadeUpdate=true` の集約と `FeatureName('cascadeUpdate')` を用意する。 | `const actual = harnessConfig.disableFeature(featureName)` | `pullDomainEvents()` に `enabled=false` の `FeatureToggled` が 1 件追加されることを確認する。 |
| UT-CF-021 | `レイヤーと機能状態を参照する / L1を指定した場合 / L1Configを返す` | valid fixture から集約を生成する。 | `const actual = harnessConfig.getLayerConfig('L1')` | `actual` が `L1Config` であり、resolved DTO の `layers.L1` と等価であることを確認する。 |
| UT-CF-022 | `レイヤーと機能状態を参照する / L2を指定した場合 / L2Configを返す` | valid fixture から集約を生成する。 | `const actual = harnessConfig.getLayerConfig('L2')` | `actual` が `L2Config` であることを確認する。 |
| UT-CF-023 | `レイヤーと機能状態を参照する / L3を指定した場合 / L3Configを返す` | standard fixture を用意する。 | `const actual = harnessConfig.getLayerConfig('L3')` | `actual` が `L3Config` であり、`coverageThreshold` が期待値を持つことを確認する。 |
| UT-CF-024 | `レイヤーと機能状態を参照する / L4を指定した場合 / L4Configを返す` | strict fixture を用意する。 | `const actual = harnessConfig.getLayerConfig('L4')` | `actual` が `L4Config` であることを確認する。 |
| UT-CF-025 | `レイヤーと機能状態を参照する / 不正なレイヤーIDを指定した場合 / エラーになる` | valid fixture から集約を生成する。 | `const actual = () => harnessConfig.getLayerConfig('L5')` | `UnknownLayerError` を送出し、コード `L1-006` を確認する。 |
| UT-CF-026 | `レイヤーと機能状態を参照する / boolean機能が有効の場合 / trueを返す` | `agentLessonCollection=true` の集約と対応する `FeatureName` を用意する。 | `const actual = harnessConfig.isFeatureEnabled(featureName)` | `actual === true` を確認する。 |
| UT-CF-027 | `レイヤーと機能状態を参照する / boolean機能が無効の場合 / falseを返す` | `agentLessonCollection=false` の集約と `FeatureName` を用意する。 | `const actual = harnessConfig.isFeatureEnabled(featureName)` | `actual === false` を確認する。 |
| UT-CF-028 | `レイヤーと機能状態を参照する / bundleSizeLimitが正値の場合 / trueを返す` | `bundleSizeLimit=500` の集約と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessConfig.isFeatureEnabled(featureName)` | `actual === true` を確認する。 |
| UT-CF-029 | `レイヤーと機能状態を参照する / bundleSizeLimitが0の場合 / falseを返す` | `bundleSizeLimit=0` の集約と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessConfig.isFeatureEnabled(featureName)` | `actual === false` を確認する。 |
| UT-CF-030 | `DTOとイベントを扱う / 解決済みDTOへ変換する場合 / resolved DTOを返す` | valid fixture から集約を生成する。 | `const actual = harnessConfig.toResolvedConfig()` | `actual` が resolvedDocument と同じ値を持つプレーン DTO であることを確認する。 |
| UT-CF-031 | `DTOとイベントを扱う / 解決済みDTOへ変換した後に返却値を書き換える場合 / 集約内部に影響しない` | 集約を生成し、`actual` を取得できる状態にする。 | `const actual = harnessConfig.toResolvedConfig()` | `actual.harnesses.bundleSizeLimit = 999` などを書き換えた後でも、再取得した `harnessConfig.toResolvedConfig()` が元の値を維持することを確認する。 |
| UT-CF-032 | `DTOとイベントを扱う / 永続化用プレーンオブジェクトへ変換する場合 / sourceDocumentを返す` | valid fixture から集約を生成する。 | `const actual = harnessConfig.toSourceDocument()` | `actual` が入力 `sourceDocument` と等価なプレーンオブジェクトであることを確認する。 |
| UT-CF-033 | `DTOとイベントを扱う / sourceDocumentを書き換える場合 / defensive copyである` | 集約を生成し、`actual` 取得後に返却値を書き換える準備をする。 | `const actual = harnessConfig.toSourceDocument()` | `actual.project.name` や `actual.harnesses` を変更した後でも、再取得した sourceDocument が変化しないことを確認する。 |
| UT-CF-034 | `DTOとイベントを扱う / sourceDocumentに差分だけを持つ場合 / 省略形を維持する` | source 側には preset 上書き差分のみを持つ fixture を用意する。 | `const actual = harnessConfig.toSourceDocument()` | source 側で省略していた `layers` や `harnesses` の未指定項目が余計に展開されていないことを確認する。 |
| UT-CF-035 | `DTOとイベントを扱う / pullDomainEventsを連続で呼ぶ場合 / 2回目は空配列になる` | `enableFeature()` 済みの集約を用意する。 | `const actual = harnessConfig.pullDomainEvents()` | 1回目の `actual` にイベントが 1 件以上あり、2回目の `harnessConfig.pullDomainEvents()` が `[]` を返すことを確認する。 |

### 3.2 `domain/value-objects/project-config.test.ts`

- `target('ProjectConfig')`
- `describe('生成する')` に `UT-CF-036` から `UT-CF-038`
- `describe('等値性を判定する')` に `UT-CF-039` から `UT-CF-041`
- `describe('名前とPresetを変更する')` に `UT-CF-042` から `UT-CF-043`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-036 | `生成する / 有効なnameとPresetを渡す場合 / 生成できる` | `Preset('standard')` と `name='my-project'` を用意する。 | `const actual = new ProjectConfig({ name, preset })` | `actual.name` と `actual.preset` が入力値を保持することを確認する。 |
| UT-CF-037 | `生成する / nameが空文字の場合 / 生成に失敗する` | `Preset('standard')` と `name=''` を用意する。 | `const actual = () => new ProjectConfig({ name, preset })` | バリデーションエラーを送出することを確認する。 |
| UT-CF-038 | `生成する / 無効なPreset値を渡す場合 / 生成に失敗する` | `name='my-project'` と不正 preset 文字列を用意する。 | `const actual = () => ProjectConfig.create({ name, preset: 'invalid' })` | `InvalidPresetError` と `L1-002` を確認する。 |
| UT-CF-039 | `等値性を判定する / 同じnameとpresetを比較する場合 / 等しい` | 同じ属性の `ProjectConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-040 | `等値性を判定する / nameだけ異なる場合 / 等しくない` | `name` だけ異なる `ProjectConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-041 | `等値性を判定する / presetだけ異なる場合 / 等しくない` | `preset` だけ異なる `ProjectConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-042 | `名前とPresetを変更する / renameを呼ぶ場合 / 新しいnameの新インスタンスを返す` | 元の `ProjectConfig` と新しい `name` を用意する。 | `const actual = projectConfig.rename('next-project')` | `actual.name === 'next-project'`、`actual !== projectConfig`、`actual.preset` は維持されることを確認する。 |
| UT-CF-043 | `名前とPresetを変更する / changePresetを呼ぶ場合 / 新しいPresetの新インスタンスを返す` | 元の `ProjectConfig` と `Preset('strict')` を用意する。 | `const actual = projectConfig.changePreset(nextPreset)` | `actual.preset.equals(nextPreset)` が `true`、`actual !== projectConfig`、`name` は維持されることを確認する。 |

### 3.3 `domain/value-objects/preset.test.ts`

- `target('Preset')`
- `describe('生成する')` に `UT-CF-044` から `UT-CF-048`
- `describe('等値性を判定する')` に `UT-CF-049` から `UT-CF-050`
- `describe('種別を判定する')` に `UT-CF-051` から `UT-CF-054`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-044 | `生成する / minimalを渡す場合 / 生成できる` | `'minimal'` を用意する。 | `const actual = new Preset('minimal')` | `actual.value === 'minimal'` を確認する。 |
| UT-CF-045 | `生成する / standardを渡す場合 / 生成できる` | `'standard'` を用意する。 | `const actual = new Preset('standard')` | `actual.value === 'standard'` を確認する。 |
| UT-CF-046 | `生成する / strictを渡す場合 / 生成できる` | `'strict'` を用意する。 | `const actual = new Preset('strict')` | `actual.value === 'strict'` を確認する。 |
| UT-CF-047 | `生成する / 空文字を渡す場合 / 生成に失敗する` | `''` を用意する。 | `const actual = () => new Preset('')` | `InvalidPresetError` と `L1-002` を確認する。 |
| UT-CF-048 | `生成する / 未知の文字列を渡す場合 / 生成に失敗する` | `'custom'` を用意する。 | `const actual = () => new Preset('custom')` | `InvalidPresetError` と `L1-002` を確認する。 |
| UT-CF-049 | `等値性を判定する / 同じ値を比較する場合 / 等しい` | `Preset('minimal')` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-050 | `等値性を判定する / 異なる値を比較する場合 / 等しくない` | `Preset('minimal')` と `Preset('strict')` を作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-051 | `種別を判定する / minimalの場合 / isMinimalがtrueを返す` | `Preset('minimal')` を作る。 | `const actual = preset.isMinimal()` | `actual === true` を確認する。 |
| UT-CF-052 | `種別を判定する / minimal以外の場合 / isMinimalがfalseを返す` | `Preset('standard')` を作る。 | `const actual = preset.isMinimal()` | `actual === false` を確認する。 |
| UT-CF-053 | `種別を判定する / standardの場合 / isStandardがtrueを返す` | `Preset('standard')` を作る。 | `const actual = preset.isStandard()` | `actual === true` を確認する。 |
| UT-CF-054 | `種別を判定する / strictの場合 / isStrictがtrueを返す` | `Preset('strict')` を作る。 | `const actual = preset.isStrict()` | `actual === true` を確認する。 |

### 3.4 `domain/value-objects/layers-config.test.ts`

- `target('LayersConfig')`
- `describe('生成する')` に `UT-CF-055` から `UT-CF-059`
- `describe('等値性を判定する')` に `UT-CF-060` から `UT-CF-061`
- `describe('レイヤーを取得する')` に `UT-CF-062` から `UT-CF-063`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-055 | `生成する / 4レイヤーをすべて指定する場合 / 生成できる` | 実 `L1Config` から `L4Config` を 1 つずつ作る。 | `const actual = new LayersConfig({ L1, L2, L3, L4 })` | 4 レイヤーがそのまま保持されることを確認する。 |
| UT-CF-056 | `生成する / L1が欠落している場合 / 生成に失敗する` | `L2-L4` だけを持つ入力を用意する。 | `const actual = () => LayersConfig.create(input)` | 必須欠落のエラーを送出することを確認する。 |
| UT-CF-057 | `生成する / L2が欠落している場合 / 生成に失敗する` | `L1,L3,L4` だけを持つ入力を用意する。 | `const actual = () => LayersConfig.create(input)` | 必須欠落のエラーを送出することを確認する。 |
| UT-CF-058 | `生成する / L3が欠落している場合 / 生成に失敗する` | `L1,L2,L4` だけを持つ入力を用意する。 | `const actual = () => LayersConfig.create(input)` | 必須欠落のエラーを送出することを確認する。 |
| UT-CF-059 | `生成する / L4が欠落している場合 / 生成に失敗する` | `L1,L2,L3` だけを持つ入力を用意する。 | `const actual = () => LayersConfig.create(input)` | 必須欠落のエラーを送出することを確認する。 |
| UT-CF-060 | `等値性を判定する / 全レイヤーが同じ場合 / 等しい` | 同値の `LayersConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-061 | `等値性を判定する / いずれかのレイヤーが異なる場合 / 等しくない` | `L3.coverageThreshold` だけ異なる 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-062 | `レイヤーを取得する / L1を指定する場合 / L1Configを返す` | 有効な `LayersConfig` を作る。 | `const actual = layersConfig.get('L1')` | `actual` が `L1Config` であることを確認する。 |
| UT-CF-063 | `レイヤーを取得する / L4を指定する場合 / L4Configを返す` | 有効な `LayersConfig` を作る。 | `const actual = layersConfig.get('L4')` | `actual` が `L4Config` であることを確認する。 |

### 3.5 `domain/value-objects/l1-config.test.ts`

- `target('L1Config')`
- `describe('生成する')` に `UT-CF-064` から `UT-CF-066`
- `describe('等値性を判定する')` に `UT-CF-067` から `UT-CF-068`
- `describe('状態とルールを参照する')` に `UT-CF-069` から `UT-CF-071`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-064 | `生成する / 有効なseverityだけを含む場合 / 生成できる` | `rules={ 'no-eval': 'error', 'no-var': 'warning' }` を用意する。 | `const actual = new L1Config({ enabled: true, rules })` | rules が保持されることを確認する。 |
| UT-CF-065 | `生成する / 不正なseverityを含む場合 / 生成に失敗する` | `rules={ 'no-eval': 'fatal' }` を用意する。 | `const actual = () => new L1Config({ enabled: true, rules })` | バリデーションエラーを送出することを確認する。 |
| UT-CF-066 | `生成する / rulesが空オブジェクトの場合 / 生成できる` | `rules={}` を用意する。 | `const actual = new L1Config({ enabled: true, rules })` | 空 rules を保持したまま生成できることを確認する。 |
| UT-CF-067 | `等値性を判定する / enabledとrulesが同じ場合 / 等しい` | 同値の `L1Config` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-068 | `等値性を判定する / enabledが異なる場合 / 等しくない` | `enabled=true` と `enabled=false` を持つ 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-069 | `状態とルールを参照する / enabled=trueの場合 / isEnabledがtrueを返す` | `enabled=true` の `L1Config` を作る。 | `const actual = l1Config.isEnabled()` | `actual === true` を確認する。 |
| UT-CF-070 | `状態とルールを参照する / 存在するルール名を指定する場合 / severityを返す` | `rules.no-eval='error'` を持つ `L1Config` を作る。 | `const actual = l1Config.getRuleSeverity('no-eval')` | `actual === 'error'` を確認する。 |
| UT-CF-071 | `状態とルールを参照する / 存在しないルール名を指定する場合 / undefinedを返す` | `rules.no-eval='error'` を持つ `L1Config` を作る。 | `const actual = l1Config.getRuleSeverity('unknown-rule')` | `actual === undefined` を確認する。 |

### 3.6 `domain/value-objects/l2-config.test.ts`

- `target('L2Config')`
- `describe('生成する')` に `UT-CF-072` から `UT-CF-074`
- `describe('等値性を判定する')` に `UT-CF-075` から `UT-CF-076`
- `describe('validatorを参照する')` に `UT-CF-077` から `UT-CF-078`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-072 | `生成する / 重複のないvalidatorsを渡す場合 / 生成できる` | `validators=['v1','v2']` を用意する。 | `const actual = new L2Config({ enabled: true, validators })` | validators が入力順のまま保持されることを確認する。 |
| UT-CF-073 | `生成する / validatorsに重複がある場合 / 生成に失敗する` | `validators=['v1','v1']` を用意する。 | `const actual = () => new L2Config({ enabled: true, validators })` | 重複禁止エラーを確認する。 |
| UT-CF-074 | `生成する / validatorsが空配列の場合 / 生成できる` | `validators=[]` を用意する。 | `const actual = new L2Config({ enabled: false, validators })` | 空配列を保持したまま生成できることを確認する。 |
| UT-CF-075 | `等値性を判定する / enabledとvalidatorsが同じ場合 / 等しい` | 同値の `L2Config` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-076 | `等値性を判定する / validatorsの内容が異なる場合 / 等しくない` | `['v1']` と `['v2']` の 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-077 | `validatorを参照する / 含まれるvalidatorIdを指定する場合 / trueを返す` | `validators=['v1','v2']` の `L2Config` を作る。 | `const actual = l2Config.contains('v1')` | `actual === true` を確認する。 |
| UT-CF-078 | `validatorを参照する / 含まれないvalidatorIdを指定する場合 / falseを返す` | `validators=['v1','v2']` の `L2Config` を作る。 | `const actual = l2Config.contains('v3')` | `actual === false` を確認する。 |

### 3.7 `domain/value-objects/l3-config.test.ts`

- `target('L3Config')`
- `describe('生成する')` に `UT-CF-079` から `UT-CF-083`
- `describe('等値性を判定する')` に `UT-CF-084` から `UT-CF-085`
- `describe('coverage gate を判定する')` に `UT-CF-086` から `UT-CF-087`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-079 | `生成する / coverageThresholdが0の場合 / 生成できる` | `coverageThreshold=0` を用意する。 | `const actual = new L3Config({ enabled: true, validators: [], coverageThreshold })` | `actual.coverageThreshold === 0` を確認する。 |
| UT-CF-080 | `生成する / coverageThresholdが100の場合 / 生成できる` | `coverageThreshold=100` を用意する。 | `const actual = new L3Config({ enabled: true, validators: [], coverageThreshold })` | `actual.coverageThreshold === 100` を確認する。 |
| UT-CF-081 | `生成する / coverageThresholdが50の場合 / 生成できる` | `coverageThreshold=50` を用意する。 | `const actual = new L3Config({ enabled: true, validators: [], coverageThreshold })` | `actual.coverageThreshold === 50` を確認する。 |
| UT-CF-082 | `生成する / coverageThresholdが下限未満の場合 / 生成に失敗する` | `coverageThreshold=-1` を用意する。 | `const actual = () => new L3Config({ enabled: true, validators: [], coverageThreshold })` | 下限違反エラーを確認する。 |
| UT-CF-083 | `生成する / coverageThresholdが上限超過の場合 / 生成に失敗する` | `coverageThreshold=101` を用意する。 | `const actual = () => new L3Config({ enabled: true, validators: [], coverageThreshold })` | 上限違反エラーを確認する。 |
| UT-CF-084 | `等値性を判定する / 同じ属性を比較する場合 / 等しい` | 同値の `L3Config` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-085 | `等値性を判定する / coverageThresholdが異なる場合 / 等しくない` | `90` と `95` を持つ 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-086 | `coverage gate を判定する / coverageThresholdが0より大きい場合 / trueを返す` | `coverageThreshold=90` の `L3Config` を作る。 | `const actual = l3Config.hasCoverageGate()` | `actual === true` を確認する。 |
| UT-CF-087 | `coverage gate を判定する / coverageThresholdが0の場合 / falseを返す` | `coverageThreshold=0` の `L3Config` を作る。 | `const actual = l3Config.hasCoverageGate()` | `actual === false` を確認する。 |

### 3.8 `domain/value-objects/l4-config.test.ts`

- `target('L4Config')`
- `describe('生成する')` に `UT-CF-088` から `UT-CF-090`
- `describe('等値性を判定する')` に `UT-CF-091` から `UT-CF-092`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-088 | `生成する / 有効なscheduleを渡す場合 / 生成できる` | `schedule='0 0 * * *'` と重複なし validators を用意する。 | `const actual = new L4Config({ enabled: true, validators: [], schedule })` | `actual.schedule === schedule` を確認する。 |
| UT-CF-089 | `生成する / scheduleが空文字の場合 / 生成に失敗する` | `schedule=''` を用意する。 | `const actual = () => new L4Config({ enabled: true, validators: [], schedule })` | 空文字エラーを確認する。 |
| UT-CF-090 | `生成する / validatorsに重複がある場合 / 生成に失敗する` | `validators=['v1','v1']` を用意する。 | `const actual = () => new L4Config({ enabled: true, validators, schedule: 'daily' })` | 重複禁止エラーを確認する。 |
| UT-CF-091 | `等値性を判定する / 同じ属性を比較する場合 / 等しい` | 同値の `L4Config` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-092 | `等値性を判定する / scheduleが異なる場合 / 等しくない` | `daily` と `weekly` を持つ 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |

### 3.9 `domain/value-objects/quick-mode-config.test.ts`

- `target('QuickModeConfig')`
- `describe('生成する')` に `UT-CF-093` から `UT-CF-097`
- `describe('等値性を判定する')` に `UT-CF-098` から `UT-CF-099`
- `describe('許可カテゴリと維持レイヤーを判定する')` に `UT-CF-100` から `UT-CF-103`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-093 | `生成する / 各配列に重複がない場合 / 生成できる` | `allowedCategories=['a']`, `maintainedLayers=['L1']`, `relaxedGates=['g1']` を用意する。 | `const actual = new QuickModeConfig(input)` | 各配列がそのまま保持されることを確認する。 |
| UT-CF-094 | `生成する / allowedCategoriesに重複がある場合 / 生成に失敗する` | `allowedCategories=['a','a']` を用意する。 | `const actual = () => new QuickModeConfig(input)` | 重複禁止エラーを確認する。 |
| UT-CF-095 | `生成する / maintainedLayersに重複がある場合 / 生成に失敗する` | `maintainedLayers=['L1','L1']` を用意する。 | `const actual = () => new QuickModeConfig(input)` | 重複禁止エラーを確認する。 |
| UT-CF-096 | `生成する / relaxedGatesに重複がある場合 / 生成に失敗する` | `relaxedGates=['g1','g1']` を用意する。 | `const actual = () => new QuickModeConfig(input)` | 重複禁止エラーを確認する。 |
| UT-CF-097 | `生成する / 入力配列が未ソートの場合 / 順序を保持する` | `allowedCategories=['c','a','b']` を用意する。 | `const actual = new QuickModeConfig(input)` | `actual.allowedCategories` が `['c','a','b']` の順のまま保持されることを確認する。 |
| UT-CF-098 | `等値性を判定する / 同じ配列内容を比較する場合 / 等しい` | 同値の `QuickModeConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-099 | `等値性を判定する / allowedCategoriesが異なる場合 / 等しくない` | `allowedCategories` だけ異なる 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-100 | `許可カテゴリと維持レイヤーを判定する / 含まれるカテゴリを指定する場合 / allowsがtrueを返す` | `allowedCategories=['a','b']` の `QuickModeConfig` を作る。 | `const actual = quickModeConfig.allows('a')` | `actual === true` を確認する。 |
| UT-CF-101 | `許可カテゴリと維持レイヤーを判定する / 含まれないカテゴリを指定する場合 / allowsがfalseを返す` | `allowedCategories=['a','b']` の `QuickModeConfig` を作る。 | `const actual = quickModeConfig.allows('c')` | `actual === false` を確認する。 |
| UT-CF-102 | `許可カテゴリと維持レイヤーを判定する / 含まれるレイヤーを指定する場合 / maintainsがtrueを返す` | `maintainedLayers=['L1','L2']` の `QuickModeConfig` を作る。 | `const actual = quickModeConfig.maintains('L1')` | `actual === true` を確認する。 |
| UT-CF-103 | `許可カテゴリと維持レイヤーを判定する / 含まれないレイヤーを指定する場合 / maintainsがfalseを返す` | `maintainedLayers=['L1','L2']` の `QuickModeConfig` を作る。 | `const actual = quickModeConfig.maintains('L3')` | `actual === false` を確認する。 |

### 3.10 `domain/value-objects/phase-dependencies-config.test.ts`

- `target('PhaseDependenciesConfig')`
- `describe('生成する')` に `UT-CF-104` から `UT-CF-106`
- `describe('等値性を判定する')` に `UT-CF-107` から `UT-CF-108`
- `describe('customRulesの有無を判定する')` に `UT-CF-109` から `UT-CF-110`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-104 | `生成する / default presetと空customRulesを渡す場合 / 生成できる` | `preset='default'`, `override=false`, `customRules=[]` を用意する。 | `const actual = new PhaseDependenciesConfig(input)` | 値が保持されることを確認する。 |
| UT-CF-105 | `生成する / customRules.phaseが空文字の場合 / 生成に失敗する` | `CustomPhaseRule` の `phase=''` を含む入力を用意する。 | `const actual = () => new PhaseDependenciesConfig(input)` | `CustomPhaseRule` 由来のバリデーションエラーを確認する。 |
| UT-CF-106 | `生成する / custom presetでcustomRulesを持つ場合 / 生成できる` | `preset='custom'`, `override=true`, `customRules=[{ phase:'design', requires:['review'] }]` を用意する。 | `const actual = new PhaseDependenciesConfig(input)` | `actual.hasCustomRules()` が `true` で、rule 内容が保持されることを確認する。 |
| UT-CF-107 | `等値性を判定する / 同じ属性を比較する場合 / 等しい` | 同値の `PhaseDependenciesConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-108 | `等値性を判定する / presetが異なる場合 / 等しくない` | `preset='default'` と `preset='custom'` の 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-109 | `customRulesの有無を判定する / customRulesが1件以上ある場合 / trueを返す` | `customRules` を 1 件持つ `PhaseDependenciesConfig` を作る。 | `const actual = phaseDependenciesConfig.hasCustomRules()` | `actual === true` を確認する。 |
| UT-CF-110 | `customRulesの有無を判定する / customRulesが空の場合 / falseを返す` | `customRules=[]` の `PhaseDependenciesConfig` を作る。 | `const actual = phaseDependenciesConfig.hasCustomRules()` | `actual === false` を確認する。 |

### 3.11 `domain/value-objects/custom-phase-rule.test.ts`

- `target('CustomPhaseRule')`
- `describe('生成する')` に `UT-CF-111` から `UT-CF-114`
- `describe('等値性を判定する')` に `UT-CF-115` から `UT-CF-116`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-111 | `生成する / 有効なphaseとrequiresを渡す場合 / 生成できる` | `phase='design'`, `requires=['review']` を用意する。 | `const actual = new CustomPhaseRule(input)` | 値が保持されることを確認する。 |
| UT-CF-112 | `生成する / phaseが空文字の場合 / 生成に失敗する` | `phase=''` を用意する。 | `const actual = () => new CustomPhaseRule(input)` | 空文字エラーを確認する。 |
| UT-CF-113 | `生成する / requiresに重複がある場合 / 生成に失敗する` | `requires=['review','review']` を用意する。 | `const actual = () => new CustomPhaseRule(input)` | 重複禁止エラーを確認する。 |
| UT-CF-114 | `生成する / requiresが空配列の場合 / 生成できる` | `requires=[]` を用意する。 | `const actual = new CustomPhaseRule(input)` | 空配列を保持したまま生成できることを確認する。 |
| UT-CF-115 | `等値性を判定する / 同じphaseとrequiresを比較する場合 / 等しい` | 同値の `CustomPhaseRule` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-116 | `等値性を判定する / phaseが異なる場合 / 等しくない` | `phase='design'` と `phase='implement'` の 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |

### 3.12 `domain/value-objects/planning-mode-config.test.ts`

- `target('PlanningModeConfig')`
- `describe('生成する')` に `UT-CF-117` から `UT-CF-121`
- `describe('等値性を判定する')` に `UT-CF-122` から `UT-CF-123`
- `describe('フェーズごとのモードを解決する')` に `UT-CF-124` から `UT-CF-125`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-117 | `生成する / defaultがinteractiveの場合 / 生成できる` | `{ default:'interactive', perPhase:{} }` を用意する。 | `const actual = new PlanningModeConfig(input)` | `actual.defaultMode === 'interactive'` を確認する。 |
| UT-CF-118 | `生成する / defaultがembedded-qaの場合 / 生成できる` | `{ default:'embedded-qa', perPhase:{} }` を用意する。 | `const actual = new PlanningModeConfig(input)` | `actual.defaultMode === 'embedded-qa'` を確認する。 |
| UT-CF-119 | `生成する / defaultが未知の値の場合 / 生成に失敗する` | `{ default:'unknown', perPhase:{} }` を用意する。 | `const actual = () => new PlanningModeConfig(input)` | 列挙値エラーを確認する。 |
| UT-CF-120 | `生成する / perPhaseに有効な列挙値を渡す場合 / 生成できる` | `{ default:'interactive', perPhase:{ design:'embedded-qa' } }` を用意する。 | `const actual = new PlanningModeConfig(input)` | `perPhase.design === 'embedded-qa'` を確認する。 |
| UT-CF-121 | `生成する / perPhaseに無効な列挙値を渡す場合 / 生成に失敗する` | `{ default:'interactive', perPhase:{ design:'invalid' } }` を用意する。 | `const actual = () => new PlanningModeConfig(input)` | 列挙値エラーを確認する。 |
| UT-CF-122 | `等値性を判定する / defaultModeとperPhaseが同じ場合 / 等しい` | 同値の `PlanningModeConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-123 | `等値性を判定する / defaultModeが異なる場合 / 等しくない` | `interactive` と `embedded-qa` の 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-124 | `フェーズごとのモードを解決する / perPhaseに定義がある場合 / その値を返す` | `perPhase.design='embedded-qa'` を持つ `PlanningModeConfig` を作る。 | `const actual = planningModeConfig.resolveFor('design')` | `actual === 'embedded-qa'` を確認する。 |
| UT-CF-125 | `フェーズごとのモードを解決する / perPhaseに定義がない場合 / defaultModeを返す` | `default='interactive'` かつ `perPhase` に `review` を持たない設定を作る。 | `const actual = planningModeConfig.resolveFor('review')` | `actual === 'interactive'` を確認する。 |

### 3.13 `domain/value-objects/harnesses-config.test.ts`

- `target('HarnessesConfig')`
- `describe('生成する')` に `UT-CF-126` から `UT-CF-129`
- `describe('等値性を判定する')` に `UT-CF-130` から `UT-CF-131`
- `describe('機能を切り替える')` に `UT-CF-132` から `UT-CF-136`
- `describe('機能状態を判定する')` に `UT-CF-137` から `UT-CF-140`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-126 | `生成する / 全機能がfalseと0の場合 / 生成できる` | `agentLessonCollection=false`, `cascadeUpdate=false`, `bundleSizeLimit=0`, `deadCodeGC=false` を用意する。 | `const actual = new HarnessesConfig(input)` | 4 項目がそのまま保持されることを確認する。 |
| UT-CF-127 | `生成する / bundleSizeLimitが正値の場合 / 生成できる` | `bundleSizeLimit=500` を含む入力を用意する。 | `const actual = new HarnessesConfig(input)` | `actual.bundleSizeLimit === 500` を確認する。 |
| UT-CF-128 | `生成する / bundleSizeLimitが負値の場合 / 生成に失敗する` | `bundleSizeLimit=-1` を含む入力を用意する。 | `const actual = () => new HarnessesConfig(input)` | `InvalidHarnessesConfigError` と `L1-003` を確認する。 |
| UT-CF-129 | `生成する / 全機能がtrueと正値の場合 / 生成できる` | `agentLessonCollection=true`, `cascadeUpdate=true`, `bundleSizeLimit=500`, `deadCodeGC=true` を用意する。 | `const actual = new HarnessesConfig(input)` | 4 項目がそのまま保持されることを確認する。 |
| UT-CF-130 | `等値性を判定する / 全属性が同じ場合 / 等しい` | 同値の `HarnessesConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-131 | `等値性を判定する / bundleSizeLimitが異なる場合 / 等しくない` | `bundleSizeLimit=0` と `500` の 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-132 | `機能を切り替える / boolean機能をenableする場合 / trueの新インスタンスを返す` | `agentLessonCollection=false` の `HarnessesConfig` と `FeatureName('agentLessonCollection')` を用意する。 | `const actual = harnessesConfig.enable(featureName)` | `actual.agentLessonCollection === true`、`actual !== harnessesConfig` を確認する。 |
| UT-CF-133 | `機能を切り替える / bundleSizeLimitが0の状態でenableする場合 / 500になる` | `bundleSizeLimit=0` と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessesConfig.enable(featureName)` | `actual.bundleSizeLimit === 500` を確認する。 |
| UT-CF-134 | `機能を切り替える / bundleSizeLimitが既に正値の場合 / 値を維持する` | `bundleSizeLimit=300` と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessesConfig.enable(featureName)` | `actual.bundleSizeLimit === 300` を確認する。 |
| UT-CF-135 | `機能を切り替える / boolean機能をdisableする場合 / falseの新インスタンスを返す` | `agentLessonCollection=true` と `FeatureName('agentLessonCollection')` を用意する。 | `const actual = harnessesConfig.disable(featureName)` | `actual.agentLessonCollection === false`、`actual !== harnessesConfig` を確認する。 |
| UT-CF-136 | `機能を切り替える / bundleSizeLimitをdisableする場合 / 0になる` | `bundleSizeLimit=500` と `FeatureName('bundleSizeLimit')` を用意する。 | `const actual = harnessesConfig.disable(featureName)` | `actual.bundleSizeLimit === 0` を確認する。 |
| UT-CF-137 | `機能状態を判定する / boolean機能が有効の場合 / trueを返す` | `agentLessonCollection=true` の `HarnessesConfig` を作る。 | `const actual = harnessesConfig.isEnabled(featureName)` | `actual === true` を確認する。 |
| UT-CF-138 | `機能状態を判定する / boolean機能が無効の場合 / falseを返す` | `cascadeUpdate=false` の `HarnessesConfig` を作る。 | `const actual = harnessesConfig.isEnabled(featureName)` | `actual === false` を確認する。 |
| UT-CF-139 | `機能状態を判定する / bundleSizeLimitが正値の場合 / trueを返す` | `bundleSizeLimit=500` の `HarnessesConfig` を作る。 | `const actual = harnessesConfig.isEnabled(featureName)` | `actual === true` を確認する。 |
| UT-CF-140 | `機能状態を判定する / bundleSizeLimitが0の場合 / falseを返す` | `bundleSizeLimit=0` の `HarnessesConfig` を作る。 | `const actual = harnessesConfig.isEnabled(featureName)` | `actual === false` を確認する。 |

### 3.14 `domain/value-objects/paths-config.test.ts`

- `target('PathsConfig')`
- `describe('生成する')` に `UT-CF-141` から `UT-CF-145`
- `describe('等値性を判定する')` に `UT-CF-146` から `UT-CF-147`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-141 | `生成する / 相対パスを渡す場合 / 生成できる` | `designDocs='docs/product'`, `inceptionDocs='docs/inception'` を用意する。 | `const actual = new PathsConfig(input)` | 両パスが保持されることを確認する。 |
| UT-CF-142 | `生成する / designDocsが空文字の場合 / 生成に失敗する` | `designDocs=''` を用意する。 | `const actual = () => new PathsConfig(input)` | 空文字エラーを確認する。 |
| UT-CF-143 | `生成する / inceptionDocsが空文字の場合 / 生成に失敗する` | `inceptionDocs=''` を用意する。 | `const actual = () => new PathsConfig(input)` | 空文字エラーを確認する。 |
| UT-CF-144 | `生成する / designDocsに~を含む場合 / 生成に失敗する` | `designDocs='~/docs'` を用意する。 | `const actual = () => new PathsConfig(input)` | グローバルパス禁止エラーを確認する。 |
| UT-CF-145 | `生成する / inceptionDocsに$HOMEを含む場合 / 生成に失敗する` | `inceptionDocs='$HOME/docs'` を用意する。 | `const actual = () => new PathsConfig(input)` | グローバルパス禁止エラーを確認する。 |
| UT-CF-146 | `等値性を判定する / 同じパスを比較する場合 / 等しい` | 同値の `PathsConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-147 | `等値性を判定する / designDocsが異なる場合 / 等しくない` | `designDocs` だけ異なる 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |

### 3.15 `domain/value-objects/reporting-config.test.ts`

- `target('ReportingConfig')`
- `describe('生成する')` に `UT-CF-148` から `UT-CF-150`
- `describe('等値性を判定する')` に `UT-CF-151` から `UT-CF-152`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-148 | `生成する / formatとoutputDirが有効な場合 / 生成できる` | `format='json'`, `outputDir='reports'` を用意する。 | `const actual = new ReportingConfig(input)` | 値が保持されることを確認する。 |
| UT-CF-149 | `生成する / formatが空文字の場合 / 生成に失敗する` | `format=''` を用意する。 | `const actual = () => new ReportingConfig(input)` | 空文字エラーを確認する。 |
| UT-CF-150 | `生成する / outputDirが空文字の場合 / 生成に失敗する` | `outputDir=''` を用意する。 | `const actual = () => new ReportingConfig(input)` | 空文字エラーを確認する。 |
| UT-CF-151 | `等値性を判定する / formatとoutputDirが同じ場合 / 等しい` | 同値の `ReportingConfig` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-152 | `等値性を判定する / formatが異なる場合 / 等しくない` | `json` と `html` の 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |

### 3.16 `domain/value-objects/feature-name.test.ts`

- `target('FeatureName')`
- `describe('生成する')` に `UT-CF-153` から `UT-CF-155`
- `describe('等値性を判定する')` に `UT-CF-156` から `UT-CF-157`
- `describe('文字列表現を返す')` に `UT-CF-158`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-153 | `生成する / 利用可能一覧に含まれる名前を渡す場合 / 生成できる` | `availableNames` に `agentLessonCollection` を含む配列を用意する。 | `const actual = createFeatureName('agentLessonCollection', availableNames)` | `actual.toString() === 'agentLessonCollection'` を確認する。 |
| UT-CF-154 | `生成する / 利用可能一覧に含まれない名前を渡す場合 / 生成に失敗する` | `availableNames` に `unknownFeature` を含まない配列を用意する。 | `const actual = () => createFeatureName('unknownFeature', availableNames)` | `UnsupportedFeatureError` と `L1-004` を確認する。 |
| UT-CF-155 | `生成する / 全4機能名を渡す場合 / すべて生成できる` | `agentLessonCollection`, `cascadeUpdate`, `bundleSizeLimit`, `deadCodeGC` と 4 機能一覧を用意する。 | `const actual = names.map((name) => createFeatureName(name, availableNames))` | 4 要素すべてが `FeatureName` であり、各 `toString()` が入力値を返すことを確認する。 |
| UT-CF-156 | `等値性を判定する / 同じ値を比較する場合 / 等しい` | `FeatureName('agentLessonCollection')` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-157 | `等値性を判定する / 異なる値を比較する場合 / 等しくない` | `agentLessonCollection` と `cascadeUpdate` を作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-158 | `文字列表現を返す / bundleSizeLimitを保持する場合 / 文字列を返す` | `FeatureName('bundleSizeLimit')` を作る。 | `const actual = featureName.toString()` | `actual === 'bundleSizeLimit'` を確認する。 |

### 3.17 `domain/value-objects/feature-toggle.test.ts`

- `target('FeatureToggle')`
- `describe('生成する')` に `UT-CF-159` から `UT-CF-160`
- `describe('等値性を判定する')` に `UT-CF-161` から `UT-CF-163`
- `describe('状態を切り替える')` に `UT-CF-164` から `UT-CF-165`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-159 | `生成する / 有効なFeatureNameとtrueを渡す場合 / 生成できる` | 実 `FeatureName('agentLessonCollection')` を用意する。 | `const actual = new FeatureToggle({ name: featureName, enabled: true })` | `actual.name.equals(featureName)` と `actual.enabled === true` を確認する。 |
| UT-CF-160 | `生成する / enabled=falseを渡す場合 / 生成できる` | 実 `FeatureName('cascadeUpdate')` を用意する。 | `const actual = new FeatureToggle({ name: featureName, enabled: false })` | `actual.enabled === false` を確認する。 |
| UT-CF-161 | `等値性を判定する / nameとenabledが同じ場合 / 等しい` | 同値の `FeatureToggle` を 2 つ作る。 | `const actual = left.equals(right)` | `actual === true` を確認する。 |
| UT-CF-162 | `等値性を判定する / enabledが異なる場合 / 等しくない` | `enabled=true` と `enabled=false` の 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-163 | `等値性を判定する / nameが異なる場合 / 等しくない` | 異なる `FeatureName` を持つ 2 インスタンスを作る。 | `const actual = left.equals(right)` | `actual === false` を確認する。 |
| UT-CF-164 | `状態を切り替える / falseからtrueへtoggleする場合 / 新インスタンスを返す` | `enabled=false` の `FeatureToggle` を作る。 | `const actual = featureToggle.toggle(true)` | `actual.enabled === true`、`actual !== featureToggle`、`actual.name.equals(featureToggle.name)` を確認する。 |
| UT-CF-165 | `状態を切り替える / 同じ状態を指定する場合 / それでも新インスタンスを返す` | `enabled=true` の `FeatureToggle` を作る。 | `const actual = featureToggle.toggle(true)` | `actual.enabled === true`、`actual !== featureToggle` を確認する。 |

### 3.18 `domain/services/preset-resolution-service.test.ts`

- `target('PresetResolutionService')`
- `describe('resolve')` に `UT-CF-166` から `UT-CF-176`
- `describe('applyFeatureOverride')` に `UT-CF-177` から `UT-CF-181`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-166 | `resolve / minimal presetを解決する場合 / preset定義にsource差分を上書きしたresolvedを返す` | minimal presetDefinition と最小限 sourceDocument を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | preset のベース値に source 差分が反映された resolvedDocument を返すことを確認する。 |
| UT-CF-167 | `resolve / standard presetを解決する場合 / L3有効かつcoverageThreshold=90になる` | standard presetDefinition と差分なし sourceDocument を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | `actual.layers.L3.enabled === true` かつ `actual.layers.L3.coverageThreshold === 90` を確認する。 |
| UT-CF-168 | `resolve / strict presetを解決する場合 / 全レイヤーが有効になる` | strict presetDefinition と差分なし sourceDocument を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | `L1-L4.enabled` がすべて `true` であることを確認する。 |
| UT-CF-169 | `resolve / objectフィールドを上書きする場合 / deep mergeされる` | preset 側 `layers.L3` にベース値、source 側 `layers.L3` に差分値を持たせる。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | `layers.L3` が差分だけ置換されず、ベース値と差分値の両方を持つことを確認する。 |
| UT-CF-170 | `resolve / arrayフィールドを上書きする場合 / 結合ではなく置換される` | preset 側 `validators=['a','b']`、source 側 `validators=['c']` を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | `actual.layers.L2.validators` または `L3.validators` が `['c']` だけになることを確認する。 |
| UT-CF-171 | `resolve / primitiveフィールドを上書きする場合 / source側の値が優先される` | preset 側 `coverageThreshold=90`、source 側 `coverageThreshold=95` を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | `actual.layers.L3.coverageThreshold === 95` を確認する。 |
| UT-CF-172 | `resolve / project.nameとproject.presetを解決する場合 / resolvedDocumentへ反映される` | `sourceDocument.project.name='my-project'`, `project.preset='standard'` を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | `actual.project.name === 'my-project'` かつ `actual.project.preset === 'standard'` を確認する。 |
| UT-CF-173 | `resolve / presetDefinitionが欠落している場合 / エラーになる` | `layers` など必要セクションが欠けた presetDefinition を用意する。 | `const actual = () => presetResolutionService.resolve(sourceDocument, invalidDefinition)` | `InvalidPresetDefinitionError` と `L1-007` を確認する。 |
| UT-CF-174 | `resolve / deep merge対象の型が衝突する場合 / エラーになる` | preset 側は object、source 側は primitive のように構造不整合を用意する。 | `const actual = () => presetResolutionService.resolve(sourceDocument, presetDefinition)` | `ConfigMergeError` と `L1-008` を確認する。 |
| UT-CF-175 | `resolve / standard preset上でcoverageThresholdを95へ上書きする場合 / 個別上書きできる` | standard presetDefinition と `coverageThreshold=95` の差分を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | `actual.layers.L3.coverageThreshold === 95` を確認する。 |
| UT-CF-176 | `resolve / sourceDocumentが差分を持たない場合 / preset定義がそのまま使われる` | `project.name` と `project.preset` 以外を持たない sourceDocument を用意する。 | `const actual = presetResolutionService.resolve(sourceDocument, presetDefinition)` | resolved の `layers` / `harnesses` / `quickMode` が presetDefinition と等価であることを確認する。 |
| UT-CF-177 | `applyFeatureOverride / boolean機能をtrueにする場合 / 対象フィールドだけtrueになる` | `agentLessonCollection=false` の resolvedDocument と `FeatureToggle(agentLessonCollection,true)` を用意する。 | `const actual = presetResolutionService.applyFeatureOverride(resolvedDocument, featureToggle)` | `actual.harnesses.agentLessonCollection === true` を確認する。 |
| UT-CF-178 | `applyFeatureOverride / boolean機能をfalseにする場合 / 対象フィールドだけfalseになる` | `cascadeUpdate=true` の resolvedDocument と `FeatureToggle(cascadeUpdate,false)` を用意する。 | `const actual = presetResolutionService.applyFeatureOverride(resolvedDocument, featureToggle)` | `actual.harnesses.cascadeUpdate === false` を確認する。 |
| UT-CF-179 | `applyFeatureOverride / bundleSizeLimitを有効化する場合 / 既定値500を設定する` | `bundleSizeLimit=0` の resolvedDocument と `FeatureToggle(bundleSizeLimit,true)` を用意する。 | `const actual = presetResolutionService.applyFeatureOverride(resolvedDocument, featureToggle)` | `actual.harnesses.bundleSizeLimit === 500` を確認する。 |
| UT-CF-180 | `applyFeatureOverride / bundleSizeLimitを無効化する場合 / 0を設定する` | `bundleSizeLimit=500` の resolvedDocument と `FeatureToggle(bundleSizeLimit,false)` を用意する。 | `const actual = presetResolutionService.applyFeatureOverride(resolvedDocument, featureToggle)` | `actual.harnesses.bundleSizeLimit === 0` を確認する。 |
| UT-CF-181 | `applyFeatureOverride / 1機能だけ切り替える場合 / 他のharnesses属性は変更しない` | 複数機能が混在した resolvedDocument と `FeatureToggle(agentLessonCollection,true)` を用意する。 | `const actual = presetResolutionService.applyFeatureOverride(resolvedDocument, featureToggle)` | `cascadeUpdate`、`bundleSizeLimit`、`deadCodeGC` が元の値を維持することを確認する。 |

### 3.19 `domain/services/feature-registry.test.ts`

- `target('FeatureRegistry')`
- `describe('listAvailable')` に `UT-CF-182` から `UT-CF-185`
- `describe('ensureAvailable')` に `UT-CF-186` から `UT-CF-189`

| ケースID | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-CF-182 | `listAvailable / Portから4機能が返る場合 / FeatureName配列へ変換する` | `['agentLessonCollection','cascadeUpdate','bundleSizeLimit','deadCodeGC']` を返す fake port を用意する。 | `const actual = featureRegistry.listAvailable()` | `actual.length === 4`、各要素が `FeatureName` であることを確認する。 |
| UT-CF-183 | `listAvailable / 重複を含む一覧が返る場合 / 重複を除去する` | `['agentLessonCollection','agentLessonCollection','cascadeUpdate']` を返す fake port を用意する。 | `const actual = featureRegistry.listAvailable()` | `actual.map(toString)` が `['agentLessonCollection','cascadeUpdate']` になることを確認する。 |
| UT-CF-184 | `listAvailable / 未ソートの一覧が返る場合 / 安定ソートする` | `['deadCodeGC','agentLessonCollection','bundleSizeLimit']` を返す fake port を用意する。 | `const actual = featureRegistry.listAvailable()` | `actual.map(toString)` が規定順に並ぶことを確認する。 |
| UT-CF-185 | `listAvailable / 空配列が返る場合 / 空配列を返す` | `[]` を返す fake port を用意する。 | `const actual = featureRegistry.listAvailable()` | `actual` が空配列であることを確認する。 |
| UT-CF-186 | `ensureAvailable / 存在する機能名を指定する場合 / FeatureNameを返す` | 4 機能を返す fake port と `name='agentLessonCollection'` を用意する。 | `const actual = featureRegistry.ensureAvailable(name)` | `actual.toString() === 'agentLessonCollection'` を確認する。 |
| UT-CF-187 | `ensureAvailable / 存在しない機能名を指定する場合 / エラーになる` | 4 機能を返す fake port と `name='unknownFeature'` を用意する。 | `const actual = () => featureRegistry.ensureAvailable(name)` | `UnsupportedFeatureError` と `L1-004` を確認する。 |
| UT-CF-188 | `ensureAvailable / 存在しない機能名を指定する場合 / エラーメッセージに利用可能一覧を含める` | 4 機能を返す fake port と `name='unknownFeature'` を用意する。 | `const actual = () => featureRegistry.ensureAvailable(name)` | 送出メッセージに 4 機能名すべてが含まれることを確認する。 |
| UT-CF-189 | `ensureAvailable / 空文字を指定する場合 / エラーになる` | 4 機能を返す fake port と `name=''` を用意する。 | `const actual = () => featureRegistry.ensureAvailable(name)` | `UnsupportedFeatureError` と `L1-004` を確認する。 |

## 4. モック戦略

| 対象 | 方針 | 理由 |
|---|---|---|
| HarnessConfig | 実オブジェクトを使用 | 集約の不変条件とイベント蓄積を直接検証するため |
| 値オブジェクト全般 | 実オブジェクトを使用 | テスト規約上モック禁止であり、値等価性と不変性の確認対象だから |
| PresetResolutionService | 実オブジェクトを使用 | deep merge と feature override の純粋ロジックを直接検証するため |
| FeatureRegistry | 実オブジェクトを使用 | 並び替え・重複排除・ `FeatureName` 変換を実体で確認するため |
| FeatureRegistryPort | in-memory fake のみ使用 | 外部依存ではあるが pure data source なので軽量 fake で十分 |
| ConfigRepositoryPort | 使用しない | 本設計は domain 層のユニットテストのみ対象 |
| ConfigSchemaValidatorPort | 使用しない | スキーマ検証は application / integration 側責務 |
| `vi.mock` / `vi.spyOn` | 原則不使用 | ドメインテストで実ロジックを崩さないため |

### 4.1 fake の最小仕様

- `InMemoryFeatureRegistryPort` は `listAvailable(): string[]` だけを持つ。
- fake は入出力の記録よりも、固定データの供給だけに責務を限定する。
- fake 内に分岐ロジックを増やさず、ケース差分は names 配列の入力で表現する。

### 4.2 例外確認の実装ルール

- 同期例外は `const actual = () => targetCall()` で受ける。
- Assert は `expect(actual).toThrowError(ErrorType)` を先に書き、必要ならエラーメッセージのコードを追加確認する。
- coverage report にある設計未確定事項 `UT-CF-201` は、期待結果が確定するまで `it.skip` または `it.todo` ではなく、コメント付きの保留ケースとして管理する。

## 5. 境界値テスト一覧

> `UT-CF-190` 以降は既存ケースの再掲ではなく、境界値回帰を独立で読めるようにしたロジック設計である。実装先は各対象ファイルに含める。

| ケースID | 実装先 | `describe / context / it` | Arrange | Act | Assert |
|---|---|---|---|---|---|
| UT-CF-190 | `l3-config.test.ts` | `coverage gate を判定する / coverageThresholdが下限値0の場合 / 生成できる` | `coverageThreshold=0` を用意する。 | `const actual = new L3Config({ enabled: true, validators: [], coverageThreshold: 0 })` | 生成でき、`actual.hasCoverageGate() === false` を確認する。 |
| UT-CF-191 | `l3-config.test.ts` | `coverage gate を判定する / coverageThresholdが上限値100の場合 / 生成できる` | `coverageThreshold=100` を用意する。 | `const actual = new L3Config({ enabled: true, validators: [], coverageThreshold: 100 })` | 生成でき、`actual.hasCoverageGate() === true` を確認する。 |
| UT-CF-192 | `l3-config.test.ts` | `coverage gate を判定する / coverageThresholdが下限外-1の場合 / 生成に失敗する` | `coverageThreshold=-1` を用意する。 | `const actual = () => new L3Config({ enabled: true, validators: [], coverageThreshold: -1 })` | 下限違反エラーを確認する。 |
| UT-CF-193 | `l3-config.test.ts` | `coverage gate を判定する / coverageThresholdが上限外101の場合 / 生成に失敗する` | `coverageThreshold=101` を用意する。 | `const actual = () => new L3Config({ enabled: true, validators: [], coverageThreshold: 101 })` | 上限違反エラーを確認する。 |
| UT-CF-194 | `harnesses-config.test.ts` | `機能を切り替える / bundleSizeLimitが無効境界値0の場合 / 生成できる` | `bundleSizeLimit=0` を含む入力を用意する。 | `const actual = new HarnessesConfig(input)` | 生成でき、`actual.isEnabled(bundleSizeLimitFeatureName) === false` を確認する。 |
| UT-CF-195 | `harnesses-config.test.ts` | `機能を切り替える / bundleSizeLimitが有効最小値1の場合 / 生成できる` | `bundleSizeLimit=1` を含む入力を用意する。 | `const actual = new HarnessesConfig(input)` | 生成でき、`actual.isEnabled(bundleSizeLimitFeatureName) === true` を確認する。 |
| UT-CF-196 | `harnesses-config.test.ts` | `機能を切り替える / bundleSizeLimitが不正値-1の場合 / 生成に失敗する` | `bundleSizeLimit=-1` を含む入力を用意する。 | `const actual = () => new HarnessesConfig(input)` | `InvalidHarnessesConfigError` と `L1-003` を確認する。 |
| UT-CF-197 | `harnesses-config.test.ts` | `機能状態を判定する / 全機能がデフォルト無効値の場合 / すべてfalseを返す` | 全機能 `false/0` の `HarnessesConfig` と 4 種の `FeatureName` を用意する。 | `const actual = featureNames.map((featureName) => harnessesConfig.isEnabled(featureName))` | `actual` が `[false, false, false, false]` になることを確認する。 |
| UT-CF-198 | `harness-config.test.ts` | `レイヤーと機能状態を参照する / レイヤーIDがL0の場合 / エラーになる` | valid fixture から集約を生成する。 | `const actual = () => harnessConfig.getLayerConfig('L0')` | `UnknownLayerError` と `L1-006` を確認する。 |
| UT-CF-199 | `harness-config.test.ts` | `レイヤーと機能状態を参照する / レイヤーIDがL5の場合 / エラーになる` | valid fixture から集約を生成する。 | `const actual = () => harnessConfig.getLayerConfig('L5')` | `UnknownLayerError` と `L1-006` を確認する。 |
| UT-CF-200 | `harness-config.test.ts` | `レイヤーと機能状態を参照する / レイヤーIDが空文字の場合 / エラーになる` | valid fixture から集約を生成する。 | `const actual = () => harnessConfig.getLayerConfig('')` | `UnknownLayerError` と `L1-006` を確認する。 |
| UT-CF-201 | `l3-config.test.ts` | `生成する / coverageThresholdが小数値の場合 / 仕様確定に従って判定する` | `coverageThreshold=90.5` を用意し、coverage report の未確定事項としてコメントを付ける。 | `const actual = () => new L3Config({ enabled: true, validators: [], coverageThreshold: 90.5 })` または `const actual = new L3Config(...)` | 仕様が「整数のみ許容」なら例外確認、仕様が「小数許容」なら生成成功と `hasCoverageGate() === true` を確認する。実装前に期待値を確定する。 |

## 6. WI-365 実装突合レビュー記録（2026-08-06）

<!-- @work-item-id WI-365 -->

本文書は `p2:check-freshness` で error 判定（104 日経過）となっていたため、
タイムスタンプ更新ではなく**現行実装との突合レビュー**を実施した。以下は実測結果。

### 6.1 検証方法

- §1 の各パスについて実ファイルの存在を検査
- 各テストファイルの `it(` 出現数を実測し、§1 の設計ケース数と突合
- テストファイル内の `UT-CF-XXX` コメントを抽出し、§3 / §5 の設計ケース ID と突合

### 6.2 パスの是正

12 ファイルが `scripts/harness/__tests__/config-foundation/domain/**` から
`scripts/harness/__tests__/unit/config-foundation/**`（フラット配置）へ移動していた。
§1 の表を実配置に更新済み。未移動で当初パスに残っているのは
`project-config` / `preset` / `layers-config` / `l1-config` / `l2-config` / `l3-config` / `l4-config`
の 7 ファイル。

### 6.3 設計ケース数と実装数の差分

合計: 設計 **201** に対し実装 **194**（`it(` 実測、`it.each` は 1 件として計上）。

| ファイル | 設計 | 実装 | 差分の内訳 |
|---|---:|---:|---|
| `harness-config.test.ts` | 38 | 30 | UT-CF-007 / 021 / 022 / 023 / 024 と境界値 UT-CF-198 / 199 / 200 が未実装 |
| `l3-config.test.ts` | 14 | 9 | 境界値 UT-CF-190 / 191 / 192 / 193 / 201 が未実装 |
| `phase-dependencies-config.test.ts` | 7 | 12 | 設計外の追加ケースあり（ID コメントは 7 件） |
| `planning-mode-config.test.ts` | 9 | 10 | 設計外の追加ケース 1 件 |
| `paths-config.test.ts` | 7 | 9 | 設計外の追加ケース 2 件 |
| `preset-resolution-service.test.ts` | 16 | 18 | 設計外の追加ケース 2 件 |
| `harnesses-config.test.ts` | 19 | 17 | 境界値 UT-CF-196 が未実装（194 / 195 / 197 は実装済み） |
| `feature-name.test.ts` | 6 | 5 | 1 件未実装 |
| `feature-registry.test.ts` | 8 | 7 | 1 件未実装 |
| 上記以外の 10 ファイル | 一致 | 一致 | — |

### 6.4 未確認事項（本レビューのスコープ外）

- §3 / §5 の各ケースの Arrange / Act / Assert 記述と実テストコードの
  逐条一致は検証していない（ID とケース数のみ）。
- `project-config` / `preset` / `layers-config` / `l1-config` / `l2-config` /
  `l3-config` / `l4-config` の 7 ファイルには `UT-CF-XXX` の ID コメントが無く、
  ID 単位のトレーサビリティが取れない。
- `UT-CF-` の ID 名前空間が quick-mode の
  `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/changed-file.test.ts`
  （ChangedFile）と衝突している（双方に UT-CF-007〜009 が存在）。
  ID 体系の是正は本 WI のスコープ外。

