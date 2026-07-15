---
name: unit-designer
description: ストーリーを独立構築可能なUnitにグルーピングし統合契約を定義（AIDLC Step 1.2）
model: sonnet
review: opus
languages: [typescript]
---

# Unit Designer

ユーザーストーリーを独立構築可能なUnit（境界づけられたコンテキスト）にグループ化し、統合契約を定義するスキル。AIDLCプロセスのStep 1.2に対応。

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **ユーザーストーリー一覧** — `docs/product/user_stories.md` またはストーリーが記載された文書

### 任意インプット（あれば参照）
- **ユーザーストーリーマッピング（推奨）** — `docs/product/user_story_mapping.md`（S1.5 story-mapper の成果物）。MVP/Post-MVP のスコープ整理と優先順位を提供する。存在すれば Unit グルーピングと構築優先度の判断材料として取り込む
- **既存の統合契約** — フォーマットに準拠する
- **技術スタック概要** — 各層の技術選定（Gateway、API Server、DB等）
- **プロダクト概要** — コアドメインの理解

---

## ⚠️ 上位レイヤー存在チェック

**このスキルは AIDLC Step 1.2「Unitの設計」に対応します。実行前に上位設計の存在を確認してください。**

### 依存する上位設計文書

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/user_stories.md` | ✅ 必須 | ファイルの存在を確認 |
| `docs/product/user_story_mapping.md` | 任意（推奨） | 存在すれば読み込み、MVP スコープを Unit グルーピングに反映する。無ければスキップしてよい |

### 上位設計が存在しない場合のアクション

上位設計文書が存在しない場合、**設計を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 以下の選択肢を提示
   - 上位設計（story-writer）を先に実行する
   - 上位設計をスキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断で設計を開始しない

**報告テンプレート:**
```markdown
## ⚠️ 上位レイヤー設計が見つかりません

以下の設計文書が存在しないため、Unit設計を開始できません：
- `docs/product/user_stories.md` ❌ 未作成

### 推奨アクション
`story-writer` スキルを使用してユーザーストーリーを作成してください。

### 選択肢
1. **story-writerを先に実行する**（推奨）
2. **このまま進める**（上位設計なしで進める場合、整合性リスクあり）

どちらを選択しますか？
```

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
Unit分割の方針・グルーピングの根拠・不明点を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/_shared/unit_design_plan.md`

> **パス注記**: 本スキルが扱う設計文書パス（`docs/inception/...` / `docs/product/units/...`）は既定値であり、consumer が `phasegate.config.json` の `paths` 設定で上書きしている場合はそちらが優先される。

### 計画ファイルの構成

```markdown
# Unit設計計画

## 1. スコープ
- 対象ストーリー数
- 分析対象の業務領域

## 2. グルーピング方針
- 凝集性の基準
- Unit分割の判断根拠

## 3. Unit一覧（ドラフト）
| Unit名 | 担当ストーリーID | 責務概要 |
|--------|----------------|---------|

## 4. Unit間依存関係（ドラフト）
- 依存関係図（概要レベル）

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
- **成果物（Unit定義・統合契約）はまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **Unit定義の作成** — 各Unitの概要・担当ストーリー・機能要件・データモデル概要・外部依存を定義。`user_story_mapping.md` があれば、その MVP スコープと優先順位を Unit グルーピング・構築順序の判断材料として反映する
2. **統合契約の作成** — 技術スタック概要、依存関係図、公開APIエンドポイント、共通データフォーマット、認証認可を定義
3. **マッピング検証** — 全ストーリーがいずれかのUnitに所属していることを確認

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| Unit数 | Phase 1計画のドラフト一覧と一致すること |
| ストーリーマッピング | 全ストーリーがいずれかのUnitに所属していること（漏れゼロ） |
| Unit定義の構成 | 各Unitに概要・担当ストーリー・機能要件・データモデル概要・外部依存が記載されていること |
| 統合契約 | 技術スタック概要、依存関係図、公開APIエンドポイント、共通データフォーマットが定義されていること |
| 凝集性の根拠 | 各Unitのグルーピング根拠（なぜこのストーリー群が同一Unitか）が記載されていること |
| 依存関係図 | Mermaid形式でUnit間依存関係が可視化されていること |

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 成果物 | `docs/product/units/{unit_name}.md` |
| 成果物 | `docs/product/units/integration_contract.md` |

---

## 🔗 成果物のトレーサビリティメタデータ（必須）

Phase 2 で生成する Unit 定義文書には、以下 2 種類のメタデータを emit する。これらのメタデータは `npx phasegate validate-metadata` / pre-commit で自動チェックされる。

### 1. YAML frontmatter（新規作成時）

`docs/product/units/{unit_name}.md` の先頭に以下を付与する。既存 Unit 定義の改訂時は省略してよい。`integration_contract.md` は Unit 横断のため任意。

```yaml
---
traceability:
  initial_creation: true
---
```

`initial_creation: true` は「新規作成であり、後述の `@story-id` 注釈が必須」であることを示す。

### 2. `@story-id` インライン注釈

ユーザーストーリーに紐づく機能要件・エンドポイント定義の直前に `@story-id HXX-XX` を独立行で記述する。

```markdown
@story-id H03-02
### 機能要件: 注文確定
```

形式ルール:
- **独立行** — 他のテキストと混在させない
- **直後に設計要素** — 空行を挟まない
- **StoryCatalog 存在** — `HXX-XX` は `docs/product/user_stories.md` に存在する ID
- **複数ストーリー時** — 注釈行を連続で並べ、最後の直後に設計要素を置く

### 3. Phase 3 レビューでの BLOCK 確認

Phase 3 レビューで以下を BLOCK 基準として確認する:
- 新規作成文書に `initial_creation: true` frontmatter が付与されているか
- 担当ストーリーに対応する機能要件の直前に `@story-id` が配置されているか
- 上記形式ルールに準拠しているか

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
- [ ] 全ストーリーがいずれかのUnitに割り当てられているか（漏れがないか）
- [ ] Unit間の依存方向が循環していないか
- [ ] 統合契約のAPIエンドポイントがUnit定義の機能要件と整合しているか
- [ ] 各Unitの責務が単一責任原則に沿っているか（過度に広くないか）
- [ ] Shared Kernelの定義が明確か（複数Unitが共有する概念がある場合）

### engineering-perspective レビュー観点（WARN基準）
- [ ] 各UnitがBounded Contextとして明確な境界を持っているか（Evans: 境界づけられたコンテキスト）
- [ ] Unit境界がドメインスメル（責務混在・境界不明確）を含んでいないか
- [ ] Unit間の依存がDIPに従っているか（具象ではなく抽象に依存）

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了
