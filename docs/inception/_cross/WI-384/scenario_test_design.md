# WI-384 Scenario Test Design

<!-- @work-item-id WI-384 -->

## Scenario 1: stale Codex install の upgrade

1. Codex CLI 0.124.0 以上と Bash-only `.codex/hooks.json` を持つ temp project を用意する。
2. `phasegate doctor --agent codex` を実行する。
3. stale apply_patch matcher finding と reconcile / `/hooks` 案内を確認する。
4. `phasegate reconcile --apply` を実行する。
5. PreToolUse / PostToolUse matcher が `Bash|apply_patch` になったことを確認する。
6. 出力が hooks definition hash 変更後の再 trust を案内することを確認する。
7. `/hooks` 自体は外部対話 UI のため自動操作せず、manual acceptance step として記録する。

## Scenario 2: native apply_patch の編集前 deny

1. phase-gate 未充足の implementation path を含む Add patch payload を構築する。
2. `phasegate hook pre-tool-use` へ実 payload JSON を stdin 送信する。
3. filesystem を mutation する前に exit 2 となり、stderr が非空で対象 path を含むことを確認する。
4. stdout が空で `permissionDecision: ask` / unsupported allow がないことを確認する。

## Scenario 3: mixed patch と後方互換

1. Update / Add / Delete を含み、うち 1 path が protected または phase-gate 違反の patch を送る。
2. patch 全体が deny されることを確認する。
3. 同じ対象を Bash heredoc payload で送り、従来経路も deny されることを確認する。
4. 許可対象の native patch を通し、PostToolUse payload が既存 lint 経路へ進むことを確認する。

## Acceptance boundary

Codex の trust store は Phasegate の process 外にあり自動 fixture で観測できない。したがって
「notice が表示されること」は自動検証し、「CLI `/hooks` で current definition を trust 済みにすること」
は Phase 2 の実機 smoke checklist とする。pre-commit / CI は trust 状態に依存しない backstop として残す。

