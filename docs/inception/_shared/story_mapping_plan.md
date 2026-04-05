# Story Mapping Plan — Phasegate

> **フェーズ**: Phase 1（計画）— Self-hosting 遡及ドキュメント
> **目的**: User Story Mapping を作成し、MVP スコープと Wave 分割を確定する
> **ステータス**: self-hosting 遡及作成（2026-04-05）
> **対応文書**: `docs/product/user_story_mapping.md`
> **前提**: `docs/inception/_shared/story_writer_plan.md`（完了済み）

---

## QA（設計判断の根拠）

### Q1: Wave 分割の基準
- **Q**: US を Wave 1/2/3 にどう分けるか？
- **A**: **依存関係 + 基盤先行の原則**。Wave 1: 基盤（Biome, Phase, Traceability, Config, ADR, HarnessError）/ Wave 2: コア品質機構 + エージェント統合 / Wave 3: 拡張・運用・保証。
- **根拠**: `story_writer_plan.md` の §3 Wave 分割で確定済み。

### Q2: MVP の定義
- **Q**: v1.0 リリースの最小スコープは？
- **A**: **Wave 1 + Wave 2 完了で v1.0**。Wave 3 は v1.1 以降に順次追加。
- **根拠**: Wave 1 + Wave 2 で 5 層防御の基本機能が揃う。

### Q3: OSS 公開タイミング
- **Q**: どの段階で OSS 公開するか？
- **A**: **Wave 1 完了 + minimal 自己ホスティング動作時点で α 公開**、v1.0 で正式公開。
- **根拠**: 品質防御ツール自身が品質管理できない状態で公開するのは自己矛盾。

---

## 計画内容

### 1. Story Map 構造

```
[Backbone: 開発ライフサイクル]
   ↓
[Activities: Product定義 → Story設計 → Unit設計 → Domain設計 → Test設計 → 実装 → 検証 → デプロイ]
   ↓
[User Tasks: 各Activity 内の具体的作業]
   ↓
[Stories: Wave 1 / Wave 2 / Wave 3 に分類]
```

### 2. Wave 別優先度

- **Wave 1（MVP 基盤）**: H-01 〜 H-06（18 US, 17 Must + 1 Should）
- **Wave 2（コア品質 + 統合）**: H-07 〜 H-11（21 US, 19 Must + 2 Should）
- **Wave 3（拡張・運用）**: H-12 〜 H-15（14 US, 12 Must + 2 Should）

### 3. リリース計画

| Release | スコープ | US 数 |
|---------|---------|-------|
| v0.x | Self-hosting 基盤整備（Wave 1 相当） | 18 |
| v1.0 | OSS 公開可能水準（Wave 1 + Wave 2） | 39 |
| v1.1+ | 拡張・運用機能（Wave 3） | 14 |

### 4. 関連文書

- `docs/product/user_story_mapping.md` — Story Map 本体
- `docs/product/user_stories.md` — US 詳細一覧
- `docs/inception/_shared/story_writer_plan.md` — Story 作成計画（完了）

---

## 承認

- [x] Self-hosting 運用継続のための遡及作成として承認（2026-04-05）
