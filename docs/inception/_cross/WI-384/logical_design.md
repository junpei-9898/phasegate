# WI-384 Logical Design: Codex native apply_patch hook wiring

<!-- @work-item-id WI-384 -->

## 1. Unit と責務

| Unit | Phase 2 の責務 | 変更層 |
|---|---|---|
| agent-integration | raw patch 抽出、pre/post hook payload 適合、Codex 出力契約 | domain / application contract / presentation |
| quick-mode | caller が明示した `changeKind` を優先して分類 | application |
| installation | matcher 配布、stale matcher doctor 検出、trust/version notice | application / presentation |

新しい CLI endpoint、永続化、外部 I/O port は追加しない。既存 `phasegate hook pre-tool-use`、
`phasegate hook post-tool-use`、`install` / `init` / `reconcile` / `doctor` を拡張する。

## 2. PreToolUse flow

```text
Codex PreToolUse payload
  tool_name = "apply_patch"
  tool_input.command = raw patch text
        |
        v
pre-tool-use presentation adapter
  -> ApplyPatchWriteTargetExtractor.extract(command)
  -> [{ filePath, changeKind }]
  -> targetFilePaths + FullModeTargetChange(changeKind)
  -> external tool vocabularyを internal "Write" semanticsへ normalize
        |
        v
HandlePreToolUseUseCase（既存）
  -> protected-file check
  -> phase-gate check
  -> story reflection check
  -> Quick / Full Mode check
        |
        +-- violation: non-empty stderr + exit 2
        +-- continue: empty stdout + exit 0
```

payload の `cwd` で既存 project root 解決を行い、absolute path / external path filtering も
既存処理を共有する。`tool_use_id`、`turn_id`、`session_id`、`model` 等の必須 upstream field は
compatibility fixture に含めるが、Phasegate の authorization 入力には使わず未知 field と同様に受理する。

### Parser

現行 `BashWriteTargetExtractor` 内の private apply_patch block scan を
`ApplyPatchWriteTargetExtractor` へ切り出し、directive ごとの kind を保持する。
`BashWriteTargetExtractor.extract(command): readonly string[]` は新 service の結果を path へ map し、
redirect / tee / sed / cp / mv 等との重複除去と入力順を維持する。

native branch は raw patch を shell tokenizer へ渡さない。Bash command string と raw patch text は
入力形が違うため、共有するのは patch block parser だけとする。

### changeKind forwarding

`FullModeTargetChange` と `ClassifyChangeCategoryUseCaseInput.targetChanges` に optional
`changeKind` を加える。quick-mode は次の優先順位で kind を決める。

1. caller が渡した valid explicit `changeKind`
2. `beforeContent === null && afterContent !== null` なら CREATE
3. targetChanges 自体が未指定の CLI 経路は file existence で CREATE / MODIFY 推定
4. その他は MODIFY

`DELETE` は 1 の経路だけで明示される。既存 caller は optional field により互換を維持する。

## 3. PostToolUse decision

`.codex/hooks.json` の PostToolUse matcher も `Bash|apply_patch` へ広げる。native apply_patch 後に
既存 `HandlePostToolUseUseCase` が `phasegate:lint --fast` を実行するためである。

post adapter は現在 `tool_name` だけを use case へ渡し、affected path を lint command の入力に
使用しない。したがって raw patch の再解析や `changeKind` forwarding は追加しない。
実 payload 形を受理し既存 lint / skip semantics を保つ integration test だけを追加する。

## 4. Matcher design

PreToolUse / PostToolUse の matcher は双方とも `Bash|apply_patch` とする。

- `apply_patch` は upstream の正式 matcher かつ payload の常時 canonical tool name である。
- `Write` / `Edit` は Claude Code compatibility aliases だが、Codex 専用 file で canonical name を
  使えば十分であり、alias を併記すると Phasegate が対応する runtime surface を曖昧にする。
- `Bash` は既存 shell-write defense と後方互換のため残す。

## 5. Codex hook output compatibility audit

現行 pre-tool-use hook は deny を exit 2 + 非空 stderr、continue を exit 0 で返し、stdout に
`permissionDecision` JSON を書かない。`permissionDecision: "ask"` と `allow` を返す経路はない。
Quick / Full Mode の許可 notice は stderr のみである。この契約は Codex と互換なので実装変更は
不要だが、native apply_patch の allow / deny integration test で固定する。

レガシー `{ decision: "block" }` を使う Stop hook は本 WI の PreToolUse output scope 外であり、
既存後方互換を維持する。

## 6. Doctor と lifecycle notice

`CodexHookMissingCheck` は JSON 全体に phasegate 文字列があるだけでは PASS にしない。
phasegate pre/post command を持つ event entry ごとに matcher token を評価し、`Bash` または
`apply_patch` の片方でも欠ければ stale wiring として red finding を返す。別 event の matcher や
user hook にある文字列は充足に数えない。

repair mode は既存方針を維持し、Phasegate だけの単純構成は mechanical、user customization と
共存する構成は ai-assisted、malformed JSON は manual とする。finding は欠落 event/token を明記し、
`phasegate reconcile --apply` と、その後の Codex `/hooks` 再 trust を案内する。

`install`（`init` 委譲を含む）と `reconcile` は Codex hook target を作成・変更する場合、human と JSON
双方に operator notice を返す。`doctor --agent codex|both` は trust 状態を外部から検証できない旨、
minimum Codex CLI 0.124.0、`/hooks` での確認を advisory notice として常時表示し、exit status には
影響させない。

## 7. Documentation and release boundary

Phase 2 で以下を同時に更新する。

- `docs/guide/codex-integration.md`: stable/default-on、minimum version、native coverage、trust gate、
  `ask` / `allow` 非互換、L2 backstop
- `README.md` / `README.ja.md`: setup と coverage matrix
- `docs/inception/_cross/WI-013/description.md`: PR merge、v0.124.0 release、WI-384 完了版を記録
- `.codex/hooks.json` / `templates/.codex/hooks.json`: matcher
- `phasegate.integrity.json`: template を変更した同一 commit で `integrity:pin`

公開文書は Phase 2 の機能実装・検証と同じ version で切り替え、Phase 1 では未来の挙動を現行仕様として
先行公開しない。

## 8. Failure policy

| failure | behavior |
|---|---|
| malformed hook JSON payload / tool_name 欠落 | exit 2 + 非空 stderr（既存 fail-closed） |
| apply_patch command 欠落 / marker なし | 書き込み target を導出できないため exit 2 とし、silent allow しない |
| patch directive path が workspace 外 | 既存 external path filtering により project gate 対象外 |
| protected / phase / reflection / full-mode violation | exit 2 + 具体的 stderr |
| allowed write | exit 0 + 空 stdout |
| post-tool lint failure | 既存 PostToolUse exit semantics を維持 |
| trust 未承認 | Codex が hook を skip。Phasegate は検出不能なため lifecycle / doctor / docs で明示 |

