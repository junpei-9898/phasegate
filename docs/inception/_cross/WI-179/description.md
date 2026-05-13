---
id: WI-179
type: story
severity: normal
status: tested
affects: [installation, documentation, skill-quality]
source: internal
---

# WI-179: Scoped-Out Doctor Finding Repair Guidance

> 起票日: 2026-05-13
> 起票経緯: `phasegate@0.156.0` の WI-178 dogfood で、Claude-only setup 後の `phasegate doctor --agent claude --json` は `overallStatus: green` / `exitCode: 0` となり、Codex-only finding も `scopedOutFindings` + `applicability: "not-applicable"` で説明できた。一方で、scoped-out finding の中に `repairHint` や `suggestedSkill` が残るため、agent や user が雑に読むと「not-applicable なのに修復すべきなのか」と一瞬迷う余地が残った。

## P4 との関係

`docs/inception/_shared/wi_152_174_prioritization_plan.md` の P4 は WI-156 / WI-170 の判断であり、主に drift guardrails と initial creation public contract を扱う。

本 WI は P4 の guardrail 実装ではなく、WI-178 で追加した agent-scoped doctor JSON contract の follow-up である。P4 に依存せず独立して改善でき、かつ registry dogfood で確認された小さな UX/contract 改善なので、新規 WI として扱う。

## 問題

### 1. `scopedOutFindings` に repair guidance が残り、not-applicable と混ざる

`doctor --agent claude --json` では Codex-only finding は exit code に影響しないが、元 finding の `repairHint` / `suggestedSkill` がそのまま残る。これは情報としては正しいが、選択 agent の readiness を確認している場面では repair 対象に見えやすい。

### 2. agent が repair 提案を過剰に出す余地がある

`applicability: "not-applicable"` を読めば判断できるが、実運用では `repairHint` や `suggestedSkill` の方に引っ張られ、未選択 agent の install を提案する可能性がある。

## スコープ

- scoped-out finding の JSON contract を改善する。
- 候補:
  - `scopedOutFindings[].repairHint` と `suggestedSkill` を `null` にする。
  - または `repairHintApplicability: "only-if-agent-selected"` のような追加フィールドで repair 条件を明示する。
  - どちらの場合も `findings[]` の applicable finding contract は維持する。
- human output の scoped-out summary でも「修復対象ではない」ことを明示する。
- `phasegate-toolkit-guide` / `phasegate-config-doctor` / troubleshooting docs を更新し、not-applicable finding の repair guidance をどう読むか説明する。
- registry dogfood で Claude-only setup 後の `doctor --agent claude --json` を確認する。

## 受け入れ基準

- [ ] `doctor --agent claude --json` の `scopedOutFindings` が、未選択 Codex finding を修復対象と誤読しにくい contract になっている。
- [ ] default / `--agent both` の applicable finding では、従来どおり `repairHint` / `suggestedSkill` が利用できる。
- [ ] JSON output が `not-applicable` と repair applicability の違いを agent に説明できる。
- [ ] human output が scoped-out finding を repair target として扱わないことを明示する。
- [ ] guidance skills と troubleshooting docs に反映される。
- [ ] registry dogfood で Claude-only setup 後の scoped doctor 出力を確認する。

## 非スコープ

- WI-156 の drift guardrail 実装
- WI-170 の initial creation public contract 判断
- `doctor --agent` の scope 設計そのものの再設計
- setup target や install target の追加

## 関連 WI

- WI-156: drift guardrails (P4)
- WI-170: initial creation public contract decision (P4)
- WI-178: agent-scoped doctor readiness
