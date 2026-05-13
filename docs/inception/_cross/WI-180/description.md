---
id: WI-180
type: story
severity: normal
status: tested
affects: [installation, documentation, skill-quality]
source: internal
---

# WI-180: Complete Scoped-Out Doctor Effective Repair Contract

> 起票日: 2026-05-13
> 起票経緯: WI-179 の registry dogfood で、Claude-only setup 後の `phasegate doctor --agent claude --json` は `overallStatus: green` / `exitCode: 0` となり、`scopedOutFindings` も `repairHint: null` / `suggestedSkill: null` / `repairHintApplicability: "only-if-agent-selected"` で十分読みやすくなった。一方で、scoped-out item には元 finding の `repairMode: "mechanical"` が残るため、agent が `repairMode` だけを雑に読むと「今の scope で mechanical repair 可能」と誤読する余地がまだある。human output も件数だけで、どの checkId が scoped out されたかは JSON を見ないと分からない。

## 問題

### 1. `scopedOutFindings[].repairMode` が current scope の repair 対象に見える余地

WI-179 で repair guidance は抑制されたが、`repairMode` は元 finding の値を保持している。これは full scope では正しい情報だが、selected-agent report では current scope の repair target ではない。

### 2. human output の scoped-out summary が件数だけで説明不足

`Scoped out: 2 informational findings...` という summary は repair target ではないことを伝えるが、どの finding が scoped out されたかは JSON を開かないと確認できない。CLI 体験としては、checkId 一覧がある方が安心しやすい。

### 3. JSON item 単体の安全な読み取りがまだ少し分散している

`applicability`, `repairHintApplicability`, `scopeReason` を組み合わせれば判断できるが、agent が安全に読むには current scope の repair 対象かどうかを直接表す boolean か effective repair field があるとより堅い。

## スコープ

- scoped-out doctor finding の effective repair contract を完成させる。
- 候補:
  - `scopedOutFindings[].repairModeApplicability: "only-if-agent-selected"` を追加する。
  - `scopedOutFindings[].currentScopeRepairTarget: false` を追加する。
  - 必要に応じて `findings[].currentScopeRepairTarget: true` を追加し、applicable findings の読み取りも明確にする。
- human output の scoped-out summary に checkId 一覧を短く表示する。
- default / `--agent both` の applicable finding では従来の repair guidance と current-scope repair target semantics を維持する。
- `phasegate-toolkit-guide` / `phasegate-config-doctor` / CLI reference / troubleshooting docs を更新する。
- registry dogfood で Claude-only setup 後の scoped doctor JSON と human output を確認する。

## 受け入れ基準

- [ ] `doctor --agent claude --json` の `scopedOutFindings` が、`repairMode` だけを読んでも current scope の repair target と誤読しにくい contract になっている。
- [ ] scoped-out item に current scope の repair 対象ではないことを直接示す machine-readable field がある。
- [ ] applicable `findings[]` は current scope の repair 対象として明示され、従来どおり `repairHint` / `suggestedSkill` を利用できる。
- [ ] human output が scoped-out checkId 一覧と「修復対象ではない」ことを表示する。
- [ ] guidance skills と troubleshooting / CLI docs に、`repairMode` と effective repair applicability の読み分けが反映される。
- [ ] registry dogfood で Claude-only setup 後の JSON / human output を確認する。

## 非スコープ

- `doctor --agent` の scope 設計そのものの再設計
- WI-156 / WI-170 の P4 guardrail 実装
- setup target や install target の追加
- scoped-out finding を JSON から削除する破壊的変更

## 関連 WI

- WI-178: agent-scoped doctor readiness
- WI-179: scoped-out doctor finding repair guidance
