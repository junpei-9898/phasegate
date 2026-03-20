# シナリオテスト設計: H12-04 — Agent-Lesson System（lesson artifact出力）
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20

## 1. テスト対象機能

`[Agent-Lesson]`タグ付きの教訓をソースコード・コミットメッセージ・設計文書から収集し、構造化されたlesson artifactとして出力（JSON形式）する。重複する教訓の検出・統合を行う。AGENTS.mdへの直接書き込みは行わない（ci-governanceの責務）。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-SQ-H1204-001 | skill:collect-lessons コマンドがCLIに登録されている | `skill:collect-lessons --story H99-01` | stderrに "Unknown command: skill:collect-lessons" を含まない |
| SC-SQ-H1204-002 | skill:collect-lessons --story 引数を受け付ける | `skill:collect-lessons --story H12-04` | stderrに "Unknown command" を含まない |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `skill-quality コマンド群` セクション

## 4. 前提条件

- `scripts/harness/skill-quality/presentation/handlers/collect-lessons-handler.ts` 実装済み
- CLIルーティングに `skill:collect-lessons` 登録済み
- ci-governance の LessonArtifact Schema 確定済み
