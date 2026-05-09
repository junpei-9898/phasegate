# TDD実装計画: H11-01 (agent-integration)

## 1. スコープ
- 対象ストーリー: H11-01 コア品質能力のCLI/FSフォールバック定義
- 影響する層: domain（FallbackCapabilitySpec VO, FallbackVerificationService）、application（VerifyFallbackCapabilityUseCase）、infrastructure（ImportAnalyzerAdapter, CliCommandRegistryAdapter）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

| ファイル | 説明 |
|---------|------|
| `scripts/harness/agent-integration/domain/value-objects/fallback-capability-spec.ts` | FallbackCapabilitySpec VO（INV-5: supportedCommands 1件以上必須） |
| `scripts/harness/agent-integration/domain/services/fallback-verification-service.ts` | FallbackVerificationService（ImportAnalyzerPort/CliCommandRegistryPort参照） |
| `scripts/harness/agent-integration/application/usecases/verify-fallback-capability-usecase.ts` | VerifyFallbackCapabilityUseCase |
| `scripts/harness/agent-integration/infrastructure/adapters/` | ImportAnalyzerAdapter, CliCommandRegistryAdapter実装 |

### テスト状況
- ユニットテスト: ✅ 完了（`fallback-capability-spec.test.ts`, `fallback-verification-service.test.ts`）
- 統合テスト: ✅ 完了（`verify-fallback-capability-usecase.test.ts`）
- E2Eテスト: ✅ 完了（`cli-harness.test.ts` 内でharness-apiコマンド登録確認）

## 4. QA
なし（遡及記録）
