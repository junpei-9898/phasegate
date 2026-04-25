# TDD実装計画: H13-01 (ci-governance)

## 1. スコープ
- 対象ストーリー: H13-01 CI/CDテンプレート
- 影響する層: domain（CiTemplate集約、TemplateConfig VO、TemplateGenerator）、application（GenerateCiTemplateUseCase、RenderCiTemplateUseCase）、infrastructure（ValidatorIdRegistryAdapter、PresetConfigAdapter、YamlTemplateRendererAdapter）、presentation（GenerateCiTemplateHandler: `ci:generate-template`）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

| ファイル | 説明 |
|---------|------|
| `scripts/harness/ci-governance/domain/aggregates/ci-template.ts` | CiTemplate集約（templateType識別子、withConfig()でTemplateConfig注入、validate()でINV-1〜INV-4チェック） |
| `scripts/harness/ci-governance/domain/value-objects/template-config.ts` | TemplateConfig VO（targetValidatorIds 1件以上必須 INV-2） |
| `scripts/harness/ci-governance/domain/services/template-generator.ts` | TemplateGenerator（D6: TemplateType×TriggerConditionマッピング） |
| `scripts/harness/ci-governance/application/` | GenerateCiTemplateUseCase, RenderCiTemplateUseCase |
| `scripts/harness/ci-governance/infrastructure/` | ValidatorIdRegistryAdapter, PresetConfigAdapter, YamlTemplateRendererAdapter |
| `scripts/harness/ci-governance/presentation/handlers/generate-ci-template-handler.ts` | `ci:generate-template` CLIハンドラー |

### テスト状況
- ユニットテスト: ✅ 完了（`ci-template.test.ts`, `template-config.test.ts`, `template-generator.test.ts`）
- 統合テスト: ✅ 完了（`generate-ci-template-usecase.test.ts`, `render-ci-template-usecase.test.ts`, `generate-ci-template-handler.test.ts`, `ci-template-generation-flow.test.ts`）
- E2Eテスト: ✅ 完了（`cli-harness.test.ts` `ci:generate-template` コマンド認識確認）

## 4. QA
なし（遡及記録）
