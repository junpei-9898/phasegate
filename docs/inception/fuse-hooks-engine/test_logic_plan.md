# テストロジック設計計画: fuse-hooks-engine

## 1. スコープ
- unit_test_logic.md: ✅ 既存（774行）→ 検証のみ
- it_test_logic.md: ✅ 既存（922行）→ 検証のみ
- scenario_test_logic.md: ❌ 未作成 → Phase 2で新規作成

## 2. シナリオテストロジック設計方針
- SC-HF-001〜006に対応するVitest E2Eテストの疑似コード
- spawnSyncパターン（既存cli-harness.test.tsに準拠）
- AAA パターン、日本語テスト名、actual変数使用

## 3. QA
なし
