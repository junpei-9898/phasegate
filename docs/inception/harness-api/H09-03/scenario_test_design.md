# シナリオテスト設計: H09-03 — harness:detect-drift

> **Unit ID**: harness-api
> **ストーリーID**: H09-03
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

- `harness:detect-drift`: 設計→コード方向とコード→設計方向の双方向乖離を検出し、乖離レポートを返す
- `harness:detect-drift --json`: JSON形式のレポート出力

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H09-03-001 | harness:detect-driftコマンドがCLIルーティングに登録されている | `harness:detect-drift` | stderrに"Unknown command"を含まない |
| SC-H09-03-002 | 乖離0件の場合にstatus=passが返される | `harness:detect-drift`（乖離なし） | exit 0、data.totalCount=0 |
| SC-H09-03-003 | 乖離ありの場合にstatus=failが返される | `harness:detect-drift`（乖離あり） | exit 1、data.drifts[]が1件以上 |
| SC-H09-03-004 | --jsonフラグでJSON形式のレポートが出力される | `harness:detect-drift --json` | stdout がJSON、driftsフィールドを含む |
| SC-H09-03-005 | 乖離レポートにUnit名・乖離方向・対象要素が含まれる | `harness:detect-drift`（乖離あり） | drifts[].direction / drifts[].unit / drifts[].element が存在 |
| SC-H09-03-006 | DriftReportSummaryのtotalCountがdrifts.lengthと一致する | `harness:detect-drift` | totalCount === drifts.length（INV-7） |
| SC-H09-03-007 | 設計→コード方向の乖離とコード→設計方向の乖離が双方向で検出される | `harness:detect-drift`（双方向乖離） | direction='design-to-code' と direction='code-to-design' が混在 |

## 3. テスト配置
- ユニットテスト: `scripts/harness/__tests__/unit/harness-api/drift-report-summary.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 4. 前提条件
- validator-systemのDriftDetectionService（ValidatorExecutionPort.runDriftDetection）実装が存在すること
- DriftReportSummary（INV-7: totalCount === drifts.length）の不変条件が実装されていること
