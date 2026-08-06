# ユーザーストーリー作成計画

> **スキル**: `story-writer` Phase 1（計画）
> **成果物**: `docs/product/user_stories.md`（Phase 2 で作成）
> **入力**: `docs/product/product_overview.md`
> **作成日**: <YYYY-MM-DD>

このファイルは `phasegate scaffold-inception --kind story-writer-plan --apply`
が生成した雛形です。TODO を実体で埋めてください。
**QA セクションの `[Answer]` は人間が記入するもので、AI が埋めてはいけません。**

---

## 1. スコープ

- TODO: 対象の要求文書
- TODO: 想定される Epic 一覧

## 2. アクター分析

- TODO: 特定されたアクター（ロール）一覧

## 3. ストーリー作成方針

- TODO: ストーリーの粒度方針

## 4. ストーリー一覧（ドラフト）

Epic 別のストーリー ID・概要の一覧（本文はまだ書かない）。

| Epic | ストーリーID | 概要 |
|------|------------|------|
| TODO | TODO | TODO |

## 5. QA（不明点・確認事項）

### [Question] Q1: <質問タイトル>

<質問の詳細と背景>

**推奨案:** <AI の推奨案>

> 下の `[Answer]` 行の直後に **人間が** 回答を記入してください。
> 空欄のままだと `planningMode: "embedded-qa"` のフェーズゲートは通りません（意図した挙動です）。

[Answer]

## 6. 前提条件・リスク

- TODO: 前提条件
- TODO: リスクと対応方針

---

## フェーズゲートとの関係

- `planningMode.default: "interactive"`（既定）では、`## 5. QA（不明点・確認事項）`
  という **QA セクション見出しの存在** が Level-1 ゲート通過条件です。
- `planningMode.default: "embedded-qa"` では、`[Question]` と `[Answer]` の
  **個数一致かつ [Answer] に本文があること** が追加で要求されます。
  この雛形のままではゲートを通りません（人間の回答が必要）。これは意図した挙動です。
