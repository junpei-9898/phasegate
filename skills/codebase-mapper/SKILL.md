---
name: codebase-mapper
description: コードベースの構造マップを生成するスキル。全ソースファイルの `@unit`/`@layer` アノテーションを解析し、Unit・レイヤー分布・Unit間依存関係・循環依存を可視化したマップ文書を出力する。L4バリデータ（drift-detection/dead-code）の入力精度向上にも使用。使用タイミング: 「コードベースの構造を把握したい」「Unitマップを作って」「どのファイルがどのUnitに属するか調べて」「依存関係を可視化して」など。
model: sonnet
review: opus
languages: [typescript]
---

# Codebase Mapper

## 目的

全ソースファイルの `@unit`/`@layer` アノテーションとimportグラフを解析し、
コードベースの構造マップを生成するスキル。

## 入力

- 解析対象ソース: `phasegate.config.json` の `sourceDir` 配下の `**/*.ts`（`__tests__/`・`*.test.ts` は除外）
- 各ソースファイルの `@unit` / `@layer` アノテーションと `import` 文（Unit間依存グラフの構築に使用）

## 前提条件

- `phasegate.config.json` に `sourceDir` が設定されていること
- 解析対象ソースに `@unit` / `@layer` アノテーションが付与されていること（欠落ファイルは後述「アノテーション欠落の対処」で報告される）

## 出力物

`{constructionDir}/codebase-map.md` — Unit・レイヤー分布・依存関係の可視化文書（パスは `phasegate.config.json` で設定）

---

## ⚠️ 2フェーズ実行ルール

- **Phase 1（計画）**: スキャン対象ディレクトリとマップ粒度を確認し、人間の承認を得る
- **Phase 2（実行）**: 解析を実行しマップ文書を生成する

---

## Phase 1: 計画（plan）

### 出力（会話内のみ）

```markdown
# Codebase Mapper 計画

## スキャン対象
- ソースコード: {phasegate.config.json の sourceDir}
- 除外: __tests__/, node_modules/

## 出力粒度
- [ ] Unit一覧（@unit アノテーション）
- [ ] レイヤー分布（@layer アノテーション）
- [ ] Unit間依存関係（import解析）
- [ ] 循環依存検出

## 出力先
{constructionDir}/codebase-map.md

## QA
[Question] Q1: ...
[Answer]
```

### Phase 1 完了条件
- 計画を報告した
- **マップはまだ生成していない**

---

## Phase 2: 実行（execution）

### Step 1: @unit/@layer アノテーションの収集

Glob + Read を使い、`{sourceDir}/**/*.ts`（テスト・fixture除外）から：

```
@unit {unit-name}
@layer {domain|application|infrastructure|presentation}
```

を抽出する。`__tests__/` と `*.test.ts` は除外する。

### Step 2: Import グラフの構築

各ファイルの `import` 文からUnit間依存を抽出する:
- 同Unit内のimport → 内部依存（スキップ）
- 別Unitへのimport → Unit間依存エッジとして記録

### Step 3: 循環依存の検出

Unit間依存グラフを深さ優先探索でサイクル検出する。

### Step 4: マップ文書の生成

`{constructionDir}/codebase-map.md` に出力。

---

## 出力フォーマット

```markdown
# Codebase Map

生成日時: {date}
スキャン対象: {sourceDir}
総ファイル数: N（テスト除く）

---

## Unit 一覧

| Unit | ファイル数 | レイヤー分布 |
|------|----------|-----------|
| unit-a | 12 | domain:4, app:4, infra:2, pres:2 |
| ...

---

## Unit 間依存グラフ

```
unit-a
  └── depends on: unit-b, unit-c, ...

unit-c
  └── depends on: unit-d, unit-e
```

---

## 循環依存

（検出された場合のみ）

| サイクル | 重大度 | 影響ファイル |
|---------|--------|-----------|

---

## アノテーション欠落ファイル

（@unit または @layer がないファイル）

| ファイル | 欠落アノテーション |
|---------|-----------------|
```

---

## アノテーション欠落の対処

マップ生成後、`@unit`/`@layer` が欠落しているファイルが検出された場合:
1. Lintルール違反（require-unit-comment / require-layer-comment）として報告
2. 欠落ファイル一覧を出力し、アノテーション追加を促す

---

## 関連スキル・コマンド

| スキル/コマンド | 用途 |
|--------------|------|
| `npx phasegate lint` | L1 archgateルールの全体スキャン |
| `consistency-checker` | マップ生成後の設計文書整合性確認 |
| `doc-health-checker` | マップと設計文書の鮮度・ポインタ有効性を合わせて確認 |
