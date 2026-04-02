# シナリオテスト設計: H13-02 — 反復エラー自動エスカレーション
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20

## 1. テスト対象機能

H13-02は反復エラー自動エスカレーション機能を実装する。具体的には以下を提供する:

- 同一HarnessError code の繰り返し（閾値: デフォルト3回）の検出
- 反復検出時の自動エスカレーション（EscalationExecutorPort経由でログ出力 + 警告メッセージ）
- エスカレーション閾値のphasegate.config.jsonによる設定
- 反復検出のリセット条件（escalated=trueかつresetOnResolution=true時のみreset()可能、INV-7）
- 発生履歴の `.harness/error-history.json` への永続化

CLIコマンド: `ci:check-repetition --code {errorCode}` / `ci:check-repetition --code {errorCode} --reset`
Presentation: `scripts/harness/ci-governance/presentation/handlers/check-repetition-handler.ts`

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H13-02-001 | 初回エラー発生を記録するとcurrentCount=1・escalated=falseが返ること | `errorCode='L1-001'`（初回） | `currentCount=1`, `escalated=false`, `escalationAction=null` |
| SC-H13-02-002 | 3回目で threshold=3 に到達しescalated=trueになること | `errorCode='L1-001'`（3回目: 既存occurrenceCount=2） | `currentCount=3`, `escalated=true`, `escalationAction!=null` |
| SC-H13-02-003 | 異なるerrorCodeのエラーは独立して管理されること | `errorCode='L2-002'`（別コード初回） | `currentCount=1`, `escalated=false`（他コードに影響なし） |
| SC-H13-02-004 | escalated=trueのエラーをconfirmedResolution=trueでリセットできること | `errorCode='L1-001'`（escalated=true）, `confirmedResolution=true` | `success=true`, `errors=[]`。reset後のoccurrenceCount=0 |
| SC-H13-02-005 | escalated=falseのエラーをリセットしようとするとINV-7違反エラーが返ること | `errorCode='L1-001'`（escalated=false） | `success=false`, errors にINV-7違反エラー |
| SC-H13-02-006 | 存在しないerrorCodeのエスカレーション状況確認でexists=falseが返ること | `errorCode='L9-999'` | `exists=false` |
| SC-H13-02-007 | ErrorRepetitionJsonRepositoryのsave→findByCode往復が正しく動作すること | `occurrenceCount=3`のErrorRepetition | save後のfindByCode()で同一値が取得できる |
| SC-H13-02-008 | E2E: `ci:check-repetition` コマンドが認識されること | `args=['--code', 'ERR-001']` | stderrに "Unknown command: ci:check-repetition" を含まない |

## 3. テスト配置

- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/error-repetition.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/escalation-action.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/repetition-reset-condition.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/repetition-detector.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/record-error-occurrence-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/check-escalation-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/reset-repetition-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/check-repetition-handler.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/error-repetition-json-repository.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/error-repetition-flow.test.ts`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`（`ci-governance コマンド群` セクション）

## 4. 前提条件

- `ErrorRepetition` 集約ルート: `code`（HarnessErrorCode）が識別子。`increment()` → `isEscalated()` → `reset()` ライフサイクル
- `RepetitionDetector` ドメインサービス: `ErrorRepetitionRepositoryPort.findByCode()` → increment → save → EscalationActionを返す
- `RepetitionResetCondition` VO: `resetOnResolution: boolean`。reset()はINV-7（escalated=trueかつ条件成立時のみ）
- `EscalationAction` VO: `logLevel: 'warn'|'error'`, `messageTemplate: string`。実行はEscalationExecutorPortに委譲
