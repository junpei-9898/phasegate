---
id: WI-046
type: story
severity: normal
status: drafted
legacy_id: H12-03
---

# H12-03

## 状態

- **状態**: TESTED
- **実装証跡**: HarnessError / ErrorDefinition / contract mapper に `suggestedSkill`、`scaffoldCommand`、`templatePath` が追加され、agent-integration の phase-gate ブロック表示で scaffold とテンプレート誘導が出る。
- **テスト証跡**: `scripts/harness/__tests__/unit/harness-error/`、`scripts/harness/__tests__/integration/harness-error/harness-error-infrastructure.test.ts`、`scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts`
