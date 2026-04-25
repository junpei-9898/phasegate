# シナリオテスト設計: H15-01 — v0 143テスト仕様のv1再実装
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20

## 1. テスト対象機能

v0テスト仕様143件の移行対象分析と移行対象リストの作成、各テスト仕様のv1コードベースでの再実装、Biome移行に伴い修正が必要なテストの特定と修正を行う。再実装された全テストが`pnpm test`で実行可能であること、v0テスト仕様とv1テスト実装の対応表を作成することが目標。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-RS-H1501-001 | regression:analyze-migration コマンドがCLIに登録されている | `regression:analyze-migration --dry-run` | stderrに "Unknown command: regression:analyze-migration" を含まない |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `regression-suite コマンド群` セクション

## 4. 前提条件

- CLIルーティングに `regression:analyze-migration` 登録済み
- 全v1 Unit（Wave 1-3）の実装完了（Phase Bの前提）
- v0テスト仕様143件の分析対象ファイル確定済み
