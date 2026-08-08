# WI-385 Domain Model: shape-based hook compatibility

<!-- @work-item-id WI-385 -->

## PayloadShape

presentation 境界が未信頼 JSON の構造だけから導出する識別子。agent 名は含めない。

| value | structural predicate | response profile |
|---|---|---|
| `FLAT_SNAKE_CASE` | string `tool_name` と object `tool_input` | `LEGACY_EXIT_ONLY` |
| `FLAT_CAMEL_CASE` | string `toolName` と object `toolInput` | `COMPATIBILITY_DENY_ENVELOPE` |
| `NESTED_TOOL_CALL` | object `toolCall` 内の string `name` と object `args` | `TOP_LEVEL_DENY_ENVELOPE` |

同時に複数 predicate を満たす曖昧 payload は優先順位で推測せず deny する。特に snake_case と
camelCase の alias が同時に存在する payload は、値が同じでも無条件 deny とする。将来 Grok が互換 alias を
併記した場合に可用性を失う既知リスクがあるため、runtime fixture を確認してから predicate を改訂する。
JSON parse 不能時は shape を導出できないため既存の stderr + exit 2 を使う。一方、`toolCall` object が存在する
近傍形状では Antigravity profile を安全側に選び、`name` / `args` の key が不明でも top-level deny JSON を返す。

## NormalizedPreToolUseRequest

application へ渡す agent-neutral DTO。

| field | type | invariant |
|---|---|---|
| `shape` | `PayloadShape` | 構造検出済み |
| `responseProfile` | `HookResponseProfile` | shape から全単射で導出 |
| `cwd` | `string?` | flat payload の `cwd`、nested payload の workspacePaths[0]、なければ process cwd |
| `toolName` | `string` | runtime 語彙を canonical `Write` / `Edit` / `Bash` / `apply_patch` へ正規化 |
| `toolInput` | canonical input | path / paths / command / patch / before / after のみ |
| `inputTruncated` | `boolean` | 明示フラグが無ければ false |

`sessionId`、`conversationId`、`modelName`、`permissionMode` 等は fixture compatibility には含めるが、
authorization や agent 判別には使わない。

## HookResponseProfile

外部 runtime への presentation 契約であり domain policy ではない。

- `LEGACY_EXIT_ONLY`: deny は非空 stderr + exit 2、stdout 空。
- `COMPATIBILITY_DENY_ENVELOPE`: deny は stdout に top-level `{decision:"deny",reason}` と
  `hookSpecificOutput.permissionDecision="deny"` を同一 JSON で併記し、stderr + exit 2 も返す。
- `TOP_LEVEL_DENY_ENVELOPE`: deny は stdout の top-level `{decision:"deny",reason}` と stderr + exit 2。
- allow は全 profile で exit 0 + stdout 空。runtime permission を Phasegate が上書きしない。

## WriteIntent extraction invariants

既存 `ApplyPatchWriteTargetExtractor` と `BashWriteTargetExtractor` は domain service として再利用し、
normalizer 自体は外部 schema から canonical input への変換だけを担う。

1. direct path tool は候補キーの非空 string path、または既存 snake_case `paths` 配列から 1 件以上得る。
2. command tool は非空 command を Bash extractor へ渡す。
3. patch tool は raw patch を WI-384 extractor へ渡し、全 directive の kind を保持する。
4. multi replace は file path を 1 回だけ抽出し、content candidate は既存 `targetChanges` の補助情報とする。
5. 対応 write tool なのに抽出不能、曖昧 shape、切り詰めで target 完全性を証明不能なら fail-closed deny。
6. workspace 外 path filtering、protected file、phase gate、story reflection、Quick / Full Mode は既存 use case に委譲する。

Antigravity args の候補キーは Phase 2 で fixture 化し、少なくとも
`TargetFile` / `targetFile` / `target_file` / `filePath` / `file_path` / `path`、
`CodeContent` / `codeContent` / `content`、`CommandLine` / `command` / `Command` を防御的に受理する。
候補を増やしても agent 名分岐は追加しない。

## Installation selection contract

`AgentTarget` は `claude | codex | both | grok | antigravity | all`。
`both` は後方互換として Claude + Codex のみ、`all` は全 runtime を表す。Grok は
Claude-compatible settings と skill discovery を共有するため `.grok` target を追加せず `.claude/skills` を使う。
Antigravity CLI は project skill を `.agents/skills` から discover するため同 path を shared `skills/` へ接続する。
Antigravity named hook map は
既存 event-map JSON と merge semantics が違うため、phasegate-owned named definition だけを置換する
dedicated merge / reconcile policy を持つ。
