---
id: WI-258
type: story
severity: high
status: tested
affects: [validator-system]
---

# WI-258: coverage_report の attestation ゲート（ADR-030 §Decision.3.② 第1段・L2 fail-closed）

<!-- @work-item-id WI-258 -->

> 起票日: 2026-07-10
> 経緯: coverage-report-laundering は systemic（MEMORY: coverage-report-laundering-systemic）。`docs/product/construction/*/coverage_report.md` の ✅ 主張は現状ゲートされておらず、インジェクションされたエージェントが ✅ を書くだけで通ってしまう。ADR-030 §Decision.3.② が承認済み: ✅ 主張には attestation 参照が必須（L2 fail-closed）、L3 が evidence を再実行（authoritative）、既存の非ゲート coverage_report は `ungated-legacy` マーカーで可視化して段階返済する。

## スコープ（本 WI で landed）

新 L2 validator **L2-016（coverage-attestation-gating）** を追加し、`docs/product/construction/*/coverage_report.md` の ✅ 主張に attestation 参照を要求する（fail-closed）。既存の非ゲート coverage_report には `ungated-legacy` マーカーを付与して「見える負債」として validator が warning で件数報告する。

### coverage-gating 契約

- coverage_report.md 内で AC を **✅** と主張する行/セクションには attestation 参照 `<!-- @attestation <id> -->` が必要（同一行内、または直前の連続コメント行）。
- ファイル先頭（本文開始前）に `<!-- @coverage-gating: ungated-legacy -->` マーカーがある場合はファイル全体を免除。ただし免除は **見える負債**として validator が warning（`ungated-legacy: N 件`）で常時報告する。
- マーカー無し・attestation 参照無しの ✅ は **violation（fail-closed, error）**。
- ✅ を一切含まない coverage_report は pass（対象外）。

### attestation ID の解決（スコープ判断）

既存 attestation 基盤（`scripts/harness/attestation/`）は **単一の ci-gate-run レコード**（`.harness/attestation.json`, `signature.attestationDigest` で封印、`acBoundScope` に story-id）であり、**per-AC / per-coverage-report のストアではない**。ADR-030 §Decision.3.② は「L3 が evidence を再実行（authoritative）」と定めるため、本 WI（第1段・L2）では:

- **参照形式のみを定義し、L2 は参照の存在・形状（fail-closed on bare ✅）のみを検証する**。
- attestation レコードとの突合（ID がレコードに実在し pass しているかの authoritative 検証）は **L3 / 別 WI に縮小**する。

理由: 既存 attestation 基盤は coverage 用途にそのままは流用不能（per-AC 粒度でない）であり、L2 で最小 attestation レコードストアを新設するのはスコープ過大。ADR-030 が authoritative 再実行を L3 に割り当てているため、L2 は anti-laundering の第一防壁（bare ✅ の遮断）に徹する。

## legacy backfill

現存 `docs/product/construction/*/coverage_report.md` 18 件のうち **✅ を含む 6 件**（ci-governance / harness-error / phase-dependency-model / regression-suite / skill-quality / traceability-model）に `<!-- @coverage-gating: ungated-legacy -->` を付与。✅ を含まない 12 件は対象外（付与しない）。マーカー付与は **隠蔽ではなく可視化**: validator が「ungated-legacy: 6 件」を warning として常時報告する。

## スコープ外

- attestation レコードとの突合（authoritative 検証） → L3 / 別 WI。
- 新 attestation コマンド追加は行わない（既存 `phasegate:attest` / `phasegate:verify-attestation` は変更しない）→ `known-harness-commands.ts` 更新不要。
- `phasegate.config.json` / preset 変更なし（L2-016 は DEFAULT_CONFIG の L2 validators に含めて default-ON。fail-closed だが legacy backfill 後は violation 0）。

## 検証

- targeted テスト green（domain service / adapter / usecase override / 実 corpus 統合）。
- `npx phasegate lint` 0 violations。
- `npx phasegate validate --layer L2` が L2-016 込みで PASS（backfill 後）。
- story-reflection corpus 回帰 green。
