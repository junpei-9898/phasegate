# WI-384 Integration Test Design

<!-- @work-item-id WI-384 -->

## Native Codex payload compatibility

fixture は upstream の実 payload 形に合わせ、最低限次を含める。

```json
{
  "cwd": "<temp-project>",
  "hook_event_name": "PreToolUse",
  "model": "gpt-5-codex",
  "permission_mode": "default",
  "session_id": "session-001",
  "tool_input": { "command": "*** Begin Patch\n...\n*** End Patch" },
  "tool_name": "apply_patch",
  "tool_use_id": "tool-001",
  "transcript_path": "<transcript>",
  "turn_id": "turn-001"
}
```

| ID | Scenario | Expected |
|---|---|---|
| IT-WI384-CODEX-001 | 許可済み docs への Update patch | exit 0、stdout 空、ask / allow JSON なし |
| IT-WI384-CODEX-002 | protected file への Update patch | exit 2、stderr に path と block reason |
| IT-WI384-CODEX-003 | phase-gate 未反映 Unit への Add patch | CREATE として gate に入り exit 2 |
| IT-WI384-CODEX-004 | Full Mode 必須 path の Delete patch | DELETE として判定され、session 無しなら exit 2 |
| IT-WI384-CODEX-005 | Update / Add / Delete 混在で 1 件が違反 | patch 全体を exit 2 で deny |
| IT-WI384-CODEX-006 | `tool_name=apply_patch` で command 欠落 | 非空 stderr + exit 2、fail-open しない |
| IT-WI384-CODEX-007 | PostToolUse apply_patch payload | payload を受理し既存 lint / skip 経路へ進む |
| IT-WI384-CODEX-008 | optional agent_id / agent_type 付き payload | 未使用 field を許容して同じ結果 |

process integration は `codex-payload-compatibility.integration.test.ts` を拡張し、temp project を使って
self-repo の open WI や現在の filesystem state に結果を依存させない。

## Hook template and lifecycle

| ID | Scenario | Expected |
|---|---|---|
| IT-WI384-HOOK-001 | root と template の hook JSON を読む | byte-equivalent、pre/post matcher は `Bash|apply_patch` |
| IT-WI384-HOOK-002 | install/init で Codex hooks を配置する | minimum version と `/hooks` trust notice |
| IT-WI384-HOOK-003 | reconcile で Bash-only managed hooks を更新する | matcher 更新 + hash 再 trust notice |
| IT-WI384-HOOK-004 | doctor が Bash-only hooks を検査する | red + reconcile + `/hooks` 案内 |
| IT-WI384-HOOK-005 | doctor が current hooks を検査する | hook finding なし、trust unverifiable advisory |
| IT-WI384-HOOK-006 | JSON output を選ぶ | notice が構造化 field に残り exit semantics 不変 |

## Backward compatibility

| ID | Scenario | Expected |
|---|---|---|
| IT-WI384-REG-001 | Codex `tool_name=Bash` + redirect | 既存 pre-tool block / allow が不変 |
| IT-WI384-REG-002 | Codex Bash heredoc apply_patch | 既存 hard block が不変 |
| IT-WI384-REG-003 | Claude Write / Edit payload suites | 既存 pre-tool semantics が不変 |
| IT-WI384-REG-004 | L2 pre-commit | native hook 対応後も backstop が有効 |

全 test は Vitest、日本語 `it()`、semantic AAA、`actual` 変数、domain non-mock、重複名禁止に従う。

