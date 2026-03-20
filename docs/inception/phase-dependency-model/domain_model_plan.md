# ドメインモデル設計計画: phase-dependency-model

## 1. スコープ

- **対象Unit**: phase-dependency-model（H-02 Phase Dependency Model）
- **担当ストーリー**: H02-01（3層フェーズ構造+phase-gate拡張）, H02-02（Planning Mode+plan文書必須）, H02-03（カスタマイズ）
- **他Unitとの境界**:
  - validator-system: PhaseGateValidatorのインターフェースを提供し、L2 phase-gateバリデータが本Unitの検証ロジックを呼び出す
  - config-foundation: phaseDependenciesセクションのJSONスキーマ構造を提供。意味論・不変条件は本Unitが所有
  - harness-error: phase-gate違反時のHarnessErrorフォーマット
  - harness-api: PlanningMode正規型定義とPhaseInfo（check-phase応答）を提供

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類 |
|------|-------------|------|
| PhaseStructure | H02-01 | ✅ **集約**（3層フェーズ構造全体の定義・検証） |
| PhaseLevel | H02-01 | 値オブジェクト（Level 1/2/3） |
| PhaseNode | H02-01 | 値オブジェクト（フェーズノード = スキル名 + 成果物） |
| PhaseDependency | H02-01 | 値オブジェクト（フェーズ間の前提条件関係） |
| PlanEvidence | H02-02 | 値オブジェクト（plan文書の存在・QAセクション有無の検証結果） |
| PlanningMode | H02-02 | 値オブジェクト（interactive/embedded-qa）。本Unitが正規定義を所有 |
| PhaseGateResult | H02-01 | 値オブジェクト（検証結果） |
| PhaseCustomizationPolicy | H02-03 | 値オブジェクト（カスタマイズルールのポリシー） |
| CustomRule | H02-03 | 値オブジェクト（カスタムルール定義） |
| Artifact | H02-01 | 値オブジェクト（成果物ファイルの定義） |

### 集約候補と根拠

1. **PhaseStructure（集約ルート）**: 3層フェーズ構造全体を表す。Level 1/2/3の各フェーズノード、ノード間の依存関係、成果物定義を一体として管理する整合性境界。Level間依存の整合性（Level 2→Level 1、Level 3→Level 2）はこの単一集約で保証

### v0からの変更点（新規Unit）

- v0では暗黙だったphase gateを「構造モデル」として昇格
- PhaseDependencyCustomization集約 → PhaseCustomizationPolicy値オブジェクトに降格（実体はHarnessConfigV2内、独立ライフサイクルなし）
- PlanDocument独立エンティティ → PlanEvidence値オブジェクトに降格（ファイルシステム状態の読み取り結果）

## 3. 設計方針

- **単一集約**: PhaseStructureのみ。Level間依存の整合性境界として必要十分
- **成果物駆動の検証**: phase-gateはファイルシステム上の成果物（plan文書、設計文書）の存在で状態を判定。DBやステートファイルに依存しない
- **PlanEvidence**: ファイルパスの存在、QAセクションの充足、PlanningModeとの対応を検証する値オブジェクト。QA検証ロジックが複雑でも仕様オブジェクトで表現
- **PhaseCustomizationPolicy**: PhaseStructureに適用されるポリシー値オブジェクト。HarnessConfigV2.phaseDependenciesから構築される。デフォルトフローの緩和不可制約（Level間依存・TDD最低保証）はPhaseStructure集約の不変条件としてハードコード
- **監査記録**: DependencyOverrideApplied相当の監査ペイロードをドメインから返し、Application層でログ化。Wave 1では本格的なドメインイベント基盤は不要
- **config-foundationとの責務分離**: config-foundationが`phaseDependencies`/`planningMode`のJSONスキーマ構造を所有し、本Unitが意味論・不変条件を所有。契約で明記

## 4. QA（不明点・確認事項）

### [Question] Q1: PhaseStructureの集約粒度 — 単一集約 vs Level別集約

3層フェーズ構造を単一のPhaseStructure集約で管理するか、Level1Structure/Level2Structure/Level3Structureの3集約に分割するか？

**決定**: 単一PhaseStructure集約。Level間依存の整合性が本Unitの中核不変条件であり、単一集約で一貫性を保証する。

[Answer] Claude/codex合意: 単一集約が妥当。Level間制約がドメインサービスに流出するのを防ぐ。

### [Question] Q2: PlanDocumentの粒度 — plan文書を独立エンティティにするか、PhaseNodeの属性にするか

plan文書はPhaseNodeに紐づく成果物の一種とも考えられる。

**決定**: PlanEvidence値オブジェクトとしてPhaseNodeが持つ証跡に変更。独立エンティティは不要。QA検証ロジックは仕様オブジェクトで表現し、ファイルシステム実体との二重管理を回避。

[Answer] codexレビュー合意: エンティティより値オブジェクトが自然。ファイルシステム状態の読み取り結果であり独自ライフサイクルを持たない。

### [Question] Q3: カスタマイズの「override: true」の監査記録

spec上「override: trueによる依存緩和は監査ログ的に記録」とあるが、この記録はドメインモデル内で管理するか、Infrastructure層のログ出力に委任するか？

**決定**: 監査ペイロードをドメインから返し、Application層でログ化。Wave 1では本格的なドメインイベント基盤は構築しない。

[Answer] codexレビュー合意: ドメインイベント基盤はWave 1では不要。監査ペイロードをApplication層でログ化する構成が実装コストに見合う。

## 5. 前提条件・リスク

- **フェーズ一覧の更新**: 新スキル追加時にPhaseStructureのフェーズ一覧更新が必要。漏れのリスクあり
- **Quick Modeとの境界**: Quick ModeがrelaxedGatesでphase-gateを緩和する際のインターフェース定義が必要
- **成果物パスの変更**: folder_management_rules.md変更時にPhaseStructure内のArtifactパスも更新が必要
- **config-foundation所有権**: `phaseDependencies`と`planningMode`の構造定義元と意味論定義元を契約上で明記すること
