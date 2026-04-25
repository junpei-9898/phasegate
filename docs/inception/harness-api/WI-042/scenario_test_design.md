# シナリオテスト設計: H09-01 — phasegate:check-ready / phasegate:check-phase

> **Unit ID**: harness-api
> **ストーリーID**: H09-01
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

- `phasegate:check-ready`: 全storyのPhase Gate通過状態をJSON形式で返す
- `phasegate:check-phase <unit>`: 指定Unitの現在フェーズ（Level/スキル名）を返す

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H09-01-001 | phasegate:check-readyコマンドがCLIルーティングに登録されている | `phasegate:check-ready` | stderrに"Unknown command"を含まない |
| SC-H09-01-002 | phasegate:check-readyが全story通過時にstatus=passを返す | `phasegate:check-ready`（全story通過） | stdout のJSONにstatus='pass'を含む、exit 0 |
| SC-H09-01-003 | phasegate:check-readyが未通過storyある時にstatus=failを返す | `phasegate:check-ready`（未通過あり） | stdout のJSONにstatus='fail'を含む、exit 1 |
| SC-H09-01-004 | phasegate:check-phase コマンドがCLIルーティングに登録されている | `phasegate:check-phase config-foundation` | stderrに"Unknown command"を含まない |
| SC-H09-01-005 | phasegate:check-phaseが有効なUnitのフェーズ情報を返す | `phasegate:check-phase config-foundation` | exit 0、dataフィールドにunitIdを含む |
| SC-H09-01-006 | phasegate:check-phaseが存在しないUnit名で適切なエラーを返す | `phasegate:check-phase nonexistent-unit` | exit 1、stderrまたはstdoutにエラーメッセージ |
| SC-H09-01-007 | phasegate:check-readyのJSONレスポンスにstories[]フィールドが含まれる | `phasegate:check-ready` | data.stories が配列 |

## 3. テスト配置
- ユニットテスト: `scripts/harness/__tests__/unit/harness-api/`（CommandDispatchService、CommandRegistry）
- 統合テスト: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 4. 前提条件
- phase-dependency-modelのPhaseGateQueryPort実装が完了していること
- HarnessApiResponse\<CheckReadyResult\>のJSON構造が確定していること
