# シナリオテスト設計: H13-01 — CI/CDテンプレート
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20

## 1. テスト対象機能

H13-01はCI/CDテンプレート生成機能を実装する。具体的には以下を提供する:

- `aidlc-gate.yml` テンプレート: PR時にL1-L3バリデータを実行（triggerCondition: pull_request）
- `consistency-check.yml` テンプレート: 週次でL4バリデータを実行（triggerCondition: schedule）
- `.husky/pre-commit` テンプレート: commit時にL2バリデータを実行（triggerCondition: pre-commit）
- 各テンプレートはphasegate.config.jsonのPreset設定（minimal/standard/strict）を参照

CLIコマンド: `ci:generate-template --preset {presetId} --type {templateType}`
Presentation: `scripts/harness/ci-governance/presentation/handlers/generate-ci-template-handler.ts`

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H13-01-001 | aidlc-gateテンプレートをstandardプリセットで生成できること | `presetId='standard'`, `templateType='aidlc-gate'` | `triggerCondition='pull_request'`, `targetValidatorIds` に有効なIDが含まれる, `validationErrors=[]` |
| SC-H13-01-002 | consistency-checkテンプレートをstrictプリセットで生成できること | `presetId='strict'`, `templateType='consistency-check'` | `triggerCondition='schedule'`, `failOnWarning=true` |
| SC-H13-01-003 | pre-commitテンプレートをminimalプリセットで生成できること | `presetId='minimal'`, `templateType='pre-commit'` | `triggerCondition='pre-commit'` |
| SC-H13-01-004 | 不正なtemplateTypeを入力した場合にエラーが返ること | `templateType='invalid'` | HarnessError[]（INV-1違反） |
| SC-H13-01-005 | ValidatorIdRegistryが空リストを返す場合にINV-2違反エラーが返ること | ValidatorIdRegistryPort: `listAll()`→[] | `validationErrors` にCI_TEMPLATE_EMPTY_VALIDATORSが含まれる |
| SC-H13-01-006 | TemplateType×TriggerConditionの全3種マッピングが正しいこと | 3種のtemplateType | aidlc-gate→pull_request, consistency-check→schedule, pre-commit→pre-commit |
| SC-H13-01-007 | E2E: `ci:generate-template` コマンドが認識されること | `args=['--preset', 'default', '--type', 'pull_request']` | stderrに "Unknown command: ci:generate-template" を含まない |

## 3. テスト配置

- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/ci-template.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/template-generator.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/ci-template-generation-flow.test.ts`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`（`ci-governance コマンド群` セクション）

## 4. 前提条件

- `CiTemplate` 集約ルート（永続化なし）: TemplateGeneratorが生成 → TemplateRendererPortへ渡してYAML書き出し
- `TemplateGenerator` ドメインサービス: ValidatorIdRegistryPort + PresetConfigPortを参照してTemplateConfig（VO）を導出
- TemplateType→TriggerConditionマッピングはTemplateGenerator内のドメインロジック（設計決定D6）
