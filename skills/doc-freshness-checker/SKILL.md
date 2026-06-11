---
name: doc-freshness-checker
description: 設計文書の鮮度チェック（L4バリデータ拡張）。`phasegate check-freshness` CLIを使い、設計文書の最終更新日が閾値を超えていないか、コード変更と設計文書の乖離がないかを検出する。使用タイミング: 「設計文書が古くなっていないか確認して」「ドキュメントの鮮度チェックを実行して」「L4 freshness チェック」「設計とコードの乖離を調べて」など。
model: sonnet
review: opus
languages: [typescript]
---

# Doc Freshness Checker

設計文書の鮮度（freshness）を検証し、古くなった文書や対応コードとの乖離を検出するスキル。
`phasegate check-freshness` CLIをラップし、結果を解釈・対処する。

## 前提条件

- `phasegate.config.json` に `docFreshnessThresholds` が設定されていること（未設定時はデフォルト値使用）
- git リポジトリ内で実行すること（最終更新日は `git log` で判定）

---

## ⚠️ 2フェーズ実行ルール

- **Phase 1（計画）**: チェック対象スコープを確認し、人間の承認を得る
- **Phase 2（実行）**: CLIを実行し、結果を解釈してアクションを提案する

**Phase 1/2を同時に実行してはならない。**

---

## Phase 1: チェック計画（plan）

### 出力（会話内のみ）

```markdown
# Doc Freshness チェック計画

## チェック対象スコープ
- ディレクトリ: {phasegate.config.json の constructionDir、デフォルト: docs/}
- 閾値: {phasegate.config.json の値 or デフォルト 30日}

## 実行コマンド
npx phasegate check-freshness [--dir {path}] [--threshold {days}]

## QA
[Question] Q1: ...
[Answer]
```

### Phase 1 完了条件
- スコープを報告した
- 人間にボールを渡した
- **CLIはまだ実行していない**

---

## Phase 2: 実行（execution）

### Step 1: CLIの実行

```bash
npx phasegate check-freshness
```

オプション:
- `--dir <path>` — チェック対象ディレクトリ（デフォルト: `phasegate.config.json` の `constructionDir`）
- `--threshold <days>` — 警告閾値（日数）

### Step 2: 結果の解釈

`CheckDocFreshnessOutput` の構造:

| フィールド | 意味 |
|-----------|------|
| `results[].status` | `ok` / `warn` / `error` |
| `results[].documentPath` | チェック対象ファイルパス |
| `results[].daysSinceUpdate` | 最終更新からの日数 |
| `results[].threshold` | 設定閾値 |
| `summary.error` | エラー件数（即対応必要） |
| `summary.warn` | 警告件数（確認推奨） |

### Step 3: アクションの提案

| 状態 | 推奨アクション |
|------|--------------|
| `error`（閾値超過） | cascade-updater で上位設計文書を更新 |
| `warn`（閾値近接） | 設計文書の内容確認・必要に応じて更新 |
| `ok` | 対応不要 |

### 出力フォーマット

```markdown
# Doc Freshness チェック結果

## サマリー
- 総ドキュメント数: N
- ok: N / warn: N / error: N

## 要対応（error）
| ファイル | 最終更新 | 閾値超過日数 | 推奨アクション |
|---------|---------|------------|--------------|

## 要確認（warn）
| ファイル | 最終更新 | 残り日数 |
|---------|---------|---------|

## 次のアクション
（errorがある場合は `cascade-updater` の実行を提案）
```

---

## phasegate.config.json 設定例

```json
{
  "docFreshnessThresholds": {
    "domain_model.md": 90,
    "logical_design.md": 60,
    "unit_test_design.md": 30,
    "default": 30
  }
}
```

---

## 関連スキル

| スキル | 用途 |
|-------|------|
| `cascade-updater` | errorが検出された設計文書の更新 |
| `consistency-checker` | 文書間整合性の検証（freshness修正後の確認） |
