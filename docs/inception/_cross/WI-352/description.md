---
id: WI-352
type: fix
severity: high
status: implemented
affects: [quick-mode]
source: GitHub issue #27 Defect A の実質的残り（greenfield な初期セットアップが恒久的にブロックされる）
---

# WI-352: リポジトリ直下の bootstrap 設定ファイルを config に分類する

<!-- @work-item-id WI-352 -->

## 背景

`categorizeFile` が `config` と判定するのは `*.config.json` / `*.config.ts` /
`phasegate.config.json` / `.github/workflows/*.y(a)ml` のみだった。
`.gitignore` や `tsconfig.json` のような bootstrap 設定ファイルは CREATE だと
フォールバックで `feature` に落ちる。

`feature` は `allowedCategories` に入れる手段がない（Quick Mode のスコープ外カテゴリ）ため、
greenfield なプロジェクトの初期セットアップが恒久的にブロックされていた。

## 修正

リポジトリ直下の bootstrap 設定ファイルを列挙型 allowlist で `config` に分類する:

`.gitignore` / `.gitattributes` / `.editorconfig` / `.npmrc` / `.nvmrc` /
`tsconfig.json` / `tsconfig.*.json` / `.husky/` 配下。

`.github/` 全体のようなワイルドカード拡張はせず fail-closed を維持する。
`package.json` は protected-file 経路で別途保護されるため含めない。
WI-334（`.github/workflows` → config）/ WI-261（`skills/**/*.md` → docs）と同型の判断。
