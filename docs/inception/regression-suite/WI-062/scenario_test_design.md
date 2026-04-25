# シナリオテスト設計: H14-02 — K14-K15回帰テスト + エージェント非依存ガード
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20

## 1. テスト対象機能

K14回帰テスト（Phase Dependency Modelの3層構造・Level間依存強制）、K15回帰テスト（plan文書なしのPhase 2移行拒否）、エージェント非依存ガード（coreモジュールがエージェント固有APIをimportしていないことの検証）を整備する。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-RS-H1402-001 | regression:run-k14-k15 コマンドが exit 0 で完了する | `regression:run-k14-k15` | exitCode=0、stdoutに "K14/K15" を含む |
| SC-RS-H1402-002 | regression:run-agent-guard コマンドが exit 0 で完了する | `regression:run-agent-guard` | exitCode=0、stdoutに "Agent Independence" を含む |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `regression-suite コマンド群` セクション

## 4. 前提条件

- CLIルーティングに `regression:run-k14-k15`、`regression:run-agent-guard` 登録済み
- phase-dependency-model Unit の実装完了（K14/K15回帰テスト対象）
