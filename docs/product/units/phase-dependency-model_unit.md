# Unit定義: phase-dependency-model

> **Unit ID**: phase-dependency-model
> **作成日**: 2026-04-05
> **Wave**: 1（基盤構築）
> **対応Epic**: H-02 Phase Dependency Model

---

## 1. 概要

phase-dependency-modelは、Phasegateにおける設計フェーズ間の前提条件を機械的に強制するUnit。3層フェーズ構造（Level 1: Product全体設計 / Level 2: Unit横断設計 / Level 3: ストーリー実装）を定義し、phase-gateバリデータをレベル間依存検証に拡張することで、上位設計なしの下位設計・実装を物理的に拒否する。

v1で新規追加されたK14（Phase Dependency Model）およびK15（Plan文書の必須生成）に対応し、2つのPlanning Mode（interactive/embedded-qa）の定義、plan文書の必須生成検証、phasegate.config.jsonによるPhase Dependencyカスタマイズ機構を提供する。設計→設計および設計→実装の順序がコードレベルで強制されることにより、AIエージェントが上位設計を飛ばして実装に着手する行為を防止する。

さらに A-2（configurable phase gate plan）により、プリセット別のストーリー反映チェック（full / standard / minimal / custom）を導入し、product 文書への storyId 逆引き整合性を同一 Unit 内のドメインサービスとして提供する。

---

## 2. 担当ストーリー / Issue

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H02-01 | 3層フェーズ構造定義 + phase-gateバリデータ拡張 | Must |
| H02-02 | Planning Mode（interactive/embedded-qa）+ plan文書必須生成 | Must |
| H02-03 | Phase Dependencyカスタマイズ（preset/override/customRules） | Should |
| A-2    | Configurable Phase Gate — プリセット + ストーリー反映チェック（ドメイン層） | Must |

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
    - Level 3成果物は `inception/{unit}/{storyId}/` 配下の plan 文書と、`product/construction/{unit}/` に反映された実装・テスト設計を含む。
- phase-gateバリデータがLevel間の依存違反を検出する（Level 2の前提なしにLevel 3開始を拒否）
- phase-gateバリデータがLevel内の上流設計なしの下流設計生成を拒否する
- phase-gateバリデータが設計文書・plan文書なしの実装コード変更を拒否する
- Level間依存の緩和が不可であることを検証するテストを用意する

### 3.2 Planning Mode + plan文書必須生成（H02-02）

- **interactiveモード**: AIが対話的にヒアリングし、その結果からplan文書を生成する方式を定義する
- **embedded-qaモード**: テンプレートのQAセクションに人間が回答し、AIが計画を完成させる方式を定義する
- 両モードとも最終成果物として3層構造に応じた`inception/`配下に`*_plan.md`を生成する
- phase-gateバリデータがplan文書のファイル存在でPhase 1完了を検証し、plan文書なしのPhase 2移行を拒否する
- plan文書にQAセクション（設計判断の根拠）が含まれることを検証するテストを用意する

### 3.3 Phase Dependencyカスタマイズ（H02-03）

- phasegate.config.jsonに`phaseDependencies`セクション（preset/override/customRules）を追加する
- デフォルトフローへの依存追加（強化）を`customRules`で設定可能にする
- デフォルトフローからの依存削除（緩和）には`override: true`の明示を必要とする
- `story-implementor`前のテスト設計フェーズ存在を緩和不可にする（TDD最低保証）
- Level間依存（Level 2→Level 1、Level 3→Level 2）を緩和不可にする

### 3.4 inception内フェーズゲートの実効化（ISSUE-001）

- storyId が提供された場合、Level 3成果物（`required: false`）をコンテキスト依存で必須チェック対象とする
- `checkPhaseGate()` に `scope` パラメータを追加し、storyId 提供時に Level 3 ノードの解決済み成果物パスの存在を検証する
- 既存の依存グラフ（`3:logical-designer → 3:scenario-test-designer → ... → 3:story-implementor`）が実効的に機能し、inception 内の設計順序を物理的に強制する
- storyId 未指定時の既存動作（Level 3成果物をスキップ）は維持する
- `Artifact.required` フィールドの意味は変更せず、storyId 未指定時に Level 3成果物をスキップする既存用途を維持する

### 3.5 Configurable Phase Gate — プリセット + ストーリー反映チェック（A-2）

- `PhaseCustomizationPolicy.preset` を `'full' | 'standard' | 'minimal' | 'custom'` に拡張する（`'default'` は `'full'` にフォールバック）
- プリセット別のデフォルト `StoryReflectionMapping[]` を提供する（`full-story-reflection-defaults.ts` / `standard-story-reflection-defaults.ts` / `minimal-story-reflection-defaults.ts`）
- `StoryReflectionChecker` が inception ディレクトリ上の storyId 集合と product 文書内 `@story-id` 集合を突合し、不足 storyId を検出する
- ファイルシステム読み取りは `StoryReflectionFileSystemPort` 経由に限定し、ドメインサービスは infrastructure 実装を直接参照しない
- `StoryReflectionResult` は pass/fail と不足 storyId リストを返す
- プリセット `custom` の場合、phasegate.config.json から mappings を明示的に受け取る

---

## 4. ドメインモデル概要

### 4.1 3層構造・Phase Gate 基盤

- **PhaseStructure（集約）**: 3層フェーズ構造の定義。Level 1/2/3とそれぞれのフェーズ・成果物を管理
- **PhaseLevel（値オブジェクト）**: Level 1/2/3の列挙型
- **PhaseDependency（値オブジェクト）**: フェーズ間の前提条件関係（source → target）
- **PhaseGateResult（値オブジェクト）**: phase-gate検証の結果（通過/拒否 + 拒否理由）
- **PhaseGateValidator（ドメインサービス）**: Level間依存検証、Level内順序検証、plan文書存在検証を統合実行

### 4.2 Planning Mode

- **PlanningMode（値オブジェクト）**: interactive / embedded-qa の列挙型
- **PlanDocument（エンティティ）**: plan文書の存在・QAセクション有無・生成モードを管理

### 4.3 カスタマイズ / プリセット（A-2）

- **PhaseDependencyCustomization（集約）**: カスタマイズルール（preset/override/customRules）の管理。緩和不可制約の検証を含む
- **PhaseCustomizationPolicy（値オブジェクト）**: `preset: 'full' | 'standard' | 'minimal' | 'custom'` を保持。`'default'` 指定時は `'full'` にフォールバック
- **StoryReflectionMapping（値オブジェクト）**: inception 側 storyId ソース（例: `docs/inception/{unit}/{storyId}/`）と product 側参照先（例: `docs/product/construction/{unit}/*.md` 内の `@story-id`）の対応を表す
- **StoryReflectionConfig（値オブジェクト）**: `enabled: boolean` と `mappings: StoryReflectionMapping[]` を保持。プリセットデフォルト (`full-/standard-/minimal-story-reflection-defaults.ts`) または config からの注入で組み立てられる
- **StoryReflectionResult（値オブジェクト）**: チェック結果（pass/fail + 不足 storyId リスト）
- **StoryReflectionChecker（ドメインサービス）**: `unitId`、`StoryReflectionConfig`、`StoryReflectionFileSystemPort` を入力に取り、inception 上の storyId と product 文書の `@story-id` を突合して `StoryReflectionResult` を返す

### 4.4 ポート

- **StoryReflectionFileSystemPort（ポート）**: inception ディレクトリの storyId 列挙と product 文書内 `@story-id` 読み取りを抽象化する。実装は infrastructure 層（A-4 で `FileSystemStoryReflectionAdapter` として提供予定）

> 詳細なドメインモデル設計は domain-designer スキルで定義する。A-2 成果物は `docs/inception/_shared/configurable_phase_gate_plan.md` に対応。

---

## 5. 外部依存

### 5.1 Shared Kernel参照

| 参照元 | 内容 |
|--------|------|
| `HarnessError` 型（harness-error） | phase-gate違反時のエラー出力フォーマット |
| `HarnessConfigV2` 型（config-foundation） | `phaseDependencies` セクション（preset / storyReflection）の設定読み取り |

### 5.2 Cross-Unit Contract

| 契約 | 方向 | 相手Unit | 内容 |
|------|------|---------|------|
| Phase Dependency 3層構造 | 提供 | validator-system | phase-gateバリデータが3層構造定義を参照 |
| phaseDependencies設定スキーマ | 提供 | config-foundation | preset / storyReflection / customRules を含むスキーマを提供 |
| plan文書存在チェック | 提供 | validator-system | Phase 1完了判定ロジック |
| StoryReflectionChecker | 提供 | validator-system | プリセット別ストーリー反映チェックのドメインサービス |
| StoryReflectionFileSystemPort | 要求 | traceability-model / infrastructure | product 文書内 `@story-id` 列挙とinception storyId 列挙の実装を要求 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|----------------|
| K2 | Phase Gate | phase-gateバリデータを3層構造に拡張し、Level間依存/順序をコード強制 |
| K14 | Phase Dependency Model | 3層構造を定義し、Level間依存緩和を禁止 |
| K15 | Plan文書の必須生成 | Planning Mode と plan文書必須生成を検証 |
| K6 | 2-Phase Execution | Phase 1→承認→Phase 2 構造を phase-gate で強制。QAセクションを検証 |
| K13 | phasegate.config.json | preset / storyReflection / customRules を設定 SSOT として参照 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit | 内容 |
|------|------|---------|------|
| ドメインモデル | PhaseStructure（3層定義） | validator-system | 3層フェーズ構造の定義 |
| バリデーション | PhaseGateValidator | validator-system | Level間依存/順序/plan文書存在検証 |
| 値オブジェクト | PhaseCustomizationPolicy | validator-system / harness-api | `preset: 'full' \| 'standard' \| 'minimal' \| 'custom'` を保持 |
| 値オブジェクト | StoryReflectionConfig / StoryReflectionMapping | validator-system / harness-api | プリセット別デフォルトまたは config 注入で組み立てる反映チェック設定 |
| ドメインサービス | StoryReflectionChecker | validator-system | inception storyId と product `@story-id` の突合 |
| ポート | StoryReflectionFileSystemPort | infrastructure | ファイルシステムアクセスの抽象 |
| 設定スキーマ | phaseDependencies | config-foundation | preset / storyReflection / customRules |
| ドメインモデル | PlanningMode 定義 | harness-api | interactive / embedded-qa の仕様 |

---

## 8. 実装上の制約・注意事項

- **Level間依存の緩和禁止**: Level 2→Level 1、Level 3→Level 2 の依存はカスタマイズで緩和不可。phasegate.config.json からは上書きできない
- **TDD最低保証**: story-implementor 前のテスト設計フェーズ存在は緩和不可（Quick Mode でも維持）
- **プリセットフォールバック**: `PhaseCustomizationPolicy.preset = 'default'` は後方互換のため `'full'` に正規化する。拡張時に新プリセットを追加する場合は必ずデフォルト mappings ファイルを同時追加する
- **StoryReflection の FS 分離**: ドメインサービス（`StoryReflectionChecker`）は `StoryReflectionFileSystemPort` のみに依存し、`fs` / `path` を直接 import しない。これにより A-4 でのインフラ層注入とテストの純粋性を両立する
- **プリセット別デフォルトの所在**: `full-story-reflection-defaults.ts`、`standard-story-reflection-defaults.ts`、`minimal-story-reflection-defaults.ts` は本 Unit の domain 層配下に配置し、infrastructure 層からの参照を禁止する（逆方向）
- **Quick Modeとの関係**: Quick Mode はバリデータ実行範囲を制御し、本 Unit の Phase Dependency は設計順序を制御する。Level 間依存（K14）/ plan 文書必須（K15）/ ストーリー反映（A-2 minimal 以上）は Quick Mode でも緩和不可
- **成果物駆動の検証**: phase-gate バリデータはファイルシステム上の成果物で状態を判定する。DB・ステートファイルに依存しない
- **plan 文書の QA セクション**: 空の QA セクションは検証失敗
- **カスタマイズの安全性**: `override: true` による緩和は監査ログ的に記録し、意図的判断を明示させる
- **3層構造のフェーズ一覧**: 各 Level に属するフェーズ（スキル名）は本 Unit で定義し、スキル追加・変更時に更新する

---

## 9. 関連設計文書

- `docs/inception/_shared/configurable_phase_gate_plan.md` — A-2 実装計画（プリセット + ストーリー反映チェック）
- `scripts/harness/phase-dependency-model/` — 実装ディレクトリ

### Corpus 履歴

- 詳細定義は 2026-03-12 に作成され、A-2 拡張を含む canonical 定義は 2026-04-05 に成立した。
- 2026-07-16: WI-285 で両定義の固有内容を canonical path へ統合し、単一正本化した。
