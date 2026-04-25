# シナリオテスト設計: H15-02 — v1再実装テストのCIゲート化
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20

## 1. テスト対象機能

CIパイプラインにv1再実装テスト全件実行のステップを追加する。1件でもテスト失敗があればCIが失敗する設定、テスト実行結果のサマリー（通過数/失敗数/全体数）のCI出力への含有、テストカバレッジ90%閾値のv1再実装テストへの適用を行う。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-RS-H1502-001 | regression:configure-ci-gate コマンドがデフォルト値で exit 0 が返る | `regression:configure-ci-gate` | exitCode=0、stdoutに "CI gate configured" を含む |
| SC-RS-H1502-002 | regression:configure-ci-gate --suites 不正値で exit 2 が返る | `regression:configure-ci-gate --suites invalid-suite` | exitCode=2、stderrに "Invalid suite ID" を含む |
| SC-RS-H1502-003 | regression:configure-ci-gate --json でJSON形式の出力が返る | `regression:configure-ci-gate --json` | exitCode=0、stdout の coverageThreshold が number 型 |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `regression-suite コマンド群` セクション

## 4. 前提条件

- CLIルーティングに `regression:configure-ci-gate` 登録済み
- v1再実装テスト全件が`pnpm test`で実行可能（H15-01完了前提）
