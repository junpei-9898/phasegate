# シナリオテスト設計: H12-06 — スキルSKILL.md構造維持検証
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20

## 1. テスト対象機能

SKILL.mdの必須構造（フロントマター/目的/入力/出力/前提条件/実行フロー）の定義と、v0既存スキル・v1新規スキルのSKILL.mdが必須構造を満たしていることを検証する。構造違反時のエラーメッセージに不足セクション名と期待される構造を含める。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-SQ-H1206-001 | skill:validate-structure コマンドがCLIに登録されている | `skill:validate-structure --file nonexistent-skill.md` | stderrに "Unknown command: skill:validate-structure" を含まない |
| SC-SQ-H1206-002 | skill:validate-structure --file 引数を受け付ける | `skill:validate-structure --file nonexistent-skill.md` | stderrに "Unknown command" を含まない |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `skill-quality コマンド群` セクション

## 4. 前提条件

- `scripts/harness/skill-quality/presentation/handlers/validate-skill-structure-handler.ts` 実装済み
- CLIルーティングに `skill:validate-structure` 登録済み
