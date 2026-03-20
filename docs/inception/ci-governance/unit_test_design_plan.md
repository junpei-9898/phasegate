# ユニットテスト設計計画: ci-governance
**作成日**: 2026-03-20

## 1. スコープ
- 対象: ci-governance unit
- テストケース総数: 105件（`docs/product/construction/ci-governance/unit_test_design.md` §5 サマリーより）

## 2. テストファイル構成

`docs/product/construction/ci-governance/unit_test_design.md` より:

| テスト対象 | ファイル | ケース数 |
|-----------|---------|---------|
| TemplateConfig VO | `scripts/harness/__tests__/unit/ci-governance/template-config.test.ts` | 10 |
| EscalationAction VO | `scripts/harness/__tests__/unit/ci-governance/escalation-action.test.ts` | 10 |
| RepetitionResetCondition VO | `scripts/harness/__tests__/unit/ci-governance/repetition-reset-condition.test.ts` | 4 |
| PointerEntry VO | `scripts/harness/__tests__/unit/ci-governance/pointer-entry.test.ts` | 11 |
| CiTemplate 集約 | `scripts/harness/__tests__/unit/ci-governance/ci-template.test.ts` | 14 |
| ErrorRepetition 集約 | `scripts/harness/__tests__/unit/ci-governance/error-repetition.test.ts` | 16 |
| AgentsMdPointer 集約 | `scripts/harness/__tests__/unit/ci-governance/agents-md-pointer.test.ts` | 12 |
| TemplateGenerator | `scripts/harness/__tests__/unit/ci-governance/template-generator.test.ts` | 8 |
| RepetitionDetector | `scripts/harness/__tests__/unit/ci-governance/repetition-detector.test.ts` | 5 |
| PointerValidator | `scripts/harness/__tests__/unit/ci-governance/pointer-validator.test.ts` | 8 |
| LessonAggregator | `scripts/harness/__tests__/unit/ci-governance/lesson-aggregator.test.ts` | 7 |

## 3. QA
なし（遡及記録）
