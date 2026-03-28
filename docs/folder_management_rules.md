# docs ディレクトリ管理ガイド

本ドキュメントは`docs/`配下のドキュメント管理方針を定義します。

---

## ディレクトリ構造

```
docs/
├── ADR/                    # Architecture Decision Records
├── basic_input/            # 入力サンプル・テンプレート
├── principles/             # 開発原則・ルール
├── inception/              # 計画ドキュメント + 作業単位（US・issue）の設計
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
**計画ドキュメント**と**作業単位（US・issue）の設計**を格納する。inception 配下のドキュメントは一時的な作業用であり、設計成果物は `product/` に反映される。

```
inception/
├── _shared/                # 横断的な計画（複数Unitにまたがるもの）
├── _operation/             # 運用・デプロイ関連の計画
├── issues/                 # 横断的なissue（複数Unitにまたがるもの）
│   └── {ISSUE-XXX}/
│       ├── issue_description.md  # 問題の記述
│       ├── logical_design.md     # 論理設計
│       └── ...
├── {Unit名}/               # Unit毎の階層
│   ├── *_plan.md           # Unit全体の計画
│   ├── {US-XXX}/           # ストーリー単位の計画・設計
│   │   ├── *_plan.md       # 実装計画
│   │   ├── uiux_design.md  # UI/UX設計
│   │   └── ...             # その他ストーリー固有のドキュメント
│   └── issues/             # Unit固有のissue（バグ・不整合）
│       └── {ISSUE-XXX}/
│           ├── issue_description.md  # 問題の記述
│           ├── logical_design.md     # 論理設計
│           └── tdd_implementation_plan.md
```

### product/
**確定した設計ドキュメント**を格納する。作業単位（US-XXX / ISSUE-XXX）のドキュメントは含まない。

> **設計思想（product docs ハブモデル）**:
>
> `product/` はUnit単位で確定済みの仕様を集約する **ハブ** である。
>
> ```
> inception/{unit}/{作業単位}/   一時設計（US・issue ごと）
>         ↓ 設計成果物の反映（累積更新）
> product/construction/{unit}/   正式設計（常に最新、Unitの真実のソース）
>         ↕ フェーズゲート
> scripts/harness/{unit}/*.ts    実装ファイル
> ```
>
> - **inception → product**: US・issue の設計成果が確定したら product docs を累積更新する
> - **product → source**: ソースファイルのフェーズゲートは product docs（Unit単位）の存在で判定する
> - **ソースファイルと US/issue は直接紐付けない**: PJ のライフサイクルが進むほどにバグ修正や US 追加で一つのソースファイルに紐づくドキュメント数が増大し、依存関係が複雑になるため。product docs が常に最新に保たれることで、inception の一時ドキュメントと実装が間接的に紐づく
> - **US/issue 単位で正として管理しない**: 整合性維持のコストが非常に大きくなるため、作業単位の設計は inception にアーカイブ的に保持し、確定した仕様のみを product に集約する

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

### 1. productには作業単位（US・issue）の設計を入れない

```
# NG: product配下にUS-XXX/ISSUE-XXXディレクトリを作成
product/construction/withholding_tax/US-217/
product/construction/withholding_tax/issues/ISSUE-001/

# OK: inception配下に作成
inception/withholding_tax/US-217/
inception/withholding_tax/issues/ISSUE-001/
```

### 2. 仕様変更時は既存のproductドキュメントを更新する

US 実装や issue 修正で仕様が確定したら、`product/`配下の既存ドキュメント（domain_model.md等）を累積更新する。新規ファイルを作成するのではなく、既存ファイルに変更を追記する。product docs は常に最新の状態を維持する「生きたドキュメント」である。

### 3. ストーリー・issue単位の計画・設計は必ずinception配下に作成する

```
# 新しいストーリーUS-999の計画を作成する場合
inception/{該当Unit}/US-999/
├── logical_design_plan.md
├── scenario_test_plan.md
├── scenario_test_design.md
├── scenario_test_logic.md
├── uiux_design_plan.md
└── tdd_implementation_plan.md

# Unit固有のissue（バグ・不整合）を起票する場合
inception/{該当Unit}/issues/ISSUE-999/
├── issue_description.md
├── logical_design.md
└── tdd_implementation_plan.md

# 横断的なissue（複数Unitにまたがる）を起票する場合
inception/issues/ISSUE-999/
├── issue_description.md
└── logical_design.md
```

---

## ドキュメント作成フロー

AIDLCプロセスは **US（新機能）** と **issue（バグ・不整合）** の2つの起点を持つ。いずれも inception で計画を立て、product docs を更新し、実装に反映する流れは共通である。

### US と issue の違い

| 起点 | フロー | inception 配置先 |
|------|--------|-----------------|
| **US（新機能）** | Phase 1 → Phase 2 → Phase 3 の全フローを上位から順に実行 | `inception/{unit}/{US-XXX}/` |
| **issue（バグ・不整合）** | 原因フェーズを特定し、そのフェーズから下位に向けてドキュメント・実装をアップデート | `inception/{unit}/issues/{ISSUE-XXX}/` |

#### issue の処理フロー

1. **issue 起票**: `inception/{unit}/issues/{ISSUE-XXX}/issue_description.md` に問題の記述・原因分析を記載
2. **原因フェーズの特定**: バグや仕様の認識違いがどのフェーズに起因するかを判定
   - ドメイン設計に起因 → domain_model から下位に向けてリファクタ
   - 論理設計に起因 → logical_design から下位に向けてリファクタ
   - テスト設計に起因 → test_design から下位に向けてリファクタ
   - 実装のみに起因 → 実装の修正のみ
3. **inception で計画**: 特定したフェーズから下位のフェーズに向けて、inception 配下に計画・設計文書を作成
4. **product docs 更新**: 設計成果物を `product/construction/{unit}/` の該当ドキュメントに累積更新
5. **TDD 実装**: テスト設計→実装の順序で修正を適用

> **issue が既存仕様に存在しない追加機能であった場合**: issue ではなく **US を新規作成** し、unit へのマッピングからドメイン設計→TDD 実装まで、下記の Phase 1〜3 の全フローに沿って実施する。

---

### US のドキュメント作成フロー

US は3つのフェーズで構成される。各フェーズでドキュメントの配置先が異なる。

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

### Phase 3: ストーリー実装（US単位）/ issue 修正

個別ストーリーの設計・テスト・実装。計画・成果物は`inception/{unit}/{US-XXX}/`に配置。
issue の場合は `inception/{unit}/issues/{ISSUE-XXX}/` に配置し、原因フェーズから下位に向けて同様のドキュメントを作成する。

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
| issue記述 | `issue_description.md` | - |
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
