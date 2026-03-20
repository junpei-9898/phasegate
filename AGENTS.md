# AGENTS.md

## 必読ドキュメント

- **`docs/folder_management_rules.md`** — ドキュメント配置ルール・AIDLCフェーズ順序
- **`docs/principles/architecture-philosophy.md`** — アーキテクチャ哲学
- **`docs/principles/testing-rules.md`** — テスト規約

## ハーネス設計

- `docs/harness_design/integration_architecture.md` — 統合アーキテクチャ
- `docs/harness_design/phase_gate_design.md` — フェーズゲート設計

## ハーネス検証ツール

| コマンド | 用途 |
|---------|------|
| `pnpm harness:status` | ハーネス状態表示 |
| `pnpm harness:init` | 設定ファイル生成 |
| `pnpm harness:enable <target>` | ハーネス/レイヤー有効化 |
| `pnpm harness:disable <target>` | ハーネス/レイヤー無効化 |
| `pnpm harness:check-phase` | フェーズゲート確認 |
| `pnpm harness:check-ready` | 実装開始可否判定 |

## バリデーター一覧（L1-L3: 8つ）

| バリデーター | 検証内容 |
|-------------|---------|
| phase-gate | 設計→実装の順序強制（フェーズゲート） |
| architecture | フォルダ構造・命名規約の検証 |
| dependency | レイヤー依存方向・循環依存の検出 |
| test-quality | AAA・actual命名・単一Act・ドメインモック禁止 |
| security | シークレット・SQLインジェクション・ループ内await |
| performance | N+1クエリ検出・バンドルサイズ制限 |
| consistency | 設計-実装整合性・API契約検証 |
| metadata | @unit/@layer 必須コメントチェック |

## L4 Scheduled 検出器（3つ）

| 検出器 | 検出内容 |
|--------|---------|
| drift-detector | ドメインモデル設計書と実装コードの乖離検出 |
| lesson-collector | `[Agent-Lesson]` コメントの収集・カテゴリ分類 |
| dead-code-detector | 未使用export・未参照ファイルの検出 |

## エラー発生時の対処

1. エラーコードを確認（例: `HARNESS-PG-001`）
2. `AGENT INSTRUCTION` セクションの指示に従う
3. `DOCUMENTATION` のリンク先を必要に応じて参照
4. 修正完了後、再度コマンドを実行して確認
