---
id: WI-263
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-263: ADR-030 本文の「SKILL.md × 30」表記を 29 に修正

> 起票日: 2026-07-16
> 起票経緯: WI-256 でスキルカタログが 30 → 29 に確定した（`skills/` 配下の SKILL.md は実測 29 個、`phasegate.integrity.json` も 39 entries 中 29 が SKILL.md）。一方 ADR-030（Accepted）の §Decision.3.① 指示ファイル整合性 pin の対象リスト（72 行目付近）に `- SKILL.md × 30` という旧件数の残骸が残っていた。Accepted な ADR の事実修正として件数のみを 29 に是正する。

## Acceptance Criteria

- [ ] `docs/ADR/030-injection-threat-model-and-trust-root.md` の `- SKILL.md × 30` を `- SKILL.md × 29` に修正
- [ ] ADR 全体を確認し、他に「30」というスキル件数の残骸がないこと（ADR id `"030"` は対象外）
- [ ] 件数以外の内容変更を行わない（Accepted ADR の事実修正のみ）

## 正確性の制約

- スキル件数は `ls skills/*/SKILL.md | wc -l`（= 29）を単一の真実の源とする
- ADR frontmatter の `adr_id: "030"` は ADR 番号であり件数ではないため変更しない

## 検証

- `ls skills/*/SKILL.md | wc -l` が 29 を返すことを実測確認
- `npx tsx scripts/harness/main.ts validate --layer L2` が PASS
