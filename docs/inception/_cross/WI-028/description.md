---
id: WI-028
type: refactor
severity: normal
status: tested
affects: [docs]
---

# WI-028: `migrate work-items` + WI taxonomy のドキュメント整備

> 起票日: 2026-04-25
> 親作業: WI-026 / WI-027（v0.101.0..v0.107.0 の 7 リリース）

## 背景

WI-026 (v0.100.0..v0.104.0) で `phasegate migrate work-items` CLI と WI taxonomy（`type: story|issue|refactor|fix|chore` / `legacy_id` / `affects`）が導入され、WI-027 (v0.105.0..v0.107.0) で H-ID 検出拡張 + reflection adapter の unit-scoped legacy_id 解決 + apply gateway 冪等化が完了した。一方で **公開ドキュメント側は WI-026 開始時点の状態のまま**で、以下のギャップがある:

| ファイル | ギャップ |
|---|---|
| `CHANGELOG.md` | v0.100.0 までしか記載されておらず、`[Unreleased]` も空。v0.101..v0.107 の 7 リリースが未記録 |
| `README.md` / `README.ja.md` | CLI Reference 表に `migrate work-items` が未掲載 |
| `docs/guide/cli-reference.md` | `migrate work-items` 専用セクション無し（`ci:migrate-agents-md` 等の他 migrate のみ言及） |

外部 user / dogfood 利用者が `migrate work-items` の存在 / 使い方 / WI frontmatter 形式を知る経路が事実上存在しないため、本 WI で整備する。

## 本 WI でやること

1. `CHANGELOG.md` に v0.101..v0.107 を Keep-a-Changelog 形式で追記
   - WI-026 phase A〜D の総括（v0.101..v0.104）
   - WI-027 の H-ID 検出拡張 + reflection adapter 拡張 + apply gateway 冪等化（v0.105..v0.107）
2. `README.md` / `README.ja.md` の CLI Reference 表に `migrate work-items` を追加
3. `docs/guide/cli-reference.md` に **Work Item Migration** セクション新設
   - `migrate work-items --dry-run` / `--apply` の使い方
   - 検出パターン: `ISSUE-XXX` / `WI-XXX` / `H{NN}-{NN}`
   - WI frontmatter 形式（`id` / `type` / `severity` / `status` / `legacy_id` / `affects`）
   - sequential allocator の挙動と既存 WI 番号予約
   - `legacy_id` を介した grep 互換性

## 受け入れ基準

- [x] `CHANGELOG.md` に v0.101..v0.107 の 7 リリースが記録される（`[Unreleased]` 見出しは Keep-a-Changelog の通常運用として維持）
- [x] `README.md` の CLI Reference 表に `migrate work-items` が追加される（v0.108.0）
- [x] `README.ja.md` の CLI コマンド表に `migrate work-items` が追加される（v0.108.0、v0.112.0 で説明強化）
- [x] `docs/guide/cli-reference.md` に Work Item Migration セクションが追加され、dry-run / apply 両モードと frontmatter 形式が解説される（v0.108.0）
- [x] 既存の他 CLI コマンド説明スタイルと体裁が揃う
- [x] `docs/folder_management_rules.md` が WI taxonomy（v0.105.0 仕様）に全面改訂される（v0.112.0）
- [x] README.md / README.ja.md に「Document Lifecycle / ドキュメント・ライフサイクル」節が追加され、`@work-item-id` / `type` / state machine が説明される（v0.112.0）

## スコープ外

- 新規コード追加（本 WI は docs only、source 改変なし）
- README 全体の構成見直し（migrate work-items 追記のみ）
- WI-029 以降のロードマップ

## 完了メモ

2026-05-09 監査で CHANGELOG.md の v0.101.0〜v0.107.0 記録、README.md / README.ja.md の
`migrate work-items` 追記、docs/guide/cli-reference.md の Work Item Migration セクションを確認した。
`[Unreleased]` は未解消ではなく changelog の通常見出しとして残す。
