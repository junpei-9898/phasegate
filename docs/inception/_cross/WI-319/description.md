---
id: WI-319
type: fix
severity: medium
status: drafted
affects: [validator-system]
source: github#39
---

# WI-319: project.languages 未宣言時のファイルシステム言語検出

<!-- @work-item-id WI-319 -->

## 背景

`HarnessConfigValidatorConfigAdapter.getProjectLanguages()` は、config の `project.languages` が未宣言のとき無条件に `["typescript"]` へフォールバックしていた。ファイルシステムからの言語検出が存在しないため、`pyproject.toml` しか無い純 Python プロジェクトでも TS 専用 validator（L3-002 / L3-003 / L4-003）が既定で対象になり、L3-003 が「vitest でカバレッジを出せ」と fail していた。#28 で言語ゲート機構は導入されたが、検出が未実装だった（issue #28 のフォローアップ、github#39）。

## 修正

- `getProjectLanguages()` にファイルシステム検出を追加:
  1. config の `project.languages` 宣言があればそれを最優先で返す（従来どおり）
  2. 未宣言なら project root のマーカーファイルから検出:
     - typescript: `tsconfig.json` の存在、または `package.json` の dependencies/devDependencies に `typescript`
     - python: `pyproject.toml` / `setup.py` / `setup.cfg` / `requirements.txt`
     - go: `go.mod`、rust: `Cargo.toml`、java: `pom.xml` / `build.gradle` / `build.gradle.kts`、ruby: `Gemfile`、php: `composer.json`
  3. 検出結果が空なら従来どおり `["typescript"]` フォールバック（純 JS リポジトリ含め現状維持）
- 設計制約: phasegate 導入時に phasegate 用 `package.json` が置かれるため、**`package.json` の存在自体は typescript の根拠にしない**（typescript dep か `tsconfig.json` のみ）
- adapter コンストラクタに optional な `rootDir`（default `process.cwd()`）を追加。既存呼び出し元（composition-root）は変更不要
- `package.json` の parse 失敗は typescript 根拠なしとして扱い throw しない（同期 fs で軽量に検出）
- 既存 adapter テストに temp dir fixture ベースの検出テスト 7 ケースを追加
