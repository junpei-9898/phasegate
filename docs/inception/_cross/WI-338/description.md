---
id: WI-338
type: fix
severity: high
status: drafted
affects: [phase-dependency-model]
source: GitHub issue #33 / bug sweep v0.292.0 (2026-07-21)
---

# WI-338: QA セクション認識の書式乖離によるフェーズゲート・デッドロック修正(issue #33)

<!-- @work-item-id WI-338 -->

## 背景

markdown-plan-document-reader.ts の QA 認識パターン(`/^## QA\b/m`, `^Q:`, `^A:`)が、20 スキルファイルがユーザー/エージェントに教える実書式(`## 4. QA（不明点・確認事項）` 番号付き見出し、`### [Question]` / `[Answer]` 形式)と不一致。スキル通りに書いた計画文書の QA が「存在しない/未回答」と判定され、**Level 2+ のフェーズゲートがデッドロック**する(issue #33 で再現)。

## 修正

リーダー側の認識緩和のみで対応(skills/templates は不変更、ゲート意味論は維持):

1. 見出しパターンを番号プレフィックス許容に(`/^##+\s*(?:\d+[.．]\s*)?QA\b/m`)。
2. `### [Question]` / `[Answer]` 形式のカウント対応。ただし `[Answer]` はマーカー後に本文がある場合のみ回答済みと数える(空プレースホルダで未回答ゲートが無効化されるのを防止)。
3. 旧形式(`## QA` + `Q:`/`A:`)は後方互換維持。厳密書式をピン留めしていた既存テストを新仕様に更新。
