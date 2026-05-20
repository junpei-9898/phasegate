---
id: WI-206
type: issue
severity: high
status: tested
affects: [agent-integration, harness-api, skill-quality]
source: phasegate-upstream-feedback
---

# WI-206: `/story-implementor` guidance does not create a hook-passable full-mode route

> 起票日: 2026-05-20
> 起票経緯: GEERM プロジェクトでの実機検証フィードバック。phasegate `0.160.11` で、PreToolUse hook が `domain` 層 Edit を reject した際に `/story-implementor` を案内するが、案内された route 自体には hook 通過を自動化する状態遷移がない。

## 問題

PreToolUse hook は `quickMode.allowedCategories` 外の `domain` / `application` / `infrastructure` 等を検出すると `FULL_MODE_REQUIRED` として block し、既定では `/story-implementor` を使って設計フェーズから開始するよう案内する。

しかし `/story-implementor` skill は AIDLC 手順を記述した markdown guide であり、Phase 2 実装時に hook が参照できる full-mode session、TTL 付き marker、effective config、または WI 承認状態を作成しない。対象 Unit の必須 product docs が不足している場合、案内通りに skill を進めても実装ファイル Edit の段階で同じ `FULL_MODE_REQUIRED` に戻る。

現行実装には ISSUE-021 の緩和として「対象 Unit の `logical_design.md` / `domain_model.md` が存在する場合は full-mode block を bypass する」処理がある。そのため、すべての `domain` 編集が常に詰むわけではない。一方で、設計文書が不足している Unit、または story 固有 inception docs だけを作成して product docs に反映していない状態では、`/story-implementor` route と hook policy の間に到達不能な gap が残る。

## 影響

- strict / hardened Quick Mode 構成では、機能追加や domain model 変更の多くが `/story-implementor` 案内後も実装段階で再 block される。
- ユーザーは `quickMode.allowedCategories` を手動で広げ、実装後に restore する運用へ逃げやすい。
- restore 忘れにより policy が緩い状態で commit されるリスクがある。
- error guidance が「正規 route」を示しているように見えるため、実際には route が足りない問題の診断が遅れる。

## 受け入れ基準

- [ ] `/story-implementor` の Phase 2 実装開始時に、hook が機械的に判定できる full-mode route が存在する。
- [ ] route は手動 `allowedCategories` 編集に依存せず、理由、対象 Unit、WI、期限を監査可能にする。
- [ ] 対象 Unit の product docs 不足時と、docs はあるが full-mode session がない時の guidance が区別される。
- [ ] `phasegate.config.json` の手動 edit を回避する official recovery path が、story 実装 route と矛盾しない。
- [ ] regression test が「案内された `/story-implementor` route を辿っても同じ hook block に戻る」失敗形と、新 route による許可形を固定する。

## 関連

- `docs/inception/_cross/WI-204/description.md`: strict Quick Mode 下で config 復旧 route が詰む問題。`quick-mode-relax` intent により一部は解消済み。
- `docs/inception/_cross/WI-001/description.md`: skill 指示だけに依存すると AIDLC 前提チェックを物理的に保証できない問題。
- `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts`: `FULL_MODE_REQUIRED` block と ISSUE-021 design-doc bypass。
- `skills/story-implementor/SKILL.md`: 現行 story 実装手順。hook が読む session / config marker を作らない。
