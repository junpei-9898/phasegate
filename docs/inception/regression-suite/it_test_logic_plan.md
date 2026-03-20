# ITテストロジック設計計画: regression-suite
**作成日**: 2026-03-20

## 1. スコープ
- 対象: regression-suite
- 参照: it_test_design.md, logical_design.md

## 2. 構成

テストファイル構成（`scripts/harness/__tests__/integration/regression-suite/`）:
- `run-k-requirements-regression-usecase.test.ts` — IT-UC-RunKReq-001〜006
- `run-k14-k15-regression-usecase.test.ts` — IT-UC-RunK14K15-001〜003
- `run-agent-independence-guard-usecase.test.ts` — IT-UC-AgentGuard-001〜005
- `run-gng-gate-regression-usecase.test.ts` — IT-UC-RunGng-001〜003
- `analyze-v0-migration-usecase.test.ts` — IT-UC-AnalyzeMig-001〜004
- `migrate-v0-tests-usecase.test.ts` — IT-UC-MigrateV0-001〜005
- `configure-ci-gate-usecase.test.ts` — IT-UC-ConfigCiGate-001〜006
- `vitest-test-runner-adapter.test.ts` — IT-REPO-VitestRunner-001〜005
- `file-system-v0-spec-reader-adapter.test.ts` — IT-REPO-V0SpecReader-001〜003
- `biome-ast-import-analyzer-adapter.test.ts` — IT-REPO-ImportAnalyzer-001〜003
- `markdown-migration-mapping-repository-adapter.test.ts` — IT-REPO-MigrationRepo-001〜006
- `harness-config-query-adapter.test.ts` — IT-REPO-ConfigQuery-001〜002
- `json-ci-gate-result-writer-adapter.test.ts` — IT-REPO-CiGateWriter-001〜003
- `static-suite-registry-adapter.test.ts` — IT-REPO-SuiteRegistry-001〜004
- `k-requirements-integration.test.ts` — IT-API-KReqInteg-001〜003
- `agent-independence-integration.test.ts` — IT-API-AgentInteg-001〜002
- `v0-migration-integration.test.ts` — IT-API-V0MigInteg-001〜003
- `ci-gate-configuration-integration.test.ts` — IT-API-CiGateInteg-001〜002

## 3. QA
なし（遡及記録）
