# シナリオテスト設計: H10-03 — Quick Modeバリデータ緩和実行

> **Unit ID**: quick-mode
> **ストーリーID**: H10-03
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

H10-03のCLIエントリポイントは `harness:ci-check --quick`（harness-apiが所有）。quick-mode側は `CiCheckQuickModeHandler` と `ExecuteQuickCiCheckUseCase` を提供する。

- `harness:ci-check --quick`: Quick Mode判定（H10-01）→ 緩和プロファイル生成（H10-02）→ validator-system緩和実行の統合フロー
- `harness:ci-check --quick --dry-run`: validator-systemへの実際の実行指示なし
- `harness:ci-check --quick --fail-on-reject`: eligible=falseの場合に終了コード1
- `harness:ci-check --quick --format json`: JSON形式での出力

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H10-03-001 | harness:ci-check --quickが"Unknown command"にならない | `harness:ci-check --quick` | stderrに"Unknown command"を含まない |
| SC-H10-03-002 | --dry-runフラグで緩和プロファイル生成のみが実行される | `harness:ci-check --quick --dry-run` | exit 0、validator-systemへの実行指示なし |
| SC-H10-03-003 | --fail-on-rejectフラグでeligible=false時に終了コード1が返される | `harness:ci-check --quick --fail-on-reject`（拒否対象ファイル含む） | exit 1 |
| SC-H10-03-004 | --format jsonでJSON形式の判定結果が出力される | `harness:ci-check --quick --format json` | stdout がJSON形式（eligibilityフィールドを含む） |
| SC-H10-03-005 | eligible=trueかつdryRun=falseでvalidator-systemに緩和指示が渡される | `harness:ci-check --quick`（allowedCategoriesのみ） | ValidatorExecutionPort.executeWithProfile()が呼ばれる |
| SC-H10-03-006 | --format human で人間可読な判定結果が出力される | `harness:ci-check --quick --format human` | stdout に "Quick Mode 判定" を含む |
| SC-H10-03-007 | eligible=false時のDecisionContractにrelaxationProfile=undefinedが含まれる | eligible=falseのChangedFiles | decision.relaxationProfile===undefined |

## 3. テスト配置
- ユニットテスト: `scripts/harness/__tests__/unit/quick-mode/application/usecases/execute-quick-ci-check-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/quick-mode/presentation/`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 4. 前提条件
- H10-01（適用可否判定）と H10-02（緩和プロファイル生成）が完了していること
- harness-apiの `harness:ci-check` コマンドが `--quick` フラグを認識してCiCheckQuickModeHandlerに委譲する実装が存在すること
