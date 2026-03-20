# 論理設計計画: regression-suite
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20

## 1. スコープ
- 対象Unit: regression-suite
- 影響するストーリー: H14-01, H14-02, H14-03, H15-01, H15-02

## 2. 設計方針

既存論理設計（`docs/product/construction/regression-suite/logical_design.md`）の品質評価:

- アーキテクチャ概要（テストスイート = Presentation代替の独自構造）: ✅ 完備
- ディレクトリ構成（全ファイル一覧 kebab-case）: ✅ 正しい命名規則
- Domain層設計（集約1・VO15・ドメインサービス3・ポート7）: ✅ 詳細
- Application層設計（UseCase7 + DTO定義）: ✅ 完備
- Infrastructure層設計（Adapter7）: ✅ 完備
- テストスイート層設計（k-requirements, gng-gate, agent-independence, v0-migration）: ✅ 完備
- ストーリー別フロー設計: ✅ H14-01〜H14-03、H15-01〜H15-02全てカバー

**重要前提**: regression-suite は通常のCLI Presentation層の代わりに、4種のVitest外部テストスイートファイルとして実装する。

## 3. 採用パターン
- Hexagonal Architecture (Port & Adapter)
- domain → application → infrastructure → テストスイート（Presentation代替）
- RegressionTestSuiteはドメインサービスに降格（ステートレス・永続化不要）
- V0TestMigrationは集約ルートとして維持（状態遷移・識別子・I/O境界あり）

## 4. QA
なし（遡及記録）
