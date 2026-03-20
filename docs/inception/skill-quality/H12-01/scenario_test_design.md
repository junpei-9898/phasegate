# シナリオテスト設計: H12-01 — story-implementor Atomic Git Commits + TDD品質契約
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20

## 1. テスト対象機能

story-implementorのAtomic Commits強化。TDDサイクル（Green/Refactor）到達時に`feat({unit}/{HXX-XX}): {description}`形式のメッセージでAtomic commitを自動生成し、commit前にL1+L2バリデータの通過を保証する。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-SQ-H1201-001 | skill:execute-tdd-cycle コマンドがCLIルーティングに登録されている | `skill:execute-tdd-cycle --story H12-01 --phase REFACTOR` | stderrに "Unknown command" を含まない |
| SC-SQ-H1201-002 | skill:execute-tdd-cycle --story 引数を受け付ける | `skill:execute-tdd-cycle --story H12-01` | stderrに "Unknown command" を含まない |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `skill-quality コマンド群` セクション

## 4. 前提条件

- `scripts/harness/skill-quality/presentation/handlers/execute-tdd-cycle-handler.ts` 実装済み
- CLIルーティング（main.ts）に `skill:execute-tdd-cycle` 登録済み
