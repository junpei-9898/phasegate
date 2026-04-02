# Unit定義: phase-dependency-model

> **Unit ID**: phase-dependency-model
> **作成日**: 2026-03-12
> **Wave**: 1（基盤構築）
> **対応Epic**: H-02 Phase Dependency Model

---

## 1. 概要

phase-dependency-modelは、Phasegateにおける設計フェーズ間の前提条件を機械的に強制するUnit。3層フェーズ構造（Level 1: Product全体設計 / Level 2: Unit横断設計 / Level 3: ストーリー実装）を定義し、phase-gateバリデータをレベル間依存検証に拡張することで、上位設計なしの下位設計・実装を物理的に拒否する。

v1で新規追加されたK14（Phase Dependency Model）およびK15（Plan文書の必須生成）に対応し、2つのPlanning Mode（interactive/embedded-qa）の定義、plan文書の必須生成検証、phasegate.config.jsonによるPhase Dependencyカスタマイズ機構を提供する。設計→設計および設計→実装の順序がコードレベルで強制されることにより、AIエージェントが上位設計を飛ばして実装に着手する行為を防止する。

---

## 2. 担当ストーリー / Issue

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H02-01 | 3層フェーズ構造定義 + phase-gateバリデ��タ拡張 | Must |
| H02-02 | Planning Mode（interactive/embedded-qa）+ plan文書��須生成 | Must |
| H02-03 | Phase Dependencyカスタマイズ | Should |

| Issue ID | タイトル | 優先度 |
|----------|---------|--------|
| ISSUE-001 | inception側フェーズゲート整備（Level 3成果物のコンテキスト依存チェック） | Must |

---

## 3. 機能要件

### 3.1 3層フェーズ構造定義 + phase-gateバリデータ拡張（H02-01）

- 3層フェーズ構造（Level 1/2/3）を定義し、各レベルのフェーズと成果物をドキュメント化する
  - **Level 1**: Product全体設計（product_overview, user_stories, unit定義, integration_contract等）
  - **Level 2**: Unit横断設計（domain_model, logical_design, test_design, environment_design等）
  - **Level 3**: ストーリー実装（plan文書, 実装コード, テスト, コミット）
    - Level 3成果物一覧: `inception/{unit}/{HXX-XX}/`配下の plan.md、`product/construction/{unit}/`配下の実装・テストファイル
- phase-gateバリデータがLevel間の依存違反を検出する（Level 2の前提なしにLevel 3開始を拒否）
- phase-gateバリデータがLevel内の上流設計なしの下流設計生成を拒否する
- phase-gateバリデータが設計文書・plan文書なしの実装コード変更を拒否する
- Level間依存の緩和が不可であることを検証するテストを用意する（カスタマイズによるLevel間依存削除を拒否）

### 3.2 Planning Mode + plan文書必須生成（H02-02）

- **interactiveモード**: AIが対話的にヒアリングし、その結果からplan文書を生成する方式を定義する
- **embedded-qaモード**: テンプレートのQAセクションに人間が回答し、AIが計画を完成させる方式を定義する
- 両モードとも最終成果物として3層構造に応じた`inception/`配下に`*_plan.md`を生成する
- phase-gateバリデータがplan文書のファイル存在でPhase 1完了を検証する（plan文書なしのPhase 2移行を拒否）
- plan文書にQAセクション（設計判断の根拠）が含まれることを検証するテストを用意する

### 3.4 inception内フェーズゲートの実効化（ISSUE-001）

- storyId が提供された場合、Level 3成果物（`required: false`）をコンテキスト依存で必須チェック対象とする
- `checkPhaseGate()` に `scope` パラメータを追加し、storyId 提供時に Level 3 ノードの解決済み成果物パスの存在を検証する
- 既存の依存グラフ（`3:logical-designer → 3:scenario-test-designer → ... → 3:story-implementor`）が実効的に機能し、inception 内の設計順序を物理的に強制する
- storyId 未指定時の既存動作（Level 3成果物をスキップ）は維持する
- `Artifact.required` フィールドの意味は変更しない（storyId 未指定時のスキップ用として維持）

### 3.3 Phase Dependencyカスタマイズ（H02-03）

- phasegate.config.jsonに`phaseDependencies`セクション（preset/override/customRules）を追加する
- デフォルトフローへの依存追加（強化）を`customRules`で設定可能にする
- デフォルトフローからの依存削除（緩和）には`override: true`の明示を必要とする
- `story-implementor`前のテスト設計フェーズ存在を緩和不可にする（TDD最低保証）
- Level間依存（Level 2→Level 1、Level 3→Level 2）を緩和不可にする

---

## 4. ドメインモデル概要

- **PhaseStructure（集約）**: 3層フェーズ構造の定義。Level 1/2/3とそれぞれのフェーズ・成果物を管理
- **PhaseLevel（値オブジェクト）**: Level 1/2/3の列挙型。各レベルに属するフェーズを保持
- **PhaseDependency（値オブジェクト）**: フェーズ間の前提条件関係（source → target の依存方向）
- **PhaseGateResult（値オブジェクト）**: phase-gate検証の結果（通過/拒否 + 拒否理由）
- **PlanningMode（値オブジェクト）**: interactive / embedded-qa の列挙型
- **PlanDocument（エンティティ）**: plan文書の存在・QAセクション有無・生成モードを管理
- **PhaseDependencyCustomization（集約）**: カスタマイズルール（preset/override/customRules）の管理。緩和不可制約の検証を含む
- **PhaseGateValidator（ドメインサービス）**: Level間依存検証、Level内順序検証、plan文書存在検証を統合実行

> 詳細なドメインモデル設計はdomain-designerスキルで定義する。

---

## 5. 外部依存

### 5.1 Shared Kernel参照

| 参照元 | 内容 |
|--------|------|
| `HarnessError` 型（harness-error） | phase-gate違反時のエラー出力フォーマット |
| `HarnessConfigV2` 型（config-foundation） | phaseDependenciesセクションの設定読み取り |

### 5.2 Cross-Unit Contract

| 契約 | 方向 | 相手Unit | 内容 |
|------|------|---------|------|
| Phase Dependency 3層構造 | 提供 | validator-system | phase-gateバリデータがphase-dependency-modelの3層構造定義を参照してLevel間依存を検証する |
| phaseDependencies設定スキーマ | 提供 | config-foundation | phasegate.config.json v2スキーマにphaseDependenciesセクションの定義を提供する |
| plan文書存在チェック | 提供 | validator-system | Phase 1完了判定のためのplan文書存在チェックロジックを提供する |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|----------------|
| K2 | Phase Gate | phase-gateバリデータを3層フェーズ構造に拡張。Level間依存およびLevel内順序をコードレベルで強制する |
| K14 | Phase Dependency Model | 3層フェーズ構造（Level 1/2/3）を定義し、設計フェーズ間の前提条件を機械的に強制。デフォルトフローは全PJ共通とし、Level間依存の緩和を禁止する |
| K15 | Plan文書の必須生成 | Planning Mode（interactive/embedded-qa）を定義し、Phase 1完了時のplan文書必須生成を検証。plan文書なしのPhase 2移行を物理的に拒否する |
| K6 | 2-Phase Execution | Phase 1（計画）→人間承認→Phase 2（実行）の構造をphase-gateで強制。plan文書のQAセクション存在を検証し、設計判断のトレーサビリティを保証する |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit | 内容 |
|------|------|---------|------|
| ドメインモデル | PhaseStructure（3層定義） | validator-system | 3層フェーズ構造の定義（Level/フェーズ/成果物）を公開 |
| バリデーション | PhaseGateValidator | validator-system | Level間依存検証、Level内順序検証、plan文書存在検証のインターフェース |
| 設定スキーマ | phaseDependencies | config-foundation | phasegate.config.json v2に追加するphaseDependenciesセクションのスキーマ定義 |
| ドメインモデル | PlanningMode定義 | harness-api | interactiveモード/embedded-qaモードの仕様定義 |

---

## 8. 実装上の制約・注意事項

- **Level間依存の緩和禁止**: Level 2→Level 1、Level 3→Level 2の依存はカスタマイズで緩和不可。この制約はハードコードされ、phasegate.config.jsonの設定で上書きできない
- **TDD最低保証**: story-implementor前のテスト設計フェーズ存在は緩和不可。Quick Modeであっても、テスト設計なしの実装着手を許容しない
- **Quick Modeとの関係**: Quick Mode（quick-mode Unit）は「どのバリデータを実行するか」を制御し、本UnitのPhase Dependency（設計順序）は「設計→実装の前提条件」を制御する。Quick Modeが緩和するのはバリデータ実行範囲（L3/L4の一部スキップ）であり、Level間依存（K14）やplan文書必須（K15）は緩和不可。2-Phase Execution（K6）の緩和はquick-mode Unitの`relaxedGates`で定義される範囲に限定される
- **成果物駆動の検証**: phase-gateバリデータはファイルシステム上の成果物（plan文書、設計文書）の存在で状態を判定する。データベースやステートファイルに依存しない
- **plan文書のQAセクション**: QAセクションは設計判断の根拠をトレーサブルに保持する目的があるため、空のQAセクションは検証失敗とする
- **カスタマイズの安全性**: `override: true`による依存緩和は監査ログ的に記録し、意図的な判断であることを明示させる
- **3層構造のフェーズ一覧**: 各Levelに属するフェーズ（スキル名）の一覧は本Unitで定義し、スキルの追加・変更時に更新する
