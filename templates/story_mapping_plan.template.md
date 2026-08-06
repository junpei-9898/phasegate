# ストーリーマッピング計画

> **スキル**: `story-mapper` Phase 1（計画）
> **成果物**: `docs/product/user_story_mapping.md`（Phase 2 で作成）
> **入力**: `docs/product/user_stories.md`
> **作成日**: <YYYY-MM-DD>

このファイルは `phasegate scaffold-inception --kind story-mapping-plan --apply`
が生成した雛形です。TODO を実体で埋めてください。
**QA セクションの `[Answer]` は人間が記入するもので、AI が埋めてはいけません。**

---

## 1. スコープ

- TODO: 全ストーリー数
- TODO: MVP 選定の対象業務プロセス

## 2. MVP選定基準

- TODO: 基盤 MVP と業務プロセス MVP の分類基準
- TODO: MVP / Post-MVP 判定の考え方

## 3. MVPシナリオ（ドラフト）

- TODO: 想定されるメインユーザーフロー
- TODO: 最小限の業務プロセス単位

## 4. ストーリー分類（ドラフト）

| ストーリーID | 概要 | MVP候補 | 分類理由 |
|------------|------|---------|---------|
| TODO | TODO | TODO | TODO |

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
