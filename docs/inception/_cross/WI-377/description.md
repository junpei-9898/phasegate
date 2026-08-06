---
id: WI-377
type: refactor
severity: medium
status: drafted
affects: [quick-mode, config-foundation]
source: GitHub issue #44 課題 2（quickMode config が preset 解決を経由しない）/ ADR-040
---

# WI-377: Quick Mode 設定を防御プリセット解決経由で解決する

<!-- @work-item-id WI-377 -->

## 背景

`HarnessConfigQuickModeConfigAdapter` は `phasegate.config.json` を `fs.readFile` + `JSON.parse` で直読みし、
未宣言キーを adapter 内の `DEFAULT_QUICK_MODE_CONFIG` で補っていた。
config-foundation の preset 解決を経由しないため、`config-foundation/infrastructure/presets/*.json` の
`quickMode` はどこからも読まれないデッド宣言だった。

WI-353 で `allowedCategories` の乖離は是正済みだが、残り 2 キーは乖離したままだった。

| キー | presets 宣言（WI-377 前） | 実効既定値（adapter / docs/guide/configuration.md） |
|------|--------------------------|--------------------------------------------------|
| `allowedCategories` | `["bugfix","docs","test","config"]`（WI-353 で是正済み） | 同左 |
| `maintainedLayers` | `["L1","L2"]` | `["L1","L2-002","L2-003","L2-014","L3-001"]` |
| `relaxedGates` | `[]` | `["L2-001","L3-002","L3-003","L3-004","L4"]` |

`QuickModeConfig.isMaintained` は前方一致（`"L2"` が `L2-*` 全体にマッチ）で評価するため、
宣言値のまま経路を繋ぐと「Quick Mode で phase-gate（L2-001）が維持され、L3-001 が維持されなくなる」
という実挙動の変化が起きる。これは許容しない。

## 修正

1. adapter を `PresetDefinitionStore` + `PresetResolutionService` 経由に載せ替える。
   `project.preset` に対応する preset 定義と source の `quickMode` を config-foundation と同一の merge 規則で解決する。
2. presets 3 ファイルの `quickMode.maintainedLayers` / `relaxedGates` を実効既定値に揃える（ADR-040 §2）。
3. preset 解決不能時（未知 preset / 他セクション不正）は従来どおり adapter 既定値 + raw `quickMode` の
   per-key フォールバックで動作する。`HarnessConfigNotFoundError` / `HarnessConfigParseError` は維持する（ADR-040 §3）。
4. `HarnessConfigResolvedDocument["quickMode"]` に optional な `fullModeRequiredWhen` を追加する。
   JSON Schema (v2/v3) は既に当該キーを許容しており、`deepMerge` も実行時には保持していたが、型宣言だけが欠けていた。

## 挙動不変の検証

「防御プリセット（3）× `quickMode` キー有無 × 明示 override 有無」のマトリクス回帰テストで固定する。

| ケース | 期待 |
|--------|------|
| `quickMode` セクション無し | 3 プリセットとも実効既定値（4 カテゴリ / 5 維持 ID / 5 緩和 ID） |
| `quickMode: {}` | 同上（空オブジェクトは全キー未宣言と同義） |
| 一部キーのみ明示 | 明示キーは override 値、未宣言キーは実効既定値 |
| 全キー明示 | すべて override 値 |
| `fullModeRequiredWhen` の明示 / 部分明示 / 未宣言 | 明示値保持・未指定は `true` 補完 |
| 未知 preset / `project` 欠落 | 実効既定値（fail-open） |
| `allowedCategories: []` | 従来どおり `QuickModeConfigError` |
