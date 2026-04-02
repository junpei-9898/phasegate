# シナリオテスト設計: H08-03 — L3 coverageバリデータ

> **Unit ID**: validator-system
> **ストーリーID**: H08-03
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

L3 coverageバリデータ（L3-003）の実行機能。

- `phasegate.config.json` の `coverageThreshold` を読み取り閾値検証を実行
- standardプリセット（90%）での閾値検証
- strictプリセット（95%）での閾値検証
- 閾値未達時のHarnessError（L3-003）に現在のカバレッジ値と不足分を含める

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-VS-03-001 | standardプリセットでカバレッジ90%以上の場合 | preset='standard', coverage=92% | passed=true |
| SC-VS-03-002 | standardプリセットでカバレッジ90%未満の場合 | preset='standard', coverage=88% | passed=false、HarnessError(L3-003)に現在値88%と不足2%を含む |
| SC-VS-03-003 | strictプリセットでカバレッジ95%以上の場合 | preset='strict', coverage=96% | passed=true |
| SC-VS-03-004 | strictプリセットでカバレッジ95%未満の場合 | preset='strict', coverage=91% | passed=false、HarnessError(L3-003)に現在値91%と不足4%を含む |
| SC-VS-03-005 | カバレッジレポートが存在しない場合 | coverageReportPath=存在しないパス | passed=false、ファイル未検出エラー |

## 3. テスト配置
- `scripts/harness/__tests__/integration/validator-system/usecases/run-l3-validators-usecase.test.ts`
- `scripts/harness/__tests__/unit/validator-system/layer-config.test.ts`

## 4. 前提条件
- `CoverageReportPort` が実装されていること（JsonCoverageReportAdapter）
- `HarnessConfigV2` からcoverageThreshold設定が取得可能であること
- カバレッジレポートファイル（JSON形式）が存在すること
