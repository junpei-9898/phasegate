# シナリオテスト設計: H12-05 — Cascade Updater拡張（Level 3完了後の累積更新 + @story-id HXX-XX自動付与）
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20

## 1. テスト対象機能

Level 3（ストーリー実装）完了後に`product/construction/{unit}/`配下のドキュメントを累積更新し、累積更新箇所に@story-id HXX-XXアノテーションを自動付与する。実行結果に更新されたファイル・セクション・付与されたストーリーIDの一覧を含める。

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-SQ-H1205-001 | skill:apply-cascade-update コマンドがCLIに登録されている | `skill:apply-cascade-update --story H12-05` | stderrに "Unknown command" を含まない |

## 3. テスト配置

`scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `skill-quality コマンド群` セクション

## 4. 前提条件

- `scripts/harness/skill-quality/presentation/handlers/apply-cascade-update-handler.ts` 実装済み
- CLIルーティングに `skill:apply-cascade-update` 登録済み
- traceability-model の @unit/@layer/@story-id メタデータ仕様確定済み
