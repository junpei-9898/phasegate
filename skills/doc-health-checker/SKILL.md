---
name: doc-health-checker
kind: advisory
description: 設計文書の健全性（鮮度 + ポインタ有効性）を L4 バリデータ CLI で診断・対処するスキル。`npx phasegate p2:check-freshness`（鮮度・code-design drift, L4-004）と `npx phasegate p2:validate-pointers`（壊れたファイルパスポインタ, L4-005）をラップし、結果を解釈して修正アクションを提案する。使用タイミング:「設計文書が古くなっていないか確認して」「ドキュメントの鮮度チェック」「設計とコードの乖離を調べて」「ドキュメントのリンク切れを確認して」「broken pointer を探して」「設計文書の参照が正しいか確認して」「L4 doc health チェック」など。
model: sonnet
review: opus
languages: [typescript]
---

# Doc Health Checker

## 目的

設計文書の健全性を 2 つの観点で機械的に検証し、結果を解釈して修正アクションを提案する advisory スキル。旧 `doc-freshness-checker`（鮮度）と旧 `pointer-validator`（ポインタ有効性）を統合したもの。

1. **鮮度（freshness）— L4-004**: 設計文書の最終更新が古すぎないか、コード変更と設計文書の乖離（code-design drift）がないかを検出する。`npx phasegate p2:check-freshness` をラップする。
2. **ポインタ有効性（pointer validity）— L4-005**: 設計文書内で参照されているファイルパスポインタが実在するか（broken pointer）を検出する。`npx phasegate p2:validate-pointers` をラップする。

いずれも L4 バリデータの CLI 拡張であり、本スキルは CLI を実行して結果を解釈し、ユーザーに対処案を提示する。

> **重要（CLI 名の正）**: コマンドは必ず `p2:` 接頭辞付きで呼ぶ。無接頭辞の `phasegate check-freshness` / `phasegate validate-pointers` は **存在しない誤った表記**（旧スキルの記載は誤りだった）。正しくは `npx phasegate p2:check-freshness` / `npx phasegate p2:validate-pointers`。

## 対象読者・使いどころ

- 設計文書（`docs/product/construction/` や `docs/inception/` 配下の `.md`）が実装から取り残されていないか、参照リンクが壊れていないかを点検したいとき。
- リリース前・大規模リファクタ後・Unit 完了時のドキュメント健全性確認。
- 軽量チェックのため、鮮度とポインタの両方をまとめて走らせるのが基本運用。

## CLI リファレンス

### 1. 鮮度チェック — `p2:check-freshness`（L4-004）

```bash
npx phasegate p2:check-freshness [--pattern <glob>] [--format text|json] [--dry-run]
```

| オプション | 意味 |
|-----------|------|
| `--pattern <glob>` | 対象ファイルの glob（未指定時は config の設計文書パスが対象） |
| `--format text\|json` | 出力形式（デフォルト `text`） |
| `--dry-run` | 副作用なしで診断のみ |

`CheckDocFreshnessOutput` の主なフィールド:

| フィールド | 意味 |
|-----------|------|
| `results[].status` | `ok` / `warn` / `error` |
| `results[].documentPath` | チェック対象ファイル |
| `results[].daysSinceUpdate` | 最終更新からの日数 |
| `results[].threshold` | 設定閾値 |
| `summary.error` | error 件数（exit code 1 になる） |
| `summary.warn` | warn 件数 |

**exit code**: `summary.error > 0` なら 1、それ以外 0。

### 2. ポインタ検証 — `p2:validate-pointers`（L4-005）

```bash
npx phasegate p2:validate-pointers [--pattern <glob>] [--include-urls] [--format text|json]
```

| オプション | 意味 |
|-----------|------|
| `--pattern <glob>` | 対象ファイルの glob（未指定時は config の設計文書パスが対象） |
| `--include-urls` | URL ポインタ（`http(s)://`）も検証対象に含める（デフォルトは file-path のみ） |
| `--format text\|json` | 出力形式（デフォルト `text`） |

検出対象ポインタ: Markdown `[text](path)` リンク / `@file:` `@ref:` / `filePath:` フィールドのパス参照。`http(s)://` URL は `--include-urls` 指定時のみ検証。

`ValidateDocPointersOutput` の主なフィールド:

| フィールド | 意味 |
|-----------|------|
| `results[].documentPath` | ポインタを含む文書 |
| `results[].pointerTarget` | 参照先パス |
| `results[].pointerType` | `file-path` / `url` |
| `results[].isResolvable` | 解決可能かどうか |
| `results[].errorMessage` | エラー内容（null なら正常） |
| `summary.brokenPointers` | broken 件数 |
| `summary.skippedUrlPointers` | スキップした URL 件数 |
| `passed` | 全ポインタ有効なら true |

**exit code**: `passed` なら 0、broken があれば 1。

> **注意**: このスキルの CLI には自動修正フラグ（`--fix`）は存在しない。ポインタ修正は結果を解釈したうえで手動（`Edit`）で行う。

## ワークフロー

軽量チェックのため単一フェーズで実行する。鮮度とポインタは独立なので、必要に応じて片方だけ／両方を走らせる。

### Step 1: 実行

```bash
# 両方まとめて（推奨）
npx phasegate p2:check-freshness --format json
npx phasegate p2:validate-pointers --format json
```

大量に broken が出そうな大規模リポジトリでは `--pattern` でスコープを絞って段階実行する。

### Step 2: 結果の解釈とアクション

**鮮度（freshness）**:

| 状態 | 推奨アクション |
|------|--------------|
| `error`（閾値超過 / drift 疑い） | `cascade-updater` で上位設計文書を更新、コードと設計の乖離を解消 |
| `warn`（閾値近接） | 設計文書の内容を確認し、必要に応じて更新 |
| `ok` | 対応不要 |

**ポインタ（pointer）**: broken の原因別に対処する。

| broken 原因 | 推奨アクション |
|-----------|--------------|
| ファイルが移動された | ポインタのパスを新パスに更新（`Edit`） |
| ファイルが削除された | ポインタを削除 or 代替ファイルに変更 |
| タイポ | パス修正 |
| 未作成ファイルへの前方参照 | 意図的なら `[TODO]` マーカーを付ける |

修正後は同じコマンドを再実行して 0 件（`passed: true` / `summary.error: 0`）を確認する。

### 出力フォーマット（ユーザー報告例）

```markdown
# Doc Health チェック結果

## 鮮度（p2:check-freshness / L4-004）
- 総ドキュメント数: N ／ ok: N / warn: N / error: N
### 要対応（error）
| ファイル | 最終更新 | 閾値超過日数 | 推奨アクション |
|---------|---------|------------|--------------|

## ポインタ（p2:validate-pointers / L4-005）
- チェック文書数: N ／ broken: N / URL(スキップ): N
### Broken Pointers（要修正）
| 文書ファイル | 参照先 | エラー | 推奨修正 |
|------------|--------|--------|---------|

## 次のアクション
（error があれば cascade-updater、broken があれば該当ポインタの Edit を提案）
```

## 関連スキル

| スキル | 用途 |
|-------|------|
| `cascade-updater` | 鮮度 error が出た設計文書の連鎖更新 |
| `consistency-checker` | 文書間の内容整合性チェック（健全性修正後の確認） |
