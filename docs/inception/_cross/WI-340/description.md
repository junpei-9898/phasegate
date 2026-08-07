---
id: WI-340
type: fix
severity: normal
status: implemented
affects: [installation]
source: bug sweep v0.292.0 (2026-07-21) Bug#5
---

# WI-340: doctor husky-pre-commit-missing の false positive 修正

<!-- @work-item-id WI-340 -->

## 背景

husky-pre-commit-missing-check.ts のパターン表が現行の正規サブコマンド `npx phasegate pre-commit` を認識せず、旧 `$HARNESS_CMD` → 現行 `$PHASEGATE_CMD` の rename にも未追随。現テンプレートが green になるのは echo 文字列「詳細: npx phasegate lint」の偶然マッチのみで、正規のフックが red 判定される false positive。

## 修正

パターン表に `phasegate pre-commit` / `main.ts pre-commit` / `$PHASEGATE_CMD` 系 3 種を追加(旧エントリは consumer 後方互換で維持)。echo 偶然マッチ依存を検出するテスト(echo 行を除去したテンプレート変種でも green)を追加。
