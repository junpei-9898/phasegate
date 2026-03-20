# シナリオテスト設計: H12-02 — test-coverage-checker Nyquist Validation統合
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20

## 1. テスト対象機能

test-coverage-checkerがrequirement-test-matrix.jsonを生成または更新し、要件→テスト・テスト→要件双方向のトレーサビリティを検証する。coverage_report.mdに要件カバレッジ（AC網羅率）を含める。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-SQ-H1202-001 | skill:check-coverage コマンドがCLIに登録されている | `skill:check-coverage --story H99-01` | stderrに "Unknown command: skill:check-coverage" を含まない |
| SC-SQ-H1202-002 | skill:check-coverage --story 引数を受け付ける | `skill:check-coverage --story H12-02` | stderrに "Unknown command" を含まない |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `skill-quality コマンド群` セクション

## 4. 前提条件

- `scripts/harness/skill-quality/presentation/handlers/check-coverage-handler.ts` 実装済み
- CLIルーティングに `skill:check-coverage` 登録済み
- nyquist-validation の RequirementTestMatrix Schema 確定済み
