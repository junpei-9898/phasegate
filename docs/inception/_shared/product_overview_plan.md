# Product Overview Plan — Phasegate

> **フェーズ**: Phase 1（計画）— Self-hosting 遡及ドキュメント
> **目的**: Phasegate プロダクト全体のビジョン・スコープ・制約を定義し、以降の設計フェーズの起点とする
> **ステータス**: self-hosting 遡及作成（2026-04-05）
> **対応文書**: `docs/product/product_overview.md`, `docs/product/harness_product_overview.md`

---

## QA（設計判断の根拠）

### Q1: Phasegate の対象ユーザーは誰か
- **Q**: 個人開発者・チーム・エンタープライズ、どこを主ターゲットにするか？
- **A**: **AI エージェント（Claude Code, Codex, Cursor 等）を実装に使う全レベルの開発チーム**。小規模から大規模まで段階的適用可能にするためプリセット制を採用。
- **根拠**: 「AI 非依存の品質防御」が中核価値。特定組織規模に依存しない。

### Q2: 非 AI 開発にも適用できるか
- **Q**: 人間のみの開発フローでも有用か？
- **A**: **有用だがスコープ外**。人間開発は既存のレビュー・CI で十分制御可能。AI 特有の「設計飛ばし」「構造破壊」「ゴーストファイル」等の防御が主目的。
- **根拠**: §2 ポジショニング — AI 固有の失敗モードを対象。

### Q3: Phase 2 backlog の扱い
- **Q**: FUSE Hooks Engine 等の Phase 2 機能は v1.0 に含めるか？
- **A**: **含めない**。v1.0 は Claude Code Hook Adapter までで完結。FUSE は OS レベル統合で複雑性が高く、v2.0 で再評価。
- **根拠**: スコープ最小化原則 + OSS 公開の MVP 戦略。

---

## 計画内容

### 1. プロダクトミッション

> 設計意図とコードの構造的整合性を機械的に保証し、AI エージェントによる実装を信頼可能にする。

### 2. 中核価値

- **AI 非依存**: Claude Code, Codex, Cursor 等どのエージェントでも動作
- **5 層防御**: L0（FUSE/Hook）→ L1（編集時）→ L2（コミット時）→ L3（CI）→ L4（定期）
- **Phase Gate**: 設計フェーズ未完了で実装を開始できない構造的強制
- **Progressive Disclosure**: プリセット制で minimal → standard → full → strict と段階導入

### 3. v1.0 スコープ

- 5 層防御モデル実装
- 28 スキル定義（AIDLC 完全カバー）
- 4 プリセット（full/standard/minimal/custom）
- Claude Code Hooks Adapter
- 自己ホスティング（phasegate 自身が phasegate で品質管理）

### 4. 関連文書

- `docs/product/harness_product_overview.md` — 詳細な機能定義
- `docs/product/user_stories.md` — US 一覧
- `docs/product/user_story_mapping.md` — ストーリーマッピング
- `docs/product/units/integration_contract.md` — Unit 間連携契約

---

## 承認

- [x] Self-hosting 運用継続のための遡及作成として承認（2026-04-05）
