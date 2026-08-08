# WI-385 Integration Test Design

<!-- @work-item-id WI-385 -->

## 実 payload fixtures

fixture は値を最小化せず、runtime が実際に付ける識別・workspace field と未知 field を含める。

- Grok: `hookEventName`, `sessionId`, `cwd`, `workspaceRoot`, `permissionMode`, `toolName`,
  `toolInput`, `toolUseId`, optional `toolInputTruncated`
- Antigravity: `toolCall{name,args}`, `conversationId`, `workspacePaths`, `transcriptPath`, `modelName`, `stepIdx`
- Claude / Codex: WI-384 の snake_case fixture を回帰利用

## PreToolUse process integration

| ID | シナリオ | 期待結果 |
|---|---|---|
| IT-WI385-GROK-001 | search_replace で protected file | stdout decision deny JSON、stderr path/reason、exit 2 |
| IT-WI385-GROK-002 | run_terminal_command で phase 未反映 path | Bash extractor 経由で deny |
| IT-WI385-GROK-003 | apply_patch の Add/Delete 混在 | kind を保持し 1 違反で全体 deny |
| IT-WI385-GROK-004 | 許可済み write | exit 0、stdout 空 |
| IT-WI385-GROK-005 | truncated patch | mutation 前 deny |
| IT-WI385-AGY-001 | write_to_file の verified 候補 key | phasegate check へ到達 |
| IT-WI385-AGY-002 | replace / multi replace の protected path | top-level deny JSON、stderr、exit 2 |
| IT-WI385-AGY-003 | run_command の redirect write | Bash extractor 経由で deny |
| IT-WI385-AGY-004 | args key 不明 | fail-closed deny と受理候補 guidance |
| IT-WI385-AGY-005 | 許可済み write | exit 0、stdout 空 |
| IT-WI385-REG-001 | Claude Write / Edit / Bash | stdout / stderr / exit の既存契約不変 |
| IT-WI385-REG-002 | Codex native apply_patch / Bash heredoc | WI-384 契約不変 |
| IT-WI385-REG-003 | Quick Mode allow / Full Mode deny | shape に依存せず同じ use case result |
| IT-WI385-REG-004 | snake_case Write の paths に protected path | 全 path を gate へ渡し legacy deny |
| IT-WI385-AGY-006 | toolCall record だが args key 名が未知 | top-level deny JSON、stderr、exit 2 |

process test は temp project と tracked fixtures を使い、self-repo の open WI / generated artifact に依存しない。
stdout は JSON.parse と exact field、stderr は非空 reason、exit は 0 / 2 を別々に assertion する。

## Install / reconcile / doctor integration

| ID | シナリオ | 期待結果 |
|---|---|---|
| IT-WI385-INST-001 | install --agent grok | compatible `.claude/settings.json` + `.claude/skills` + AGENTS、`.grok` なし |
| IT-WI385-INST-002 | install --agent antigravity | `.agents/hooks.json` named map + `.agents/skills` + AGENTS |
| IT-WI385-INST-003 | install --agent both | 既存 Claude + Codex target と snapshot 不変 |
| IT-WI385-INST-004 | install --agent all | 全 target、Grok duplicate hook なし |
| IT-WI385-INST-005 | user named hook と reconcile | user key 保持、phasegate-gate だけ更新、2 回目 no-op |
| IT-WI385-INST-006 | doctor --agent grok | matcher / timeout finding + trust notice |
| IT-WI385-INST-007 | doctor --agent antigravity | schema finding + CLI-only notice |
| IT-WI385-INST-008 | doctor --agent both | shared Claude-compatible 構造 finding は applicable、Antigravity finding は scope out |
| IT-WI385-INST-009 | deprecated init / setup:agent の新 enum | install と同じ target mapping |
| IT-WI385-INST-010 | human / JSON output | operator notices を両形式で保持 |

## Template integrity

root `.claude/settings.json` と bundled template の phasegate matcher / timeout を structural assertion する。
Antigravity template は JSON schema shape、matcher regex、command、timeout を assertion する。Phase 2 の template
変更後に integrity pin / verify を同一 commit で実行し、manifest mismatch を残さない。

## 未検証契約の扱い

Antigravity args の実キーは community / upstream 情報だけで確定扱いにしない。defensive candidates を自動 fixture で
固定した上で、実機 smoke 結果は「verified key」として docs に追記する。hook crash / timeout 時の runtime
fail-open・closed と exit code 単独の意味は未文書化なので、top-level deny JSON を authority とし、断定しない。
