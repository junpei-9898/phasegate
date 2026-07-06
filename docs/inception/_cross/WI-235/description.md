---
id: WI-235
type: chore
severity: normal
status: drafted
affects: [tests, docs]
---

# WI-235: skill-quality カバレッジ修復 Phase 2 — 実成果物テスト追加と正直な復旧

> 起票日: 2026-07-07
> 経緯: WI-234（Phase 1）で虚偽の主張を `未カバー/部分` に下方修正した skill-quality coverage_report.md に対し、実オンディスク成果物を本番コードパスで検証する実テストを追加し、正直に カバー へ復旧できる行のみを復旧する。反ロンダリング原則（真であることのみ / 強制 green 禁止）を厳守する。

## 背景

Phase 1（WI-234）は `docs/product/construction/skill-quality/coverage_report.md` の水増しを下方修正した（総合 98.4% → 71.0%）。本 Phase 2 は、下方修正された 3 つの AC に対して実成果物テストを追加し、実際に検証できた行のみを カバー へ戻す。

対象 AC:

- **H12-06-AC-2**: v0 既存スキルの SKILL.md が必須構造を満たすことを検証するテストが存在する
- **H12-06-AC-3**: v1 新規スキルの SKILL.md が必須構造を満たすことを検証するテストが存在する
- **H12-01-AC-4**: TDD 品質契約（Red→Green→Refactor）が SKILL.md に定義されている

## STEP-0 適合プローブ結果（重要）

実テストを書く前に、実 `FileSystemSkillFileReaderAdapter` + `SkillStructureValidator`（本番パス）で全 30 スキルを検証した。結果: **13/30 が必須 7 セクション（frontmatter/languageMetadata/purpose/inputs/outputs/prerequisites/executionFlow）に未適合**。

未適合スキルと欠落セクション:

| スキル | 欠落セクション |
|------|------------|
| codebase-mapper | purpose, inputs, prerequisites |
| codex-delegator | purpose, inputs, outputs, prerequisites, executionFlow |
| doc-freshness-checker | purpose, inputs |
| engineering-perspective | purpose, inputs, outputs, prerequisites, executionFlow |
| implementation-planner | purpose, inputs, outputs, prerequisites |
| implementation-readiness-checker | purpose, inputs, prerequisites, executionFlow |
| phasegate-config-doctor | purpose, inputs, outputs, prerequisites, executionFlow |
| phasegate-toolkit-guide | purpose, inputs, outputs, prerequisites, executionFlow |
| pointer-validator | purpose, inputs, prerequisites, executionFlow |
| quick-implementor | purpose, inputs, outputs, prerequisites, executionFlow |
| scenario-test-logic-designer | executionFlow |
| skill-creator | purpose, inputs, outputs, prerequisites, executionFlow |
| unit-test-logic-designer | executionFlow |

したがって「全スキルが必須構造に適合する」実コーパステストは現状 **red** となる。反ロンダリング原則により、フィルタ・セクション削減による強制 green を禁止するため、H12-06-AC-2/AC-3 は **未カバー のまま据え置く**。実コーパスの適合化（スキル修正またはセクションパーサ拡張）は別タスク（WI-236+）で扱う。

## 作業内容

1. **H12-01-AC-4 実成果物テストを追加（完了）**。実 `skills/story-implementor/SKILL.md` をディスクから読み込み（モック無し）、TDD 実装順序セクション・Unit/IT/E2E 各段の `RED → GREEN → REFACTOR`・Phase 2 ワークフローの各層 `RED→GREEN→REFACTOR` サイクル・テストピラミッド準拠を assert する。
   - ファイル: `scripts/harness/__tests__/unit/skill-quality/story-implementor-skill-conformance.test.ts`（`UT-SISkill-001/002/003`）
   - タグ: ファイル `@story H12-01`、it に `@ac H12-01-AC-4`
2. **coverage_report.md の H12-01-AC-4 行を カバー へ復旧**。総合 71.0%（44/62）→ 72.6%（45/62）、H12-01 カバレッジ 4/5 → 5/5、AC 総計 20/26 → 21/26。
3. **H12-06-AC-2/AC-3 は 未カバー のまま据え置き**、適合プローブ結果（13/30 未適合）を coverage_report.md に正直に記録。
4. 訂正履歴に Phase 2 を追記。

## スコープ外（後続フェーズ WI-236+）

- 実コーパス適合化（13 スキルの必須セクション整備 or パーサ拡張）と、それを前提とした H12-06-AC-2/AC-3 の実コーパス適合テスト。
- §5 の未カバー 6 adapter・§6 の未カバー 5 handler の実テスト。
- `phasegate.config.json` / `acBoundStories` の変更、L3-005（coverage-report 整合ゲート）ゲーティング、ADR 起票。本 WI では一切行わない。
- `scripts/harness/` の**非テスト**ソース変更（`__tests__/` 配下のテスト追加のみ）。

## 検証

- `npm run test` が green（新テスト `story-implementor-skill-conformance.test.ts` が実 SKILL.md に対し正直に pass）。
- 新テストがモック無しで実オンディスク成果物を読むこと（`readFileSync(skills/story-implementor/SKILL.md)`）。
- coverage_report.md の数値が再計算済みで整合すること（45/62 = 72.6%）。
- 反ロンダリング: H12-06-AC-2/AC-3 を強制 green せず、実コーパス未適合を正直に記録していること。
