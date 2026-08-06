# Unit設計計画

> **スキル**: `unit-designer` Phase 1（計画）
> **成果物**: `docs/product/units/{unit}_unit.md` / `docs/product/units/integration_contract.md`（Phase 2 で作成）
> **入力**: `docs/product/user_stories.md` / `docs/product/user_story_mapping.md`
> **作成日**: <YYYY-MM-DD>

このファイルは `phasegate scaffold-inception --kind unit-design-plan --apply`
が生成した雛形です。TODO を実体で埋めてください。
**QA セクションの `[Answer]` は人間が記入するもので、AI が埋めてはいけません。**

> **パス注記**: 上記の既定パスは `phasegate.config.json` の `paths` 設定で
> 上書きされている場合、そちらが優先されます。

---

## 1. スコープ

- TODO: 対象ストーリー数
- TODO: 分析対象の業務領域

## 2. グルーピング方針

- TODO: 凝集性の基準
- TODO: Unit 分割の判断根拠

## 3. Unit一覧（ドラフト）

| Unit名 | 担当ストーリーID | 責務概要 |
|--------|----------------|---------|
| TODO | TODO | TODO |

## 4. Unit間依存関係（ドラフト）

- TODO: 依存関係図（概要レベル）

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
