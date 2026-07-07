---
name: uiux-designer
description: テストケース・論理設計・既存UIを加味して最終的なUI/UX定義を策定（AIDLC Step 7）
model: opus
languages: [typescript]
---

# UIUX Designer

テストケース、論理設計、既存UI/UXを加味して最終的なUI/UX定義を策定するスキル。AIDLCプロセスのStep 7「UIUX設計」に対応。

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **シナリオテスト設計** — `docs/inception/{unit}/{story_id}/scenario_test_design.md`
- **論理設計** — `docs/product/construction/{unit}/logical_design.md` または ストーリー固有論理設計

### 任意インプット（あれば参照）
- **UIモック** — プロジェクトルート相対の `mock/` ディレクトリ配下の `*.html`（mock-designer の出力先。初期デザイン意図の参考）
- **既存UI実装** — 関連する既存画面コンポーネント
- **既存UIUX設計** — `docs/product/construction/{unit}/uiux_design.md`（更新時に参照）
- **デザインシステム** — 色・フォント・コンポーネント規約
- **プロダクト概要** — ユビキタス言語

---

## ⚠️ 上位レイヤー存在チェック

**このスキルは AIDLC Step 7「UIUX設計」に対応します。実行前に上位設計の存在を確認してください。**

### 依存する上位設計文書

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/inception/{unit}/{story_id}/scenario_test_design.md` | ✅ 必須 | シナリオテスト設計の存在を確認 |
| `docs/product/construction/{unit}/logical_design.md` | ✅ 必須 | 論理設計の存在を確認 |
| `mock/*.html`（プロジェクトルート相対、mock-designer の出力先） | 📋 推奨 | 初期モックの存在を確認 |

> **パス注記**: 上表の設計文書パス（`docs/inception/...` / `docs/product/construction/...`）は既定値であり、consumer が `phasegate.config.json` の `paths` 設定で上書きしている場合はそちらが優先される。

### 上位設計が存在しない場合のアクション

上位設計文書が存在しない場合、**UIUX設計を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 以下の選択肢を提示
   - 上位設計（scenario-test-designer, logical-designer）を先に実行する
   - 上位設計をスキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断でUIUX設計を開始しない

**報告テンプレート:**
```markdown
## ⚠️ 上位レイヤー設計が見つかりません

以下の設計文書が存在しないため、UIUX設計を開始できません：
- `docs/inception/{unit}/{story_id}/scenario_test_design.md` ❌ 未作成
- `docs/product/construction/{unit}/logical_design.md` ❌ 未作成

### 推奨アクション
1. `logical-designer` で論理設計を作成
2. `scenario-test-designer` でシナリオテスト設計を作成

### 選択肢
1. **上位設計を先に実行する**（推奨）
2. **このまま進める**（上位設計なしで進める場合、整合性リスクあり）

どちらを選択しますか？
```

---

## ⚠️ 2フェーズ実行ルール

**このスキルは必ず2フェーズに分けて実行する。Phase 1で計画を作成し、人間の承認を得てからPhase 2でUIUX設計を作成/更新する。Phase 1とPhase 2を同時に実行してはならない。**

---

## 出力ファイルの配置ルール

### 計画ファイル（一時的）
- **配置先**: `docs/inception/{unit}/{story_id}/uiux_design_plan.md`
- **目的**: 設計方針の承認を得るための一時文書
- **ライフサイクル**: Phase 1で作成、Phase 2完了後は参照用として残す

### 設計成果物（永続的）
- **配置先**: `docs/product/construction/{unit}/uiux_design.md`
- **目的**: Unit横断的なUIUX設計の普遍的な定義
- **ライフサイクル**: 初回作成後、仕様変更のたびに**更新**していく
- **注意**: ストーリー固有のファイルではなく、Unit全体で1つのファイルを継続的に更新

---

## Phase 1: 計画（plan）

### 目的
UIUX設計のスコープ・画面構成方針・不明点を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/{story_id}/uiux_design_plan.md`

### 計画ファイルの構成

```markdown
# UIUX設計計画: {ストーリーID}

## 1. スコープ
- 対象ストーリーと受け入れ基準
- 設計対象の画面・コンポーネント

## 2. 既存UI分析
- 関連する既存画面の一覧
- 流用可能なコンポーネント

## 3. 設計方針
- レイアウトパターン
- インタラクション方針
- 一貫性確保のポイント

## 4. 画面一覧（ドラフト）
| 画面名 | 新規/更新 | 主要機能 |
|--------|----------|---------|

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
- **UIUX設計文書はまだ作成/更新していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **既存UIUX設計の確認** — `docs/product/construction/{unit}/uiux_design.md` が存在するか確認
2. **画面構成定義** — 各画面のレイアウト・コンポーネント構成を定義
3. **コンポーネント設計** — 新規/更新コンポーネントの仕様を定義
4. **インタラクション定義** — ユーザー操作と状態変化を定義
5. **データバインディング** — 画面とAPIの接続ポイントを定義
6. **アクセシビリティ考慮** — a11y要件を列挙

### 出力ファイル

| 種別 | 配置先 | 操作 |
|------|--------|------|
| 成果物 | `docs/product/construction/{unit}/uiux_design.md` | 新規作成 or 更新 |

### 新規作成 vs 更新の判断

| 条件 | 操作 |
|------|------|
| `uiux_design.md` が存在しない | 新規作成 |
| `uiux_design.md` が存在する | 既存内容を読み込み、新しい画面/コンポーネントを**追記**または既存セクションを**更新** |

### 更新時の注意事項

- **既存の画面設計を削除しない**（明示的に削除指示がない限り）
- **変更履歴セクションに更新内容を追記**
- **既存コンポーネントとの整合性を確認**
- 新規画面は既存セクションの後に追加

---

### uiux_design.md の構成

> テンプレート全文: [`references/uiux-design-template.md`](references/uiux-design-template.md)

主要セクション:
1. 画面一覧
2. 画面設計（レイアウト・コンポーネント・データバインディング）
3. 共通コンポーネント仕様
4. 画面遷移
5. エラーハンドリング
6. アクセシビリティ
7. data-testid一覧（命名規約は下記参照）
8. 変更履歴

---

## data-testid 命名規約（正規リファレンス）

> **このスキルが data-testid 命名規約の Single Source of Truth です。**
> 詳細: [`references/data-testid-convention.md`](references/data-testid-convention.md)

### 命名パターン（概要）

| 要素タイプ | 命名パターン | 例 |
|----------|------------|---|
| ページコンテナ | `{page}-container` | `client-list-container` |
| テーブル行 | `{entity}-row-{id}` | `client-row-001` |
| ボタン | `{action}-{target}-button` | `submit-create-process-button` |
| 入力フィールド | `{field}-input` | `process-label-input` |
| ステータス表示 | `{entity}-{property}` | `process-status` |
| エラーメッセージ | `{field}-error` | `amount-error` |

### ロケーター優先順位

1. `data-testid` — 最優先（テスト専用属性）
2. `role` — セマンティックなロケーター
3. `text` — 表示テキスト
4. `css/xpath` — 最終手段（避ける）

---

## 注意事項

- **ファイル配置は `docs/folder_management_rules.md` に従うこと**
- **実装コードは生成しない**（設計文書のみ）— 実装は `story-implementor` スキル（codex-delegator経由、またはメインセッションで直接実行）が行う
- シナリオテスト設計のステップと整合性を保つ
- 既存UIとの一貫性を重視する
- モックとの差分がある場合は明記する
- CSS変数・デザイントークンの活用を前提とする
- **uiux_design.mdはUnit全体で1つのファイル**として継続的に更新する
