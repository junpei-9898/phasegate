---
id: WI-323
type: fix
severity: normal
status: implemented
affects: [agent-integration]
source: verification-followup (github#40 残課題)
---

# WI-323: stop hook が session_id 欠落 payload で exit 2 fail し開発フローを止める

<!-- @work-item-id WI-323 -->

## 背景

`scripts/harness/agent-integration/presentation/stop-hook.ts` は stdin JSON payload に
`session_id` が無いと `exit(2)` で fail していた。これは WI-314 (github#40) で確立した
「ゲート機能を持たない hook は環境不備で開発フローを止めない (fail-open)」方針と不整合。
呼び出し側 (Claude Code / Codex 等) の payload 差異という環境不備で turn が block され得る。

同種調査の結果、`post-tool-use-hook.ts` にも `tool_name` 欠落 → `exit(2)` の同型問題が
あった (PostToolUse はツール実行後の lint フィードバックでありゲートではない)。
一方 `pre-tool-use-hook.ts` の `tool_name` 欠落 `exit(2)` は書き込みゲートとして
**意図的な fail-closed** であり変更しない (fail-open にするとゲート迂回になる)。
session-start / user-prompt-submit にはフィールド欠落による exit 2 経路は存在しない。

## 修正

- **stop-hook.ts** (presentation 層のみ): `session_id` 欠落時に
  (1) stderr へ日本語警告、(2) `recordHookSkipEvent` で reason `SESSION_ID_MISSING` を
  `.phasegate/hook-skip-events.jsonl` に記録、(3) `exit(0)`。
- **post-tool-use-hook.ts**: `tool_name` 欠落時に同パターン (reason `TOOL_NAME_MISSING`)。
- **handle-stop-usecase の契約は不変**: 空 `sessionId` でエラーを返す usecase の既存契約・
  既存テストは維持 (presentation 入口でガードする設計)。

## Acceptance Criteria

- [x] stop hook は session_id 欠落 payload で exit 0 (stderr 警告 + SESSION_ID_MISSING 記録)
- [x] post-tool-use hook は tool_name 欠落 payload で exit 0 (stderr 警告 + TOOL_NAME_MISSING 記録)
- [x] pre-tool-use hook の tool_name 欠落 exit 2 (fail-closed) は変更されない (回帰ガードテストあり)
- [x] handle-stop-usecase の空 sessionId エラー契約は不変
- [x] spawn 統合テスト (`hook-missing-field-fail-open.integration.test.ts`) が green
