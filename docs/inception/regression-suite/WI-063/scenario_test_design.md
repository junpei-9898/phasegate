# シナリオテスト設計: H14-03 — Go/No-Go Gate品質側3条件回帰テスト
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20

## 1. テスト対象機能

Go/No-Go Gate品質側3条件の回帰テストを整備する。GNG-4「yolo/skip-permissions不採用」（deny listとhooksの完全維持）、GNG-5「2-Phase Execution維持」（設計スキルの人間承認ゲート存在）、GNG-8「デフォルトOFF」（GSD由来機能のデフォルト値がfalse/disabled）を検証し、CIゲートへ組み込む。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-RS-H1403-001 | regression:run-gng-gate コマンドが exit 0 で完了する | `regression:run-gng-gate` | exitCode=0、stdoutに "GnG Gate" を含む |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `regression-suite コマンド群` セクション

## 4. 前提条件

- CLIルーティングに `regression:run-gng-gate` 登録済み
