---
id: WI-344
type: fix
severity: high
status: drafted
affects: [agent-integration]
source: bug sweep v0.292.0 (2026-07-21) 既知残課題① / exocortex レビュー残課題①
---

# WI-344: BashWriteTargetExtractor が fd 複製 `2>&1` を書き込み先と誤抽出する問題の修正

<!-- @work-item-id WI-344 -->

## 背景

リダイレクト抽出ループが `>` の右隣トークンを無条件に書き込み先として拾うため、fd 複製(`2>&1` / `1>&2` / `>&2`)の `&`(または `&1` 等)を書き込みターゲットと誤認する。read-only の `cat x.log 2>&1` が bugfix 非許可 config で exit 2 誤ブロックされ、許可 config でも effectiveToolName='Write' 偽装によりフェーズゲート対象化される(実測済み)。

## 修正

fd 複製形式(`>&N` / `N>&M` / `&` 単独トークン)を書き込み先抽出から除外。`N> file` 形式の実ファイルリダイレクトは引き続き抽出する(fail-closed 維持)。
