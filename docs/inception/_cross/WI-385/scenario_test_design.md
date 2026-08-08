# WI-385 Scenario Test Design

<!-- @work-item-id WI-385 -->

## Scenario 1: Grok compatible hook の install と trust

1. phasegate 未導入 temp project で `install --agent grok --apply` を実行する。
2. `.claude/settings.json` の phasegate PreToolUse が Bash / Write / Edit / apply_patch を覆い、timeout 30 であることを確認する。
3. `.grok/hooks` が重複配布されていないことを確認する。
4. `doctor --agent grok` が `grok inspect` / `/hooks` / trust 手順を案内することを確認する。
5. Grok 実機では trust 後に protected write payload が top-level deny で編集前に止まることを smoke test する。

## Scenario 2: Antigravity CLI の編集前 deny

1. `install --agent antigravity --apply` で `.agents/hooks.json` named definition を配布する。
2. `agy` CLI から phase 未反映 path への write / replace / run_command を起動する。
3. mutation 前に `decision=deny` と具体 reason が返ることを確認する。
4. verified args key を記録し、defensive candidate と docs の検証状態を更新する。
5. IDE / desktop では hard block を合格条件にせず、L2 pre-commit が違反を止めることを確認する。

## Scenario 3: 既存導入の upgrade と後方互換

1. timeout 無しの旧 `.claude/settings.json` と user-owned Antigravity named hook を用意する。
2. doctor が stale finding を出し、reconcile が phasegate-owned entry だけを更新する。
3. `--agent both` の plan / output / target 集合が新 runtime 追加前と同じであることを snapshot する。
4. Claude Write、Codex apply_patch、Grok camel payload、Antigravity nested payload の deny を同じ gate fixture で比較する。
5. L2 pre-commit / CI backstop が runtime trust / surface に依存せず有効なことを確認する。

## Manual acceptance boundary

Grok trust store、Antigravity IDE / desktop 発火、Antigravity timeout / crash semantics は process fixture から
観測できない。自動テストは配布・stdout contract・backstop を証明し、実機 smoke はユーザー環境で行う。
未実施の実機項目を supported / verified と表記しない。
