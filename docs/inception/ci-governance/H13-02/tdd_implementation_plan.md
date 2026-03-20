# TDD実装計画: H13-02 (ci-governance)

## 1. スコープ
- 対象ストーリー: H13-02 反復エラー自動エスカレーション
- 影響する層: domain（ErrorRepetition集約、EscalationAction/RepetitionResetCondition VO、RepetitionDetector）、application（RecordErrorOccurrenceUseCase、CheckEscalationUseCase、ResetRepetitionUseCase）、infrastructure（ErrorRepetitionJsonRepository、EscalationLogExecutorAdapter）、presentation（CheckRepetitionHandler: `ci:check-repetition`）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

| ファイル | 説明 |
|---------|------|
| `scripts/harness/ci-governance/domain/aggregates/error-repetition.ts` | ErrorRepetition集約（increment/isEscalated/reset、INV-5〜INV-7） |
| `scripts/harness/ci-governance/domain/value-objects/escalation-action.ts` | EscalationAction VO（logLevel/messageTemplate、formatMessage()） |
| `scripts/harness/ci-governance/domain/value-objects/repetition-reset-condition.ts` | RepetitionResetCondition VO（resetOnResolution） |
| `scripts/harness/ci-governance/domain/services/repetition-detector.ts` | RepetitionDetector（ErrorRepetitionRepositoryPort注入、detect()メソッド） |
| `scripts/harness/ci-governance/application/` | RecordErrorOccurrenceUseCase, CheckEscalationUseCase, ResetRepetitionUseCase |
| `scripts/harness/ci-governance/infrastructure/error-repetition-json-repository.ts` | `.harness/error-history.json` CRUD |
| `scripts/harness/ci-governance/infrastructure/escalation-log-executor-adapter.ts` | EscalationExecutorPort実装 |
| `scripts/harness/ci-governance/presentation/handlers/check-repetition-handler.ts` | `ci:check-repetition` CLIハンドラー（--error-code/--reset フラグ） |

### テスト状況
- ユニットテスト: ✅ 完了（`error-repetition.test.ts`, `escalation-action.test.ts`, `repetition-reset-condition.test.ts`, `repetition-detector.test.ts`）
- 統合テスト: ✅ 完了（`record-error-occurrence-usecase.test.ts`, `check-escalation-usecase.test.ts`, `reset-repetition-usecase.test.ts`, `check-repetition-handler.test.ts`, `error-repetition-json-repository.test.ts`, `error-repetition-flow.test.ts`）
- E2Eテスト: ✅ 完了（`cli-harness.test.ts` `ci:check-repetition` コマンド認識確認）

## 4. QA
なし（遡及記録）
