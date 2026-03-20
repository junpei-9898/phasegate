---
name: implementation-planner
description: "Unit仕様とドメインモデル設計を元に実装計画を立てる。ストーリーIDや機能名から関連Unitを特定し、API設計・レイヤー別実装方針を整理してmdファイルで出力する。使用タイミング: 実装計画を立てて、US-XXXの実装方針を決めて、この機能の設計を整理して、など実装前の計画策定時。"
model: sonnet
review: opus
---

# Implementation Planner

UnitドキュメントとConstructionのドメインモデル設計を元に、**設計フェーズの実装計画**を体系的に立案する。

## ⚠️ `story-implementor` との役割分担

| 観点 | `implementation-planner`（本スキル） | `story-implementor` |
|------|-------------------------------------|---------------------|
| **目的** | 設計段階で実装方針を整理・合意する | TDD実装を実行する |
| **タイミング** | 論理設計の前後（設計の方向性確認） | テスト設計・カバレッジ検証の後 |
| **出力** | 実装計画書（API設計・レイヤー別方針） | TDD実装計画 → 実装コード |
| **テスト設計** | 参照しない（設計フェーズのため） | 必須（テスト設計完了が前提） |

**使い分けの指針:**
- 「この機能どう実装する？」→ `implementation-planner`
- 「テスト設計も終わった、TDD実装を始めたい」→ `story-implementor`

## ⚠️ 3フェーズ実行ルール

**このスキルは3フェーズで実行する。**
- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: Sonnet 4.6 に委任して成果物を生成する（`scripts/delegate-sonnet.sh` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照。**

---

## ワークフロー

```
入力解析 → Unit特定 → ドメインモデル確認 → 既存実装確認 → 計画作成 → 出力
```

### Step 1: 入力解析

ユーザー入力から抽出:
- ストーリーID（US-XXX形式）
- 機能名・タスク説明
- 優先度・制約条件

### Step 2: Unit特定

1. `docs/product/units/integration_contract.md`を読み込み
2. 関連する公開APIエンドポイントを特定
3. 該当Unitの`{unit}.md`を確認
4. Unit間依存関係を整理

**検索方法:**
- Grep/Globツールを使用して `docs/product/units/` 配下からストーリーIDやキーワードを検索する
- `integration_contract.md` から関連する公開APIエンドポイントを特定する

### Step 3: ドメインモデル確認

1. `docs/product/construction/{context}/domain_model.md`を読み込み
2. 以下を把握:
   - 集約と不変条件
   - エンティティ・値オブジェクト
   - ドメインイベント
   - 状態遷移
3. 必要に応じて`shared_kernel/domain_model.md`を参照

### Step 4: 既存実装確認

- Glob/Readツールを使用してプロジェクトの実装ディレクトリ構造を確認する
- 既存の実装パターンを検索し、コードスタイル・ファイル配置を把握する

### Step 5: 計画作成

[references/plan-template.md](references/plan-template.md)のフォーマットに従って:
1. API設計（新規/既存拡張）
2. レイヤー別実装内容
3. 実装ステップ分解
4. 影響範囲特定

### Step 6: 出力

計画をmdファイルとして出力。パスの推奨:
```
docs/inception/{task_id}_plan.md
```

**[Question][Answer]セクション必須**: 不明点や確認事項をまとめ、ユーザーからのフィードバックを受け取れるようにする。

---

## 参照ドキュメント

| ファイル | 用途 |
|----------|------|
| `docs/product/units/integration_contract.md` | Unit間API定義・依存関係 |
| `docs/product/units/{unit}.md` | ユーザーストーリー・機能要件 |
| `docs/product/construction/{context}/domain_model.md` | ドメインモデル設計 |

**詳細は以下を参照:**
- [document-structure.md](references/document-structure.md): ドキュメント構造リファレンス
- [workflow.md](references/workflow.md): 詳細ワークフロー
- [plan-template.md](references/plan-template.md): 出力テンプレート

---

## Unit一覧（クイックリファレンス）

実行時に `docs/product/units/` 配下のUnit定義ファイルを動的に読み取ること。ハードコードしない。

---

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| Unit特定 | 対象ストーリー/機能に関連するUnitが正しく特定されていること |
| ドメインモデル参照 | 関連する集約・エンティティ・値オブジェクトが列挙されていること |
| API設計 | 新規/既存拡張のエンドポイントが具体的に定義されていること |
| レイヤー別実装内容 | 各層（Domain/UseCase/Controller/Infrastructure）の実装内容が記載されていること |
| 実装ステップ | 実装順序が具体的なステップに分解されていること |
| 影響範囲 | 変更が他Unit・他コンポーネントに与える影響が分析されていること |
| QAセクション | 不明点・確認事項が[Question][Answer]形式で記載されていること |

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（Opus 4.6）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. `docs/principles/model-routing.md` のレビュー観点 R1〜R7 に沿って検証する
3. **スキル固有レビュー観点**を検証する
4. 判定結果を出力する

### スキル固有レビュー観点（BLOCK基準）
- [ ] 対象Unit/ドメインモデルの特定が正確か
- [ ] API設計が統合契約と整合しているか
- [ ] レイヤー間の依存方向が正しいか（Domain → Port → UseCase → Controller）
- [ ] 実装ステップの順序が論理的か（依存関係に沿っているか）
- [ ] 影響範囲の分析が漏れなく行われているか

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## コードベース構成（クイックリファレンス）

実行時にプロジェクトのディレクトリ構造を動的に確認すること。ハードコードしない。
