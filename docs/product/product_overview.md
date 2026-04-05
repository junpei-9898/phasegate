# Phasegate — Product Overview

> **ステータス**: 確定版（self-hosting 遡及作成 2026-04-05）
> **前提文書**: `docs/inception/_shared/product_overview_plan.md`
> **関連文書**: `docs/product/harness_product_overview.md`（詳細仕様）

---

## 1. プロダクト定義

**Phasegate** — AI 非依存の品質防御ツールキット。設計意図とコードの構造的整合性を機械的に保証する 5 層防御モデル（L0-L4）と 28 スキルを提供する CLI ツール。

## 2. ポジショニング

AI エージェント（Claude Code, Codex, Cursor, Copilot）による実装は速いが制御されない。設計ステップを飛ばし、レイヤー境界を破り、意図から乖離したコードを生む。Phasegate はこれを **ポータブルでエージェント非依存の防御層** で解決する。

- 設計なしでの実装を物理的に不可能にする
- 検証なしでのコミットを禁止する
- トレーサビリティなしでのマージを禁止する

## 3. 中核価値

| 価値 | 内容 |
|------|------|
| 5 層防御モデル | L0 hook → L1 editor → L2 precommit → L3 CI → L4 scheduled |
| 28 AIDLC スキル | product architect から story implementor まで完全カバー |
| Phase Dependency Model | 必要な設計文書が無ければ実装をブロック |
| Quick Mode | バグ修正・docs・テスト・設定の軽量ゲート |
| Preset System | minimal / standard / full / custom の段階適用 |

## 4. スコープ（v1.0）

**含む:**
- 5 層防御モデル全レイヤー
- プリセット 4 種
- storyReflection（inception → product 累積更新の強制）
- Claude Code Hook Adapter
- CLI (`phasegate init`, `lint`, `validate`, `ci-check`, etc.)
- 28 AIDLC スキル定義

**含まない（Phase 2 backlog）:**
- FUSE Hooks Engine（OS レベル書き込み制御）
- VS Code Extension
- 他エージェント専用 Adapter（Codex/Cursor は CLI/FS フォールバックで対応）

## 5. 関連文書

詳細は `docs/product/harness_product_overview.md` を参照。

- User Stories: `docs/product/user_stories.md`
- User Story Mapping: `docs/product/user_story_mapping.md`
- Units Overview: `docs/product/units/`
- Integration Contract: `docs/product/units/integration_contract.md`
- Environment Contract: `docs/product/environment_contract.md`
