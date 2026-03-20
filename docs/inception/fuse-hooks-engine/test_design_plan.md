# テスト設計計画: fuse-hooks-engine

## 1. スコープ
- unit_test_design.md: ✅ 既存（351行, UT-HF-001〜094）→ 検証のみ
- it_test_design.md: ✅ 既存（333行, IT-HF-001〜040）→ 検証のみ
- scenario_test_design.md: ❌ 未作成 → Phase 2で新規作成

## 2. シナリオテスト設計方針
- CLIコマンド（hooks:config, hooks:gate-check）のE2Eテスト
- 実際にプロセスを起動して標準出力・終了コードを検証
- 既存cli-harness.test.tsのパターンに準拠

## 3. QA
なし
