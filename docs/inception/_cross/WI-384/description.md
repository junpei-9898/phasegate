---
id: WI-384
type: story
severity: high
status: tested
affects: [agent-integration, quick-mode, installation]
source: openai/codex#18391 / rust-v0.124.0
---

# WI-384: Codex native apply_patch を編集前 hook のフェーズゲートへ統合する

<!-- @work-item-id WI-384 -->

## 背景

WI-013 / ISSUE-013 は Codex の `PreToolUse` が当時 `Bash` にしか発火せず、ネイティブ
`apply_patch` が hook を素通りする上流制約を前提に、編集前遮断を断念して L2 pre-commit
を事後防御として採用した。WI-013 の「上流 fix 後の追従」には、openai/codex PR #18391
の merge 後に matcher、payload parser、公開文書を追従すると記録されている。

PR #18391 は 2026-04-22 に merge され、rust-v0.124.0（2026-04-23）でリリースされた。
同版以降、ネイティブ `apply_patch` は `PreToolUse` / `PostToolUse` を発火し、payload は
`tool_name: "apply_patch"` と raw patch 本文を入れた `tool_input.command` を持つ。hooks は
stable・既定 ON であり、ローカル検証環境の Codex CLI 0.144.5 はこの条件を満たす。

Phasegate の `.codex/hooks.json` と bundled template は現在も matcher が `Bash` のみで、
`pre-tool-use-hook.ts` も raw patch payload を書き込みターゲットへ変換しない。このため、
上流制約が解消済みでも編集前 hard block が有効になっていない。

## 目的

- Codex native `apply_patch` の Update / Add / Delete / Move to を編集前に抽出し、既存の保護ファイル、
  phase-gate、story reflection、Quick / Full Mode 判定へ合流させる。
- project / template の Codex hook matcher を現在の上流契約へ更新する。
- 古い matcher を doctor が検出し、install / reconcile / doctor と公開文書が Codex の
  minimum version と trust gate の再承認手順を案内する。
- Bash 経路と L2 pre-commit backstop を後方互換として維持する。

## 受け入れ基準

- [x] `tool_name: "apply_patch"`、`tool_input.command` に raw patch、`tool_use_id` / `turn_id`
  を含む実 payload 形を pre-tool-use hook が受理する。
- [x] `*** Update File:` / `*** Add File:` / `*** Delete File:` をそれぞれ
  `MODIFY` / `CREATE` / `DELETE` として抽出し、複数ファイル混在 patch を順序どおり扱う。
- [x] `*** Update File: <source>` 直後の `*** Move to: <destination>` は、移動元を `MODIFY`、
  移動先を `CREATE` としてこの順に抽出し、移動先も同じ gate で検査する。
- [x] 抽出された全 path が既存の保護ファイル、phase-gate、story reflection、
  Quick / Full Mode 判定へ渡り、1 件でも違反があれば exit 2 + 非空 stderr で deny される。
- [x] 成功経路は exit 0 + 空 stdout とし、`permissionDecision: "ask"` および
  `updatedInput` のない `allow` を出力しない。
- [x] `.codex/hooks.json` と `templates/.codex/hooks.json` の PreToolUse / PostToolUse が
  `Bash|apply_patch` を match する。
- [x] PostToolUse は native `apply_patch` 後に既存 lint 経路を実行し、patch target の
  再解析を責務に加えない。
- [x] doctor は phasegate command の有無だけでなく、PreToolUse / PostToolUse の両方で
  canonical `apply_patch` matcher が欠けている状態を red finding として検出する。
- [x] init / reconcile / doctor の Codex 対象出力は、Codex CLI >= 0.124.0 と、
  `.codex/hooks.json` 更新後に `/hooks` で hook definition hash を再 trust する必要を案内する。
- [x] Codex integration guide と README 英日版の coverage matrix が native `apply_patch` の
  編集前 hard block 対応を表し、L2 pre-commit は backstop として残る。
- [x] WI-013 の「上流 fix 後の追従」に WI-384 での決着を記録する。
- [x] Bash matcher / Bash heredoc apply_patch の既存テストが回帰しない。
- [x] template 変更と同じ Phase 2 commit で `phasegate integrity:pin` を再実行し、
  `phasegate.integrity.json` を更新する。

## 非目標

- Codex の `permissionDecision: "ask"` 対応（runtime が fail open するため採用しない）
- `updatedInput` を使った tool input 書き換え
- Claude Code の `.claude/settings.json` matcher 変更
- Codex 0.123.x 以下や Windows hooks のサポート
- patch hunk を完全適用して変更後ファイル全文を再構築すること
- L2 pre-commit / CI backstop の撤去

## 上流互換契約

| 項目 | WI-384 で採用する契約 |
|---|---|
| minimum version | rust-v0.124.0 |
| canonical tool name | payload / matcher ともに `apply_patch` |
| matcher aliases | `Write` / `Edit` は Codex が受理するが Phasegate template には併記しない |
| block | exit 2 + 非空 stderr |
| continue | exit 0 + 空 stdout（stderr の informational notice は許容） |
| unsupported | `permissionDecision: "ask"`、`updatedInput` なし `allow` |
| trust | non-managed command hook は definition hash 単位。hooks.json 更新後は `/hooks` で再 trust |

## Phase 2 完了状態

本 WI は v0.336.0 で実装・テスト・template・公開ユーザーガイド・integrity pin まで反映した。
独立検証の REJECT 対応では `Move to:` 宛先検査、SessionStart 文面、World TestReference 衝突、
残存リスク記述を修正し、修正コミット用 version を v0.337.0 とする。
