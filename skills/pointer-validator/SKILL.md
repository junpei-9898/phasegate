---
name: pointer-validator
kind: advisory
description: 設計文書内のファイルポインタ（相対パス参照）の有効性を検証するスキル（L4バリデータ拡張）。`phasegate validate-pointers` CLIを使い、ドキュメント内で参照されているファイルパスが実際に存在するかチェックする。使用タイミング: 「ドキュメントのリンク切れを確認して」「ポインタ検証を実行して」「broken pointer を探して」「設計文書の参照が正しいか確認して」など。
model: sonnet
review: opus
languages: [typescript]
---

# Pointer Validator

## 目的

設計文書内のファイルパス参照（ポインタ）の有効性を検証するスキル。
`phasegate validate-pointers` CLIをラップし、broken pointer を検出・修正案を提示する。

## 入力

- 対象ディレクトリ: `--dir <path>`（デフォルト `docs/`）配下の設計文書
- 検証対象ポインタ: Markdown `[text](path)` リンク / `@file:` `@ref:` / `filePath:` フィールドのパス参照（`http(s)://` URL は対象外）

## CLIの動作

`p2:validate-pointers` は以下を検出する:
- Markdownの `[text](path)` 形式のリンク
- `@file:` / `@ref:` 形式のポインタ
- `filePath:` YAML/JSON フィールド内のパス参照
- URLポインタはスキップ（`http://` / `https://` は検証対象外）

---

## ワークフロー（単一フェーズ）

このスキルは軽量チェックのため単一フェーズで実行する。

### Step 1: CLIの実行

```bash
npx phasegate validate-pointers
```

オプション:
- `--dir <path>` — スキャン対象ディレクトリ（デフォルト: `docs/`）
- `--fix` — 自動修正可能なポインタを修正（要確認）

### Step 2: 結果の解釈

`ValidateDocPointersOutput` の構造:

| フィールド | 意味 |
|-----------|------|
| `results[].documentPath` | ポインタを含む文書ファイル |
| `results[].pointerTarget` | 参照先パス |
| `results[].pointerType` | `file-path` / `url` |
| `results[].isResolvable` | 解決可能かどうか |
| `results[].errorMessage` | エラー内容（nullなら正常） |
| `summary.brokenPointers` | broken件数 |
| `summary.skippedUrlPointers` | URLスキップ件数 |
| `passed` | 全ポインタ有効ならtrue |

### Step 3: 修正戦略の判断

| broken原因 | 推奨アクション |
|-----------|--------------|
| ファイルが移動された | ポインタのパスを新パスに更新 |
| ファイルが削除された | ポインタを削除 or 代替ファイルに変更 |
| タイポ | パス修正 |
| 未作成ファイルへの参照 | 意図的な前方参照として `[TODO]` マーカーを追加 |

### 出力フォーマット

```markdown
# Pointer Validation 結果

## サマリー
- チェックドキュメント数: N
- 総ポインタ数: N
- broken: N / URL(スキップ): N

## Broken Pointers（要修正）
| 文書ファイル | 参照先 | エラー | 推奨修正 |
|------------|--------|--------|---------|

## 次のアクション
（brokenがある場合）
1. 上記テーブルの broken pointer を修正
2. `npx phasegate validate-pointers` を再実行して0件を確認
```

---

## 注意事項

- URL（`http://` / `https://`）は検証対象外（ネットワーク依存を避けるため）
- `--fix` オプションは明確な移動・リネームのみ自動修正。曖昧なケースはスキップ
- broken件数 > 50 の場合は `--dir` でスコープを絞って段階的に対処する

---

## 関連スキル

| スキル | 用途 |
|-------|------|
| `doc-freshness-checker` | 設計文書の鮮度チェック（セットで実行推奨） |
| `consistency-checker` | 文書間の内容整合性チェック |
