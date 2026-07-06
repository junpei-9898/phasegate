---
id: WI-236
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-236: near-miss スキル 2 件の executionFlow 見出し正規化

> 起票日: 2026-07-07
> 経緯: 実コーパス適合プローブで `scenario-test-logic-designer` / `unit-test-logic-designer` が「near-miss」（必須 7 セクションのうち `executionFlow` のみ未認識）と判明した。既存バリデータが認識する正規形へ見出しを正直に揃え、実コーパス適合を 17/30 → 19/30 へ改善する。反ロンダリング原則を厳守する。

## 背景

`SkillStructureValidator`（`scripts/harness/skill-quality/domain/services/skill-structure-validator.ts`）の heading-map は、`executionFlow` セクションの正規形として `⚠️ 3フェーズ実行ルール`（lowercased `startsWith` 照合）を認識する。しかし上記 2 スキルの見出しは `## 3フェーズ実行ルール`（⚠️ 無し）であったため、`executionFlow` が未認識となり必須構造未適合と判定されていた。

両見出し配下の内容は **Phase 1（計画）/ Phase 2（実行）/ Phase 3（レビュー）+ ワークフロー** からなる真正な実行フローであり、他 AIDLC スキル（`story-writer` 等 13 スキル）が既に使用している `⚠️ 3フェーズ実行ルール` 形式と実質同一である。したがって見出しを正規形へ揃えるのは**正直な正規化**であって、内容を伴わない見せかけの適合化（ロンダリング）ではない。

## 作業内容

1. `skills/scenario-test-logic-designer/SKILL.md` の見出し `## 3フェーズ実行ルール` → `## ⚠️ 3フェーズ実行ルール`（該当 1 行のみ）。
2. `skills/unit-test-logic-designer/SKILL.md` の見出し `## 3フェーズ実行ルール` → `## ⚠️ 3フェーズ実行ルール`（該当 1 行のみ）。
3. 本番パス（`FileSystemSkillFileReaderAdapter` + `SkillStructureValidator`）による再プローブで実コーパス適合が **17/30 → 19/30**（未適合 13/30 → 11/30）へ改善することを確認。フリップは上記 2 件のみ。
4. `docs/product/construction/skill-quality/coverage_report.md` の 訂正履歴 に正直な追記（行の カバー フリップ・総合 % 変更なし）。

## なぜ docs ルートか（バリデータ拡張ではなく）

本来はセクションパーサ（heading-map）を拡張して `## 3フェーズ実行ルール`（⚠️ 無し）も認識させる選択肢もあるが、`scripts/harness/skill-quality/` の非テストソース変更は skill-quality の L2-STORY-REFLECTION バックログでフェーズゲート中である。よって本 WI ではソース非変更・フェーズゲート非通過で完結する `skills/` 側の docs 修正として実施する。

## スコープ外（据え置き・別判断）

- 残る 11 スキルの真正な必須セクション欠落（purpose / inputs / outputs / prerequisites 等）の整備。これらは `executionFlow` 以外を実際に欠くため見出し正規化では解消しない。
- H12-06-AC-2/AC-3 の カバー 復旧（全スキル適合テストは依然 red のため 未カバー のまま据え置き）。
- セクションパーサ拡張・`phasegate.config.json` 変更・L3-005 ゲーティング・ADR 起票。本 WI では一切行わない。

## 検証

- 見出し変更は各ファイル 1 行のみ。他の内容は不変。
- 再プローブ 19/30、フリップは対象 2 件のみ。
- `npm run test` green（baseline 4127）。
- 反ロンダリング: 内容が真正な実行フローである見出しのみを正規化し、行の カバー フリップ・総合 % 変更を行っていないこと。
