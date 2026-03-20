# ユニットテストロジック設計計画: regression-suite
**作成日**: 2026-03-20

## 1. スコープ
- 対象: regression-suite
- 参照: unit_test_design.md, domain_model.md

## 2. 構成

テストファイル構成（`scripts/harness/__tests__/unit/regression-suite/`）:
- `aggregates/v0-test-migration.test.ts` — UT-RS-001〜017
- `value-objects/suite-id.test.ts` — UT-RS-020〜029
- `value-objects/regression-suite-definition.test.ts` — UT-RS-030〜036
- `value-objects/k-requirement-test.test.ts` — UT-RS-040〜050
- `value-objects/gng-condition-test.test.ts` — UT-RS-055〜063
- `value-objects/agent-independence-test.test.ts` — UT-RS-068〜076
- `value-objects/migration-mapping.test.ts` — UT-RS-080〜083
- `value-objects/ci-gate-config.test.ts` — UT-RS-088〜099
- `value-objects/test-execution-summary.test.ts` — UT-RS-104〜113
- `value-objects/biome-modification-spec.test.ts` — UT-RS-118〜124
- `value-objects/v0-test-id.test.ts` — UT-RS-130〜132
- `value-objects/coverage-rate.test.ts` — UT-RS-135〜139
- `value-objects/import-violation.test.ts` — UT-RS-142〜144
- `services/regression-runner.test.ts` — UT-RS-150〜156
- `services/migration-analyzer.test.ts` — UT-RS-160〜167
- `services/import-guard-service.test.ts` — UT-RS-172〜177

## 3. QA
なし（遡及記録）
