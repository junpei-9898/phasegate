---
name: logical-designer
description: ドメインモデルから論理設計を作成。横断設計とストーリー固有設計の2モード（AIDLC Step 2.2）
model: opus
languages: [typescript]
---

# Logical Designer

ドメインモデルをソースコード実装可能な論理設計に変換するスキル。AIDLCプロセスのStep 2.2に対応。

## 2つのモード

### 横断モード（Unit全体の設計）
Unit単位でアーキテクチャの各層（DB → ドメイン → ユースケース → コントローラ → BFF → フロントエンド）の設計を行う。

### ストーリー固有モード（個別ストーリーの設計）
特定のストーリーを実装するために必要な論理設計を、横断設計に基づいて詳細化する。

## 前提条件チェック

## Pre-flight check (BLOCKING)

Before generating any plan, verify `docs/inception/{unit}/WI-XXX/description.md` exists.
If not, halt and ask the user to create the WI first, or offer to run `phasegate scaffold-wi <unit|_cross> <story|issue|fix|refactor|chore>`.

### 必須インプット（存在しなければ`[Question]`で提供を要求）

- **横断モード:**
  - ドメインモデル（`docs/product/construction/{unit}/domain_model.md`）
  - 統合契約（`docs/product/units/integration_contract.md`）

- **ストーリー固有モード:**
  - 横断論理設計（`docs/product/construction/{unit}/logical_design.md`）
  - 対象ストーリーの定義（ストーリーID・受け入れ基準）

### 任意インプット（あれば参照）
- アーキテクチャルール文書（層の依存方向、設計原則等）
- テスト規約文書
- 環境設計（`docs/product/environment_contract.md`）
- 既存の論理設計（フォーマット準拠・差分のみ設計）

---

## ⚠️ 上位レイヤー存在チェック

**このスキルは AIDLC Step 2.2「論理設計」に対応します。実行前に上位設計の存在を確認してください。**

### 依存する上位設計文書

#### 横断モードの場合
| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/domain_model.md` | ✅ 必須 | 対象Unitのドメインモデル存在を確認 |
| `docs/product/units/integration_contract.md` | ✅ 必須 | ファイルの存在を確認 |

#### ストーリー固有モードの場合
| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/logical_design.md` | ✅ 必須 | 横断論理設計の存在を確認 |
| `docs/product/units/{unit}.md` | ✅ 必須 | 対象ストーリーの定義を確認 |

### 上位設計が存在しない場合のアクション

上位設計文書が存在しない場合、**設計を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 以下の選択肢を提示
   - 上位設計（domain-designer）を先に実行する
   - 上位設計をスキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断で設計を開始しない

**報告テンプレート:**
```markdown
## ⚠️ 上位レイヤー設計が見つかりません

以下の設計文書が存在しないため、論理設計を開始できません：
- `docs/product/construction/{unit}/domain_model.md` ❌ 未作成

### 推奨アクション
`domain-designer` スキルを使用してドメインモデルを作成してください。

### 選択肢
1. **domain-designerを先に実行する**（推奨）
2. **このまま進める**（上位設計なしで進める場合、整合性リスクあり）

どちらを選択しますか？
```

---

## ⚠️ 2フェーズ実行ルール

**このスキルは必ず2フェーズに分けて実行する。Phase 1で計画を作成し、人間の承認を得てからPhase 2で成果物を作成する。Phase 1とPhase 2を同時に実行してはならない。**

---

## Phase 1: 計画（plan）

### 目的
設計方針・スコープ・不明点を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/WI-XXX/logical_design_plan.md`

### 計画ファイルの構成

```markdown
# 論理設計計画: {Unit名 or ストーリーID}

## 1. スコープ
- 対象Unit / ストーリー
- 設計対象の層（DB / Domain / UseCase / Controller / BFF / Frontend）

## 2. 設計方針
- アーキテクチャ層の定義とその根拠
- 技術スタックの前提

## 3. 設計内容サマリー（各層の設計概要を箇条書き）
- DB層: ...
- Domain層: ...
- UseCase層: ...
- ...

## 4. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
{質問の詳細と背景}
**推奨案:** {AIの推奨案}

[Answer]
（人間が回答を記入）

### [Question] Q2: ...
...

## 5. 前提条件・リスク
- ...
```

### Phase 1 完了条件
- 計画ファイルを出力した
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した（「計画をレビューしてください」と伝えた）**
- **成果物（論理設計本体）はまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー（横断モード）

1. **アーキテクチャ層の定義** — 技術スタックに基づき各層の責務を定義
2. **DB層設計** — テーブル定義、インデックス、マイグレーション計画、ビュー
3. **ドメイン層設計** — モジュール構成、リポジトリIF、ドメインサービス
4. **アプリケーション層設計** — ユースケース一覧、処理フロー、入出力DTO
5. **コントローラ/API層設計** — エンドポイント、スキーマ、バリデーション
6. **BFF層設計**（フロントエンドがある場合） — Server Actions、データ変換
7. **フロントエンド層設計**（フロントエンドがある場合） — コンポーネント、画面遷移、状態管理
8. **テスト設計** — テスト対象×テストレイヤーの対応表、テストダブル方針
9. **品質評価（engineering-perspective）** — 設計完了後、以下の観点で自己評価し、問題があれば修正してから成果物を確定する
   - **SOLID/Clean Architecture**: 依存が内向きか、各層がSRPに従っているか、DIPが守られているか
   - **コードスメル**: Feature Envy・Shotgun Surgery等の設計レベルスメルがないか
   - **ドメイン表現**: 論理設計がドメインモデルの意図を正しく反映しているか（言語の一致）

### ワークフロー（ストーリー固有モード）

1. **スコープ確認** — 受け入れ基準を確認、横断設計の変更箇所を特定
2. **各層の詳細設計** — 関係する層のみ詳細化、シーケンス図で連携フロー記述
3. **マイグレーション・環境影響** — 新規テーブル/カラム/サービスの必要性、環境設計への影響を明記
4. **品質評価（engineering-perspective）** — 横断モードと同様の観点で自己評価し、問題があれば修正してから成果物を確定する

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 横断成果物 | `docs/product/construction/{unit}/logical_design.md` |
| ストーリー固有成果物 | `docs/inception/{unit}/WI-XXX/logical_design.md` |

> **注意**: ストーリー固有の設計は `docs/inception/` に配置する（`docs/folder_management_rules.md` のルール準拠）。`docs/product/construction/` にはUnit全体の共有設計のみを配置する。

---

## 🔗 成果物のトレーサビリティメタデータ（必須）

Phase 2 で生成する設計文書には、以下 2 種類のメタデータを emit する。`MetadataValidator.validateDesignDocument` が検証対象とし、ISSUE-008 Phase B-2/B-3 完了後は `npx phasegate validate-metadata` / pre-commit で自動チェックされる。

### 1. YAML frontmatter（新規作成時）

文書先頭に以下を付与する。既存文書の改訂時は省略してよい。

```yaml
---
traceability:
  initial_creation: true
---
```

`initial_creation: true` は「新規作成であり、後述の `@work-item-id` 注釈が必須」であることを示す。

### 2. `@work-item-id` インライン注釈

WI に紐づく設計要素の直前に `@work-item-id WI-XXX` を独立行で記述する。

```markdown
@work-item-id WI-001
### ユースケース: 注文を確定する
```

形式ルール:
- **独立行** — 他のテキストと混在させない
- **直後に設計要素** — 空行を挟まない
- **WorkItem 存在** — `WI-XXX` は `docs/inception/{unit}/WI-XXX/description.md` に存在する ID
- **複数WI時** — 注釈行を連続で並べ、最後の直後に設計要素を置く

---

## 注意事項

- **コードスニペットは生成しない**（設計文書のみ）
- 層間の依存方向を厳守する（Domain → Port → UseCase → Controller）
- テスト設計は設計文書の一部として含める
