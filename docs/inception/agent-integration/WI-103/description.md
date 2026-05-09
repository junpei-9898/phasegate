---
id: WI-103
type: story
severity: normal
status: tested
legacy_id: H12-02
---

# H12-02

## 状態

- **状態**: TESTED
- **実装証跡**: `BaselineGrandfatherQueryPort`、`CiGovernanceBaselineGrandfatherAdapter`、`HandlePreToolUseUseCase` の grandfather skip、`HarnessConfigConfigQueryAdapter#getBaselineConfig`
- **テスト証跡**: `scripts/harness/__tests__/integration/agent-integration/ci-governance-baseline-grandfather-adapter.test.ts` / `handle-pre-tool-use-usecase.test.ts` / `harness-config-config-query-adapter.test.ts`
