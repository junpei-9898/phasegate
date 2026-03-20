# シナリオテスト設計: H07-03 — test-coverage-checkerでの要件カバレッジ算出

> **Unit ID**: nyquist-validation
> **ストーリーID**: H07-03
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

`CoverageCalculationService` および `CalculateCoverageUseCase` による要件カバレッジ算出機能。

- requirement-test-matrix.jsonからAC網羅率（マッピング済みAC数/全AC数）を算出
- AC網羅率が100%未満の場合、未カバーACの一覧をレポートに出力
- コードカバレッジ閾値（standard: 90% / strict: 95%）と要件カバレッジの両方をレポートに含める

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-NQ-03-001 | 全AC（3件）がマッピング済みの場合 | 3AC全てにacMappings存在 | coverageRate=100%、uncoveredAcs=[] |
| SC-NQ-03-002 | AC網羅率が100%未満の場合 | 3AC中1件がマッピングなし | coverageRate=66.7%、uncoveredAcs=['AC-2'] |
| SC-NQ-03-003 | standardプリセットのコードカバレッジ閾値が含まれる場合 | preset='standard' | report.codeThreshold=90 |
| SC-NQ-03-004 | strictプリセットのコードカバレッジ閾値が含まれる場合 | preset='strict' | report.codeThreshold=95 |
| SC-NQ-03-005 | storyMappingsが空の場合 | storyMappings=[] | coverageRate=100%（分母0の場合の安全処理） |

## 3. テスト配置
- `scripts/harness/__tests__/unit/nyquist-validation/coverage-result.test.ts`
- `scripts/harness/__tests__/unit/nyquist-validation/coverage-calculation-service.test.ts`

## 4. 前提条件
- `CoverageThresholdPort` が実装されていること（ConfigFoundationCoverageThresholdAdapter）
- `RequirementTestMatrix` 集約からCoverageResultが算出可能であること
- `HarnessConfigV2` からcoverageThresholdが取得可能であること
