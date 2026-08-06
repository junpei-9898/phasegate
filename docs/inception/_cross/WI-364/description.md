---
id: WI-364
type: fix
severity: medium
status: drafted
affects: [harness-api, quick-mode]
source: GitHub issue #46（WI-351 の修正範囲に取り残された同型バグ）
---

# WI-364: `ci-check --quick` の cwd 依存を解消する

<!-- @work-item-id WI-364 -->

## 背景

WI-351 は `check-change-category` について、`createQuickModeCompositionRoot()` に
解決済みの `configPath` / `rootDir` を注入する `resolveQuickModeCompositionOptions()` を
導入した。しかし同じ composition root を使う `ci-check --quick` 側（`main.ts`）は
引数無しの `createQuickModeCompositionRoot()` のまま残っていた。

無指定の場合:

- `HarnessConfigQuickModeConfigAdapter` は `process.cwd()/phasegate.config.json` を読む
- `FsFileExistenceAdapter` は `process.cwd()` を基準に CREATE/MODIFY を推定する

このためサブディレクトリから `npx phasegate ci-check --quick` を実行すると
`HarnessConfigNotFoundError` が送出され、`CiCheckQuickModeHandler` の catch で
`process.exit(2)` になり、出力が一切得られなかった（config が見つかった場合でも
CREATE/MODIFY 推定基準が hook 側とずれる）。

## 修正

`ci-check --quick` でも `await resolveQuickModeCompositionOptions()` の結果を注入する。
既存関数の再利用のみで、解決ロジック自体は変更しない
（config 未検出・不正時は従来どおり `getProjectRoot()` へフォールバックする fail-open）。

## テスト

`scripts/harness/__tests__/integration/harness-api/ci-check-quick-rootdir.integration.test.ts`
（WI-351 の `check-change-category-rootdir.integration.test.ts` に倣った subprocess 実行テスト）

- サブディレクトリ実行: exit 0 かつ `eligibility.eligible === true`
- プロジェクトルート実行: 既存挙動が不変であること

修正前は前者が exit 2（stdout 空 → JSON パース失敗）で赤になることを確認済み。
