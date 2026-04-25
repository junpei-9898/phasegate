# シナリオテスト設計: H12-03 — implementation-readiness-checker Plan-Checker Loop統合
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20

## 1. テスト対象機能

implementation-readiness-checkerに最大3回の検証→修正ループ（Plan-Checker Loop）を統合する。各ループでNyquist coverageRate（AC網羅率）を検証し、閾値未満の場合に不足箇所を指摘して修正を促す。3回のループで閾値未達成時はエスカレーション通知を出力する。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-SQ-H1203-001 | skill:run-plan-checker コマンドがCLIに登録されている | `skill:run-plan-checker --story H12-03` | stderrに "Unknown command" を含まない |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `skill-quality コマンド群` セクション

## 4. 前提条件

- `scripts/harness/skill-quality/presentation/handlers/run-plan-checker-loop-handler.ts` 実装済み
- CLIルーティングに `skill:run-plan-checker` 登録済み
