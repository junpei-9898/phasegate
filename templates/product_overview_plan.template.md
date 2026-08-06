# プロダクト設計計画

> **スキル**: `product-architect` Phase 1（計画）
> **成果物**: `docs/product/product_overview.md`（Phase 2 で作成）
> **作成日**: <YYYY-MM-DD>

このファイルは `phasegate scaffold-inception --kind product-overview-plan --apply`
が生成した雛形です。TODO を実体で埋めてください。
**QA セクションの `[Answer]` は人間が記入するもので、AI が埋めてはいけません。**

---

## 1. スコープ

- TODO: プロダクトの目的と対象ユーザー概要
- TODO: 設計対象セクション一覧

## 2. ドメイン分析（ドラフト）

- TODO: 特定されたコアドメイン
- TODO: 主要業務概念の候補一覧（ユビキタス言語の種）

## 3. アーキテクチャ方針（ドラフト）

- TODO: 想定されるアーキテクチャスタイル
- TODO: 技術スタック候補

## 4. QA（不明点・確認事項）

### [Question] Q1: <質問タイトル>

<質問の詳細と背景>

**推奨案:** <AI の推奨案>

> 下の `[Answer]` 行の直後に **人間が** 回答を記入してください。
> 空欄のままだと `planningMode: "embedded-qa"` のフェーズゲートは通りません（意図した挙動です）。

[Answer]

## 5. 前提条件・リスク

- TODO: 前提条件
- TODO: リスクと対応方針

---

## フェーズゲートとの関係

- `planningMode.default: "interactive"`（既定）では、`## 4. QA（不明点・確認事項）`
  という **QA セクション見出しの存在** が Level-1 ゲート通過条件です。
  見出しは `## QA` / `## Q&A` / `## 4. QA（...）` のいずれの表記でも構いません。
- `planningMode.default: "embedded-qa"` では、`[Question]` と `[Answer]` の
  **個数一致かつ [Answer] に本文があること** が追加で要求されます。
  この雛形のままではゲートを通りません（人間の回答が必要）。これは意図した挙動です。
