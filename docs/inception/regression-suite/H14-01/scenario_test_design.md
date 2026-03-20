# シナリオテスト設計: H14-01 — K1-K13回帰テスト整備
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20

## 1. テスト対象機能

K1-K13の全非交渉要件の回帰テストを整備し、CIゲートへ組み込む。K1（4層防御）、K2（Phase Gate）、K3（Biome AST）、K3.5（メタデータ）、K4-K6（テスト品質/DDD/2Phase）、K7-K9（DocSplit/Cascade/AgentLesson）、K10-K13（Security/Drift/Consistency/Config）を網羅する。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-RS-H1401-001 | regression:run-k-requirements コマンドが exit 0 で完了する | `regression:run-k-requirements` | exitCode=0、stdoutに "K-Requirements" を含む |
| SC-RS-H1401-002 | regression:run-k-requirements --json でJSON形式の出力が返る | `regression:run-k-requirements --json` | exitCode=0、stdoutがパース可能なJSONオブジェクト |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `regression-suite コマンド群` セクション

## 4. 前提条件

- CLIルーティングに `regression:run-k-requirements` 登録済み
- 対象Unit（Wave 1-2: biome-ast-engine, phase-dependency-model, traceability-model等）の実装完了
