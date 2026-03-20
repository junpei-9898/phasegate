# テスト設計計画: phase2-extensions

## 1. スコープ
- unit_test_design.md: ✅ 既存（269行, UT-P2-001〜065）→ 検証のみ
- it_test_design.md: ✅ 既存（301行, IT-P2-001〜041）→ 検証のみ
- scenario_test_design.md: ❌ 未作成 → Phase 2で新規作成

## 2. シナリオテスト設計方針
- CLIコマンド（p2:check-freshness, p2:validate-pointers, p2:generate-e2e-template）のE2Eテスト
- 実際にプロセスを起動して標準出力・終了コードを検証
- 既存cli-harness.test.tsのパターンに準拠

## 3. QA
なし
