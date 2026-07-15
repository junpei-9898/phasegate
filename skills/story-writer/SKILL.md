---
name: story-writer
description: 要求文書からWho/What/Why形式のユーザーストーリーと受け入れ基準を作成（AIDLC Step 1.1）
model: sonnet
review: opus
languages: [typescript]
---

# Story Writer

要求文書からユーザーストーリーを作成するスキル。AIDLCプロセスのStep 1.1「ユーザーストーリーの作成」に対応。

## 前提条件チェック

## Pre-flight check (BLOCKING)

Before generating any plan, verify `docs/inception/{unit}/WI-XXX/description.md` exists.
If not, halt and ask the user to create the WI first, or offer to run `phasegate scaffold-wi <unit|_cross> <story|issue|fix|refactor|chore>`.

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **要求文書** — 何を作るかを記述した文書。形式は問わない（議事録、要件メモ、口頭要約のテキスト等）

### 任意インプット（あれば参照）
- **プロダクト概要** — プロダクトの全体像、思想、コアドメインの記述
- **ユビキタス言語集** — ドメイン固有の用語定義

---

## ⚠️ 3フェーズ実行ルール

**このスキルは3フェーズで実行する。**
- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: 委任先モデルに委任して成果物を生成する（`npx phasegate delegate-sonnet` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照（consumer プロジェクトでは `node_modules/phasegate/docs/principles/model-routing.md`、phasegate 自リポジトリでは `docs/principles/model-routing.md` を参照する）。**

---

## Phase 1: 計画（plan）

### 目的
ストーリー作成のスコープ・方針・不明点を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/_shared/story_writer_plan.md`

### 計画ファイルの構成

```markdown
# ユーザーストーリー作成計画

## 1. スコープ
- 対象の要求文書
- 想定されるEpic一覧

## 2. アクター分析
- 特定されたアクター（ロール）一覧

## 3. ストーリー作成方針
- ストーリーの粒度方針

## 4. ストーリー一覧（ドラフト）
- Epic別のストーリーID・概要の一覧（本文はまだ書かない）

## 5. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
{質問の詳細と背景}
**推奨案:** {AIの推奨案}

[Answer]
（人間が回答を記入）

## 6. 前提条件・リスク
- ...
```

### Phase 1 完了条件
- 計画ファイルを出力した
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した**
- **成果物（ストーリー本文）はまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **ストーリー作成** — 各ストーリーをWho/What/Why形式で記述し、受け入れ基準を定義（発散思考で網羅的に）

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| ストーリー数 | Phase 1計画のドラフト一覧と一致すること |
| Who/What/Why | 全ストーリーに3要素が明記されていること |
| 受け入れ基準 | 各ストーリーに最低2つ以上の検証可能な基準があること |
| 受け入れ基準の形式 | 「〜できる」「〜が表示される」等の検証可能な形式であること |
| 用語の一貫性 | ユビキタス言語集がある場合、全ストーリーで準拠していること |
| 非機能要件 | パフォーマンス・セキュリティ・アクセシビリティに関連するストーリーが検討されていること |

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 成果物 | `docs/product/user_stories.md` |

---

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（model-routing.md の Architect ロール）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. `docs/principles/model-routing.md` の「レビュー観点」節に沿って検証する
3. **スキル固有レビュー観点**を検証する
4. 判定結果を出力する

### スキル固有レビュー観点（BLOCK基準）
- [ ] 全ストーリーにWho/What/Whyが明記されているか
- [ ] 受け入れ基準が検証可能な形式か（曖昧な表現がないか）
- [ ] Phase 1計画のストーリー一覧と過不足がないか
- [ ] 技術実装の詳細に踏み込んでいないか
- [ ] ユビキタス言語との整合性が取れているか

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- ユビキタス言語集がある場合、ストーリー内の用語はそれに準拠する
- 受け入れ基準は「〜できる」「〜が表示される」等の検証可能な形式にする
- 技術的な実装詳細には踏み込まない
- **MVP/Post-MVPの分類・優先順位付けはこのスキルでは行わない** → S1.5 `story-mapper` で収束思考として実行する

### ストーリーID採番規約

このスキルはユーザーストーリーの**発番元**である。以下の規約に従って ID を採番する。

- **形式**: ストーリーIDは `HXX-XX`（例: `H03-01`）。前半 `HXX` が Epic 番号、後半 `-XX` がその Epic 内の連番。基盤系 Epic には `HFxx-XX`（例: `HF1-02`）も許容される。
- **一意性**: ストーリーID は `docs/product/user_stories.md` 全体で一意。同一 ID を複数ストーリーに割り当てない。
- **正の在り処**: 全ストーリーID の正本は `docs/product/user_stories.md`（StoryCatalog）。下流の設計文書・テストが参照する `@story-id HXX-XX` / `@story HXX-XX` は、必ずこのカタログに存在する ID であること。受け入れ基準ID は `HXX-XX-N`（絶対形）または対象ストーリー内の相対形 `AC-N`。
- **WI-XXX との区別（軸が異なる）**: `WI-XXX`（Work Item）は開発タスクの識別子であり、**ストーリーID とは別の軸**。ストーリー（何を作るか＝要求単位）と Work Item（いつ・どの作業で実装するか＝タスク単位）は 1:1 とは限らない。ストーリーID に `US-XXX` や `WI-XXX` を使わないこと（`US-XXX` は旧規約のレガシー別名で、StoryCatalog では `HXX-XX` へマップされる過去互換用途に限られる）。
