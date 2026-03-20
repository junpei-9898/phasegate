# docs ディレクトリ管理ガイド

本ドキュメントは`docs/`配下のドキュメント管理方針を定義します。

---

## ディレクトリ構造

```
docs/
├── ADR/                    # Architecture Decision Records
├── basic_input/            # 入力サンプル・テンプレート
├── principles/             # 開発原則・ルール
├── inception/              # 計画ドキュメント + ストーリー単位の設計
└── product/                # 共有設計ドキュメント（確定版）
```

---

## 各ディレクトリの役割

### ADR/
アーキテクチャ決定記録。技術選定や設計方針の決定理由を記録する。

### basic_input/
入力データのサンプルやテンプレートを格納する。

### principles/
開発原則、テストルール、アーキテクチャ哲学など、プロジェクト全体で遵守すべきルールを定義する。

### inception/
**計画ドキュメント**と**ストーリー単位の設計**を格納する。

```
inception/
├── _shared/                # 横断的な計画（複数Unitにまたがるもの）
├── _operation/             # 運用・デプロイ関連の計画
├── {Unit名}/               # Unit毎の階層
│   ├── *_plan.md           # Unit全体の計画
│   └── {US-XXX}/           # ストーリー単位の計画・設計
│       ├── *_plan.md       # 実装計画
│       ├── uiux_design.md  # UI/UX設計
│       └── ...             # その他ストーリー固有のドキュメント
```

### product/
**確定した設計ドキュメント**を格納する。ストーリー単位（US-XXX）のドキュメントは含まない。

> **設計思想**: `product/`にはUnit単位で確定済みの仕様を集約し、形式知として管理する。
> US単位で正として管理すると整合性維持のコストが非常に大きくなるため、
> ストーリー固有の設計は`inception/`にアーカイブ的に保持し、確定した仕様のみを`product/`に集約する。
> これにより認知負荷を下げつつ、全体の整合性を保つ。

```
product/
├── product_overview.md         # プロダクト概要
├── user_stories.md             # ユーザーストーリー一覧
├── user_story_mapping.md       # ストーリーマッピング
├── construction/               # Unit毎の設計（確定版・累積更新）
│   └── {Unit名}/
│       ├── domain_model.md     # ドメインモデル
│       ├── logical_design.md   # 論理設計
│       ├── uiux_design.md      # UI/UX設計（Unit全体で1ファイル）
│       ├── unit_test_design.md  # ユニットテストケース設計
│       ├── it_test_design.md    # ITテストケース設計
│       ├── unit_test_logic.md   # ユニットテストロジック設計
│       ├── it_test_logic.md     # ITテストロジック設計
│       └── coverage_report.md   # テストカバレッジレポート
└── units/                      # Unit設計ドキュメント
    ├── {unit_name}_unit.md     # Unit定義
    └── integration_contract.md # 統合契約
```

> **`construction/{Unit名}/` のドキュメントは累積更新される「生きたドキュメント」です。**
> ストーリー実装のたびに、新しい仕様を既存ファイルに追記・更新します。

---

## 重要なルール

### 1. productにはストーリー単位の設計を入れない

```
# NG: product配下にUS-XXXディレクトリを作成
product/construction/withholding_tax/US-217/

# OK: inception配下に作成
inception/withholding_tax/US-217/
```

### 2. 仕様変更時は既存のproductドキュメントを更新する

ストーリー実装で仕様が確定したら、`product/`配下の既存ドキュメント（domain_model.md等）を更新する。
新規ファイルを作成するのではなく、既存ファイルに変更を追記する。

### 3. ストーリー単位の計画・設計は必ずinception配下に作成する

```
# 新しいストーリーUS-999の計画を作成する場合
inception/{該当Unit}/US-999/
├── logical_design_plan.md
├── scenario_test_plan.md
├── scenario_test_design.md
├── scenario_test_logic.md
├── uiux_design_plan.md
└── tdd_implementation_plan.md
```

---

## ドキュメント作成フロー

AIDLCプロセスは3つのフェーズで構成される。各フェーズでドキュメントの配置先が異なる。

### Phase 1: プロダクト全体設計（横断的・初回）

プロダクトの全体像を定義し、ストーリー・Unitの構造を確立する。

| Step | スキル | 計画（inception） | 成果物（product） |
|------|--------|-------------------|-------------------|
| Step 0 | product-architect | `_shared/product_overview_plan.md` | `product_overview.md` |
| Step 1.1 | story-writer | `_shared/story_writer_plan.md` | `user_stories.md` |
| Step 1.5 | story-mapper | `_shared/story_mapping_plan.md` | `user_story_mapping.md` |
| Step 2 | unit-designer | `_shared/unit_design_plan.md` | `units/{unit_name}.md` + `units/integration_contract.md` |

### Phase 2: Unit横断設計（Unit単位）

各Unitの設計を確定させる。成果物は`product/construction/{unit}/`に配置される累積更新ドキュメント。

| Step | スキル | 計画（inception/{unit}/） | 成果物（product/construction/{unit}/） |
|------|--------|--------------------------|----------------------------------------|
| Step 3 | domain-designer | `domain_model_plan.md` | `domain_model.md` |
| Step 4 | logical-designer（横断） | `logical_design_plan.md` | `logical_design.md` |
| Step 5 | scenario-test-designer | → Phase 3で実行 | - |
| Step 5 | it-test-designer | `it_test_design_plan.md` | `it_test_design.md` |
| Step 5 | unit-test-designer | `unit_test_design_plan.md` | `unit_test_design.md` |
| - | test-coverage-checker | `test_coverage_plan.md` | `coverage_report.md` |
| Step 6 | unit-test-logic-designer | `unit_test_logic_plan.md` | `unit_test_logic.md` |
| Step 6 | it-test-logic-designer | `it_test_logic_plan.md` | `it_test_logic.md` |

### Phase 3: ストーリー実装（US単位）

個別ストーリーの設計・テスト・実装。計画・成果物は`inception/{unit}/{US-XXX}/`に配置。

| Step | スキル | 計画（inception/{unit}/{US-XXX}/） | 成果物配置先 |
|------|--------|-----------------------------------|-------------|
| Step 4 | logical-designer（固有） | `logical_design_plan.md` | `logical_design.md`（同ディレクトリ） |
| Step 5 | scenario-test-designer | `scenario_test_plan.md` | `scenario_test_design.md`（同ディレクトリ） |
| Step 6 | scenario-test-logic-designer | `scenario_test_logic_plan.md` | `scenario_test_logic.md`（同ディレクトリ） |
| Step 7 | uiux-designer | `uiux_design_plan.md` | `product/construction/{unit}/uiux_design.md`（※累積更新） |
| Step 8 | story-implementor | `tdd_implementation_plan.md` | コード（TDD実装） |
| 実装完了後 | - | - | `product/construction/{unit}/` の各ドキュメントを更新 |

> **uiux_design.mdについて**: 計画はストーリー単位（`inception/{unit}/{US-XXX}/`）に作成するが、
> 成果物は`product/construction/{unit}/uiux_design.md`にUnit全体で1ファイルとして累積更新する。
> これはUI/UXの全体一貫性を保つためで、他のproduct/construction配下のドキュメントと同じルールに従う。

### 横断的な計画

複数Unitにまたがる計画は `inception/_shared/` に作成する。

### 運用関連

デプロイ、IaC、運用手順は `inception/_operation/` に作成する。

---

## ファイル命名規則

| 種別 | 命名パターン | 例 |
|-----|------------|---|
| 計画 | `*_plan.md` | `domain_model_plan.md` |
| ドメインモデル | `domain_model.md` | - |
| 論理設計 | `logical_design.md` | - |
| UI/UX設計 | `uiux_design.md` | - |
| シナリオテスト設計 | `scenario_test_design.md` | - |
| ITテスト設計 | `it_test_design.md` | - |
| ユニットテスト設計 | `unit_test_design.md` | - |
| テストロジック設計 | `*_test_logic.md` | `unit_test_logic.md` |
| カバレッジレポート | `coverage_report.md` | - |
| Unit定義 | `{unit_name}_unit.md` | `withholding_tax_unit.md` |
| 統合契約 | `integration_contract.md` | - |

---

## 関連ドキュメント
- [アーキテクチャ哲学](./principles/architecture-philosophy.md)
- [テストルール](./principles/testing-rules.md)
