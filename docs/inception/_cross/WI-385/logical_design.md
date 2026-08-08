# WI-385 Logical Design: Grok / Antigravity pre-edit wiring

<!-- @work-item-id WI-385 -->

## 1. Unit と責務

| Unit | Phase 2 の責務 | 層 |
|---|---|---|
| agent-integration | payload 形状検出、canonical input mapper、response renderer、既存 extractor / gate への結線 | presentation + application DTO、既存 domain service 再利用 |
| installation | runtime target selection、Antigravity named JSON merge、template lifecycle、doctor checks / notices | domain / application / presentation |
| harness-api | `--agent` parse / help / dispatch と init / setup wiring | presentation |

新規 validator、設定キー、公開 network API、DB、Shared Kernel は追加しない。Quick Mode contract と
use case は変更せず、agent-integration が既存 `targetFilePaths` / `targetChanges` を生成する。

## 2. Normalization placement

正規化レイヤは `agent-integration/presentation` の hook 入口直後に置く。外部 runtime JSON の field 名と
response schema は adapter concern であり、domain service に持ち込まない。現行
`PreToolUseHookInput` は外部 snake_case schema と canonical input を兼ねているため、次へ分離する。

```text
unknown parsed JSON
  -> PreToolUsePayloadNormalizer (presentation, structural detection)
  -> NormalizedPreToolUseRequest (application DTO)
  -> existing target extraction / HandlePreToolUseUseCase
  -> PreToolUseResponseRenderer (presentation, responseProfile)
```

normalizer は `agent=grok` 等を受け取らず、root keys / nested object の shape だけを判定する。
`toolName` の runtime 語彙は次の canonical semantics へ写像する。

| observed name | canonical handling |
|---|---|
| `Write`, `write`, `write_to_file` | direct Write |
| `Edit`, `search_replace`, `hashline_edit`, `replace_file_content`, `multi_replace_file_content` | direct Edit |
| `Bash`, `run_terminal_command`, `run_command` | Bash extractor |
| `apply_patch` | WI-384 patch extractor |

## 3. Payload-specific mapping

### Flat snake_case

現行 Claude / Codex contract をそのまま canonical DTO へ写像する。`apply_patch` の raw value は
既存 `tool_input.command` を正本とし、Write / Edit の `tool_input.paths` 配列も canonical target 群として保持する。
回帰時の stdout / stderr / exit contract を変えない。

### Flat camelCase

`toolName` / `toolInput` / `cwd` を読む。`run_terminal_command.toolInput.command` は Bash、
`search_replace.toolInput.file_path` は Edit、`apply_patch.toolInput.patch` は patch raw body とする。
`write` は verified 候補を優先順で探索する。`toolInputTruncated=true` の command / patch は末尾 target を
失った可能性があるため deny し、direct file path tool は path が完全に得られる場合だけ継続する。

### Nested toolCall

`toolCall.name` / `toolCall.args` を読み、cwd は `workspacePaths[0]` を第一候補とする。args key は
Phase 2 の実機検証まで単一名を正本化せず、防御的候補表を pure helper で管理する。対応 write tool で
候補 path / command が得られなければ deny し、reason に tool name と受理可能 key 群を含める。`toolCall` が
record だが `name` / `args` の key 名が不明な近傍形状も nested response profile で top-level deny JSON を返す。

snake_case と camelCase predicate を同時に満たす payload は、alias 値が同一でも曖昧 shape として deny する。
将来 Grok が両 alias を併記する場合は可用性リスクになるため、既知リスクとして保持し実 payload fixture に基づいて
のみ互換判定を緩和する。

## 4. Response design

応答は input shape から導出した profile だけで出し分ける。

| shape | deny stdout | stderr | exit | allow |
|---|---|---|---|---|
| flat snake_case | empty | reason | 2 | stdout empty / 0 |
| flat camelCase | top-level deny + `hookSpecificOutput` | same reason | 2 | stdout empty / 0 |
| nested toolCall | top-level deny only | same reason | 2 | stdout empty / 0 |

Grok は top-level decision を最優先し、互換推奨の hookSpecificOutput / stderr / exit 2 も併記する。
Antigravity は documented top-level fields だけを出し、未文書化 extra field に依存しない。
JSON parse 不能は profile 不明なので既存 stderr + exit 2。shape が分かる parse 済み payload の抽出失敗は
対応 profile の deny JSON を必ず返す。

## 5. Hook distribution

### Grok

新規 `.grok/hooks` template は配らない。公式既定 ON の Claude compatibility scanner を使い、
`.claude/settings.json` を単一 managed source とする。理由は同一 command が `.claude` と `.grok` の双方から
発火する重複リスクを避け、既存配布から payload 対応だけで最小統合を成立させるためである。

PreToolUse の phasegate entries は集合として `Bash|Write|Edit|apply_patch` を覆い、各 phasegate command に
`timeout: 30` を付ける。Grok `--yolo` でも hook deny は有効だが、project hook は trust 前に silent skip
されるため、install / doctor / docs は `grok inspect`、`/hooks`、`--trust` / `/hooks-trust` を案内する。

`--agent grok` は compatible hook settings、Grok が discover する `.claude/skills`、`AGENTS.md` context を対象にする。
Claude 専用 `CLAUDE.md` は追加しない。内部 selection は hook / context / skill surface を独立 bool/set にする。

### Antigravity

`templates/.agents/hooks.json` を追加し、top-level named definition `phasegate-gate` の
PreToolUse matcher を
`write_to_file|replace_file_content|multi_replace_file_content|run_command`、command を
`npx phasegate hook pre-tool-use`、timeout を 30 とする。

既存 JSON hook merger は `{hooks:{event:[]}}` 専用なので流用しない。named map merger は user-owned top-level
keys を保持し、`phasegate-gate` だけを canonical template へ replace する。reconcile / uninstall も同じ ownership
boundary を使う。Google の Antigravity CLI project-scope Agent Skills 契約は `.agents/skills` なので、同 path を
shared root `skills/` への agent-facing link として install / reconcile / uninstall の manifest lifecycle に含める。

## 6. AgentTarget enum

公開値は `claude | codex | both | grok | antigravity | all`。

| value | semantic target |
|---|---|
| `claude` | Claude settings/context |
| `codex` | Codex hooks/context |
| `both` | 既存どおり Claude + Codex |
| `grok` | Claude-compatible pre-tool hook + `.claude/skills` + AGENTS context |
| `antigravity` | `.agents/hooks.json` + `.agents/skills` + AGENTS context |
| `all` | Claude + Codex + Antigravity。Grok は Claude-compatible hook で包含 |

default は install / doctor / setup の現行値を維持し、`both` を全 runtime の意味へ変更しない。
`init` は deprecated だが validation / deploy mapping を同じ enum へ追従させる。

## 7. Doctor design

- Claude / both / Grok scope: `.claude/settings.json` の phasegate PreToolUse matcher coverage、type command、timeout 30、command 存在を構造検査。
- Antigravity scope: `.agents/hooks.json` parse、named definition、phasegate command と同じ entry の PreToolUse matcher regex、type command、timeout 30。
- Grok trust は外部 state のため PASS 条件にしない。常時 operator notice にする。
- Antigravity IDE / desktop hook 発火も外部 state かつ現行未対応報告あり。CLI-only notice を常時表示する。
- `--agent all` は全 finding を対象とする。`both` は共有 `.claude/settings.json` の構造 finding を対象にし、Antigravity finding は scope out する。
- malformed JSON は manual red、user customization coexist は ai-assisted、phasegate-only stale config は mechanical。

## 8. Failure policy

| failure | behavior |
|---|---|
| malformed JSON / shape unknown | stderr + exit 2、profile 不明のため stdout JSON なし。`toolCall` record の近傍形状だけは top-level deny JSON |
| multiple recognized shapes | fail-closed deny |
| supported write tool で path/command 不明 | shape-specific deny JSON + stderr + exit 2 |
| truncated command / patch | 全 target を保証できないため deny |
| protected / phase / reflection / full-mode violation | existing reason を shape-specific renderer で deny |
| allowed write | exit 0 + stdout empty |
| Grok trust 未承認 | runtime silent skip。doctor / docs notice、L2 backstop |
| Antigravity IDE / desktop | PreToolUse 非保証。L2 pre-commit を主防御と明記 |
| hook process timeout / crash | runtime semantics は Phasegate 外。30 秒 timeout と L2 backstop、未検証表示 |

## 9. Phase 2 docs / release boundary

実装と同じ version で README / README.ja、Grok integration guide、Antigravity integration guide、CLI reference、
coverage matrix を更新する。Antigravity の args schema / failure semantics は verified と未検証を分離して記載する。
template 変更と同じ commit で integrity pin を更新し、1 commit = 1 version を守る。
