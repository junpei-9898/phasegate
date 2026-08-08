# WI-385 Unit Test Design

<!-- @work-item-id WI-385 -->

## Payload normalizer

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI385-NORM-001 | snake_case flat payload を検出する | legacy profile と canonical tool input |
| UT-WI385-NORM-002 | camelCase flat payload を検出する | compatibility deny profile |
| UT-WI385-NORM-003 | nested toolCall payload を検出する | top-level deny profile |
| UT-WI385-NORM-004 | 複数形状を同時に満たす | ambiguous error、deny |
| UT-WI385-NORM-005 | agent / model field だけが異なる | 正規化結果が同一 |
| UT-WI385-NORM-006 | 未知 key を含む | 無視して正規化 |
| UT-WI385-NORM-007 | snake_case Write の paths 配列 | 全 path を canonical input に保持 |
| UT-WI385-NORM-008 | toolCall record の args key が未知 | nested profile の top-level deny |

## Grok flat camel mapping

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI385-GROK-001 | run_terminal_command の command を受ける | canonical Bash |
| UT-WI385-GROK-002 | search_replace の file_path と差分を受ける | canonical Edit + targetChanges |
| UT-WI385-GROK-003 | write の file_path を受ける | canonical Write |
| UT-WI385-GROK-004 | write の防御的 path 候補を受ける | 最初の valid non-empty path |
| UT-WI385-GROK-005 | apply_patch の patch を受ける | WI-384 target / changeKind |
| UT-WI385-GROK-006 | command / patch が truncated | extraction error、deny |
| UT-WI385-GROK-007 | direct path payload に truncated flag がある | 完全 path があれば継続 |

## Antigravity nested mapping

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI385-AGY-001 | write_to_file の TargetFile / CodeContent を受ける | canonical Write |
| UT-WI385-AGY-002 | lower camel / snake path 候補を受ける | 同じ canonical path |
| UT-WI385-AGY-003 | replace_file_content の old/new 候補を受ける | canonical Edit |
| UT-WI385-AGY-004 | multi_replace_file_content を受ける | path 1 件、replacement 配列を許容 |
| UT-WI385-AGY-005 | run_command の CommandLine 候補を受ける | canonical Bash |
| UT-WI385-AGY-006 | 対応 write tool で path 候補が全て無い | extraction error、deny |
| UT-WI385-AGY-007 | workspacePaths が空 | process cwd fallback |

## Response renderer

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI385-RESP-001 | legacy profile を deny する | stdout 空、stderr reason、exit 2 |
| UT-WI385-RESP-002 | compatibility profile を deny する | top-level deny + hookSpecificOutput |
| UT-WI385-RESP-003 | top-level profile を deny する | decision / reason のみ |
| UT-WI385-RESP-004 | 任意 profile を allow する | stdout 空、exit 0 |
| UT-WI385-RESP-005 | 改行や quote を含む reason | parse 可能 JSON、stderr も非空 |

## Installation / CLI

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI385-INST-001 | Antigravity named map と user hook が共存する | user key 保持、phasegate-gate 更新 |
| UT-WI385-INST-002 | named map を 2 回 merge / reconcile する | byte stable / idempotent |
| UT-WI385-INST-003 | Grok compatible matcher に apply_patch が無い | red finding |
| UT-WI385-INST-004 | Grok command timeout が 5 秒または欠落 | red finding + 30 秒 repair hint |
| UT-WI385-INST-005 | Antigravity matcher / timeout が stale | red finding |
| UT-WI385-INST-006 | agent target both を解決する | Claude + Codex のみ |
| UT-WI385-INST-007 | agent target all を解決する | Grok は Claude-compatible target で重複なし |
| UT-WI385-INST-008 | grok / antigravity / all を parse する | valid、help と同じ enum |
| UT-WI385-INST-009 | Grok phasegate command の type が prompt | red finding |
| UT-WI385-INST-010 | Antigravity matcher と command を別 entry に分割 | matcher 不足の red finding |
| UT-WI385-INST-011 | grok / antigravity 単独 install | `.claude/skills` / `.agents/skills` を配置 |

## 規約

Vitest、semantic AAA、日本語かつ重複しない `it()` 名、Act の `actual` 代入を必須とする。
normalizer / extractor / selection value は実体で検証し domain 層をモックしない。test double は filesystem /
process 等の外部 Port に限定し、全更新 test に `@work-item-id WI-385` を付ける。
