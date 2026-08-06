---
adr_id: "040"
title: "Quick Mode の実効設定を防御プリセット解決経由で決定する"
status: Accepted
date: 2026-08-06
---

# Quick Mode の実効設定を防御プリセット解決経由で決定する

<!-- @work-item-id WI-375 -->
<!-- @work-item-id WI-377 -->
<!-- @work-item-id WI-378 -->

## Context

ADR-007 は `phasegate.config.json` を品質設定の Single Source of Truth と定め、防御プリセット（`minimal` / `standard` / `strict`）の解決は config-foundation の `PresetResolutionService` + `PresetDefinitionStore` が担う。ところが Quick Mode の実効経路である `HarnessConfigQuickModeConfigAdapter`（`scripts/harness/quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.ts`）は、**`phasegate.config.json` を `fs.readFile` + `JSON.parse` で直接読み、preset 解決を経由していなかった**。

その結果:

- `scripts/harness/config-foundation/infrastructure/presets/*.json` の `quickMode` セクションは**どこからも読まれないデッド宣言**だった。
- 実効既定値は adapter 内のハードコード定数 `DEFAULT_QUICK_MODE_CONFIG` にあり、宣言（presets）と実効値（adapter）が二重管理されていた。
- WI-353 で `allowedCategories` の乖離（presets が `["bugfix"]`、実効値が 4 カテゴリ）を是正し契約テストで再発を検知できるようにしたが、`maintainedLayers` / `relaxedGates` は依然乖離していた（presets: `["L1","L2"]` / `[]`、実効値かつ `docs/guide/configuration.md` の記載: `["L1","L2-002","L2-003","L2-014","L3-001"]` / `["L2-001","L3-002","L3-003","L3-004","L4"]`）。
- 「防御プリセットごとに Quick Mode の強度を変える」（例: `strict` では `allowedCategories` を絞る）という設計は、経路が繋がっていないため実現不能だった。

GitHub #44 課題 2。**既存プロジェクトの実効挙動を変えない移行**が絶対条件である（#27 の再発防止）。

## Decision

### 1. Quick Mode 設定は preset 解決結果（resolved config）から決定する

`HarnessConfigQuickModeConfigAdapter` は `PresetDefinitionStore` + `PresetResolutionService` を使い、`project.preset` に対応する preset 定義と `phasegate.config.json` の `quickMode` を config-foundation と同一の merge 規則（`deepMerge`: 配列はキー単位で全置換、未宣言キーは preset 値を継承）で解決した結果を使う。

これにより presets の `quickMode` 宣言が実際に読まれ、防御プリセットごとに Quick Mode 強度を変える設計が有効化される。

### 2. 移行時は挙動不変を絶対条件とし、presets の宣言値を実効既定値に揃える

経路の載せ替えだけを行うと、`quickMode` を書いていない既存プロジェクトの `maintainedLayers` / `relaxedGates` が preset の宣言値（`["L1","L2"]` / `[]`）に変わってしまう。これは「Quick Mode で L2-001 phase-gate が維持され、L3-001 が維持されなくなる」という実挙動の変化であり、許容しない。

したがって **3 プリセットの `quickMode` 宣言を実効既定値（= `docs/guide/configuration.md` が既定として記載している値）に揃える**。WI-353 が `allowedCategories` に対して行った是正を、`maintainedLayers` / `relaxedGates` にも適用する形になる。逆方向（実効値を preset 宣言に合わせる）は既存利用者への破壊的変更であり採らない。

防御プリセットごとの Quick Mode 強度差（`strict` で絞る等）は**本 ADR では導入しない**。経路を繋ぐ変更と挙動を変える変更を同一コミットに混ぜないためである。今後差をつける場合は presets の該当ファイルのみを変更すれば実効値に反映される。

### 3. 解決不能時は従来どおりの既定値に fail-open する

`project.preset` が未知・未宣言、または preset 解決が例外を投げる config（他セクションが壊れている等）では、従来と同じく adapter 内の既定値 + raw `quickMode` の per-key フォールバックで動作する。ADR-038 §3-1 の「hook は config がどんな状態でも完走する」原則を維持し、preset 解決の導入によって**新たな遮断経路を作らない**。

`HarnessConfigNotFoundError`（ENOENT）と `HarnessConfigParseError`（JSON 不正）は adapter の公開契約として維持する。

### 4. WI-353 の契約テストは「宣言が実際に読まれること」の検証に昇格させる

WI-353 のテストは「preset 宣言値 == adapter のハードコード既定値」という**二重管理の整合**を検査していた。経路が繋がった後は、`quickMode` を持たない config に対する adapter の実効値が preset 宣言値そのものであることを 3 プリセット分検証する形に置き換える。これによりデッド宣言の解消自体が回帰テストで固定される。

あわせて「防御プリセット × `quickMode` キー有無 × 明示 override 有無」のマトリクス回帰テストで挙動不変を固定する。

## Consequences

- presets の `quickMode` が実効値の所在（single source）になり、adapter 内の既定値は preset 解決不能時の fail-open 用フォールバックという位置づけに縮小する。
- `phasegate` が出力する解決済み config の `quickMode` と、Quick Mode 判定が実際に使う値が一致する（従来は前者だけが preset 由来で、後者と食い違っていた）。
- 挙動不変の担保はテストで行う。preset 宣言を変更すると Quick Mode の実挙動が変わるため、presets の `quickMode` 変更は破壊的変更として扱う。
- 経緯: WI-353（`allowedCategories` の宣言値是正・契約テスト）→ 本 ADR / WI-377（経路の載せ替えと残り 2 キーの是正）→ WI-378（契約テストの昇格）。

## Alternatives

1. **adapter の raw 読みを維持し、presets の `quickMode` セクションを削除する。** デッド宣言は消えるが、防御プリセットごとに Quick Mode 強度を変える設計余地を永久に失い、解決済み config から `quickMode` が消えて ADR-007 の Single Source of Truth と矛盾する。
2. **経路を載せ替え、実効値を preset 宣言（`["L1","L2"]` / `[]`）に合わせる。** 既存プロジェクトの Quick Mode 緩和範囲が無告知で変わる破壊的変更であり、#27 と同種の事故を再発させる。
3. **`LoadResolvedConfigUseCase` をそのまま呼ぶ（AJV schema 検証込みの完全経路）。** schema 違反 config で Quick Mode 判定が新たに例外を投げるようになり、ADR-038 の fail-open 表を変更してしまう。本 ADR は domain service（`PresetResolutionService`）と preset 定義のみを利用し、検証の厳格度は変えない。
