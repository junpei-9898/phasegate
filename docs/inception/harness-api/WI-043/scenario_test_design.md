# シナリオテスト設計: H09-02 — phasegate:ci-check

> **Unit ID**: harness-api
> **ストーリーID**: H09-02
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

- `phasegate:ci-check`: 全L3バリデータ（security/performance/coverage/nyquist）を順次実行し、統合Pass/Fail判定を返す

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H09-02-001 | phasegate:ci-checkコマンドがCLIルーティングに登録されている | `phasegate:ci-check` | stderrに"Unknown command"を含まない |
| SC-H09-02-002 | 全L3バリデータ通過時にstatus=passが返される | `phasegate:ci-check`（全通過） | exit 0、stdout JSONにstatus='pass' |
| SC-H09-02-003 | 1つでもL3バリデータ失敗時にstatus=failが返される | `phasegate:ci-check`（security失敗） | exit 1、stdout JSONにstatus='fail' |
| SC-H09-02-004 | 実行結果にバリデータ別のPass/Fail詳細が含まれる | `phasegate:ci-check` | data.validatorResultsが配列、各要素にvalidatorId/passedフィールド |
| SC-H09-02-005 | 失敗時のレスポンスにHarnessError一覧が含まれる | `phasegate:ci-check`（失敗） | errors[]が1件以上 |
| SC-H09-02-006 | CiCheckResultのallPassedとvalidatorResults整合性が保たれる | `phasegate:ci-check` | allPassed === validatorResults.every(r => r.passed) |

## 3. テスト配置
- ユニットテスト: `scripts/harness/__tests__/unit/harness-api/ci-check-result.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/harness-api/validator-system-execution-adapter.test.ts`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 4. 前提条件
- validator-systemのValidatorExecutionPort（runL3Validators）実装が存在すること
- CiCheckResult（INV-5: validatorResults[]は1件以上、INV-6: allPassed整合性）の不変条件が実装されていること
