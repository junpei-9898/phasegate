# ユニットテスト設計: phase-dependency-model

@story-id H02-01
@story-id H02-02
@story-id H02-03
@story-id H02-04
@story-id H02-05
@story-id H02-06
@story-id H02-07
> **Unit ID**: phase-dependency-model
> **作成日**: 2026-03-13
> **最終更新**: 2026-04-24（H02-07 / ISSUE-026 Phase C-4 legacy annotation compatibility テストケース追加）
> **対応ストーリー**: H02-01, H02-02, H02-03, H02-04, H02-05, H02-06, H02-07
> **対応Issue**: ISSUE-001, ISSUE-026
> **正規ソース**: `docs/product/construction/phase-dependency-model/domain_model.md`

---

## 1. 対象ドメインモデル

### 集約

| 集約ルート | 説明 |
|-----------|------|
| PhaseStructure | 3層フェーズ構造全体。Level間前提条件・成果物定義を一体管理する集約 |

### 値オブジェクト（9件）

| # | 値オブジェクト | 所属 | 制約数 |
|---|-------------|------|-------|
| 1 | PhaseLevel | 集約内部 | 生成規則1 + 構造バリデーション1 + 振る舞い3 |
| 2 | Artifact | PhaseNode構成要素 | 3 |
| 3 | PhaseNode | 集約内部 | 2（+ 重複不可は集約側で保証） |
| 4 | PhaseDependency | 集約内部 | 2 |
| 5 | PlanningMode | 独立 | 2 |
| 6 | PlanEvidence | 集約利用 | 2 |
| 7 | CustomRule | PhaseCustomizationPolicy構成要素 | 2 |
| 8 | PhaseCustomizationPolicy | 集約内部 | 2 |
| 9 | PhaseGateResult | 集約出力 | 2 |

### ドメインサービス

なし。PhaseStructure集約が検証ロジックを内包する。

---

## 2. テストファイル構成

```
scripts/harness/__tests__/unit/phase-dependency-model/
├── phase-structure.test.ts              # PhaseStructure集約 + 内包VO検証
├── planning-mode.test.ts                # PlanningMode値オブジェクト
└── phase-customization-policy.test.ts   # PhaseCustomizationPolicy + CustomRule値オブジェクト
```

### ファイル別テスト対象マッピング

| テストファイル | テスト対象コンポーネント |
|-------------|---------------------|
| `phase-structure.test.ts` | PhaseStructure, PhaseLevel, Artifact, PhaseNode, PhaseDependency, PlanEvidence, PhaseGateResult |
| `planning-mode.test.ts` | PlanningMode |
| `phase-customization-policy.test.ts` | PhaseCustomizationPolicy, CustomRule |

### テスト規約

- ファイル名: kebab-case
- テストケース名: 日本語
- AAAパターン（Arrange / Act / Assert）
- 実行結果変数: `actual`
- 構造: `target` / `describe` / `context` / `it`
- ドメイン層: モック禁止（全て実体で検証）

---

## 3. 集約テストケース: PhaseStructure

### 3.1 createDefault(policy)

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-001 | `createDefault` | デフォルトポリシーでPhaseStructureを構築する | - | 3層のフェーズノードと既定依存関係を持つPhaseStructureが生成される |
| UT-PD-002 | `createDefault` | デフォルトポリシーでPhaseStructureを構築する | - | Level 1にproduct-wide計画スキルのフェーズノードが含まれる |
| UT-PD-003 | `createDefault` | デフォルトポリシーでPhaseStructureを構築する | - | Level 2→Level 1、Level 3→Level 2の既定依存関係が設定される |
| UT-PD-004 | `createDefault` | デフォルトポリシーでPhaseStructureを構築する | カスタムルールが存在しないフェーズノードを参照している場合 | InvalidCustomRuleErrorをスローする |
| UT-PD-005 | `createDefault` | デフォルトポリシーでPhaseStructureを構築する | カスタムルールがLevel間依存を緩和しようとしている場合 | NonRelaxableDependencyOverrideErrorをスローする |
| UT-PD-006 | `createDefault` | デフォルトポリシーでPhaseStructureを構築する | カスタムルール適用後に循環依存が発生する場合 | CyclicPhaseDependencyErrorをスローする |

### 3.2 checkPhaseGate(targetLevel, evidence)

**不変条件 INV-1: Level 2開始にはLevel 1前提成果物が全存在**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-007 | `checkPhaseGate` | Level 2のフェーズゲートを検証する | Level 1の前提成果物が全て存在する場合 | PhaseGateResult.passed=trueを返す |
| UT-PD-008 | `checkPhaseGate` | Level 2のフェーズゲートを検証する | Level 1の前提成果物が一部欠損している場合 | PhaseGateResult.passed=falseかつblockersに欠損成果物が含まれる |
| UT-PD-009 | `checkPhaseGate` | Level 2のフェーズゲートを検証する | Level 1の前提成果物が全て欠損している場合 | PhaseGateResult.passed=falseかつblockersに全欠損成果物が含まれる |

**不変条件 INV-2: Level 3開始にはLevel 2前提成果物が全存在**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-010 | `checkPhaseGate` | Level 3のフェーズゲートを検証する | Level 2の前提成果物が全て存在する場合 | PhaseGateResult.passed=trueを返す |
| UT-PD-011 | `checkPhaseGate` | Level 3のフェーズゲートを検証する | Level 2の前提成果物が一部欠損している場合 | PhaseGateResult.passed=falseかつblockersに欠損成果物が含まれる |
| UT-PD-012 | `checkPhaseGate` | Level 3のフェーズゲートを検証する | Level 2の前提成果物が全て欠損している場合 | PhaseGateResult.passed=falseかつblockersに全欠損成果物が含まれる |

**不変条件 INV-4: interactive時、plan文書にQAセクション存在**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-013 | `checkPhaseGate` | PlanningMode=interactiveでフェーズゲートを検証する | plan文書にQAセクションが存在する場合 | PhaseGateResult.passed=trueを返す |
| UT-PD-014 | `checkPhaseGate` | PlanningMode=interactiveでフェーズゲートを検証する | plan文書にQAセクションが存在しない場合 | PhaseGateResult.passed=falseかつblockersにQAセクション不足が含まれる |

**不変条件 INV-5: embedded-qa時、対話的Q&A完了**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-015 | `checkPhaseGate` | PlanningMode=embedded-qaでフェーズゲートを検証する | 対話的Q&Aが完了している場合 | PhaseGateResult.passed=trueを返す |
| UT-PD-016 | `checkPhaseGate` | PlanningMode=embedded-qaでフェーズゲートを検証する | 対話的Q&Aが未完了の場合 | PhaseGateResult.passed=falseかつblockersにQ&A未完了が含まれる |

**その他の正常系・異常系**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-017 | `checkPhaseGate` | Level 1のフェーズゲートを検証する | - | Level 1は起点のため前提条件なしでPhaseGateResult.passed=trueを返す |
| UT-PD-018 | `checkPhaseGate` | フェーズゲートを検証する | 無効なPhaseLevelが指定された場合 | InvalidPhaseLevelErrorをスローする |

### 3.3 getPhaseNodes(level)

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-019 | `getPhaseNodes` | 指定Levelのフェーズノード一覧を返す | Level 1を指定した場合 | Level 1に属するフェーズノードの配列を返す |
| UT-PD-020 | `getPhaseNodes` | 指定Levelのフェーズノード一覧を返す | Level 2を指定した場合 | Level 2に属するフェーズノードの配列を返す |
| UT-PD-021 | `getPhaseNodes` | 指定Levelのフェーズノード一覧を返す | Level 3を指定した場合 | Level 3に属するフェーズノードの配列を返す |
| UT-PD-022 | `getPhaseNodes` | 指定Levelのフェーズノード一覧を返す | 無効なPhaseLevelが指定された場合 | InvalidPhaseLevelErrorをスローする |

### 3.4 buildDependencyGraph()

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-023 | `buildDependencyGraph` | フェーズ依存グラフを構築する | - | 全依存関係を含むグラフ構造を返す |
| UT-PD-024 | `buildDependencyGraph` | フェーズ依存グラフを構築する | - | Level間依存がrequires型で含まれる |

### 3.5 applyCustomization(policy)

**不変条件 INV-3: Level間依存は緩和不可**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-025 | `applyCustomization` | カスタマイズポリシーを適用する | Level間依存を緩和しないルールの場合 | ポリシーが正常に適用される |
| UT-PD-026 | `applyCustomization` | カスタマイズポリシーを適用する | Level間依存を緩和するルールの場合 | NonRelaxableDependencyOverrideErrorをスローする |

**不変条件 INV-6: override=trueでもLevel間依存とTDD最低保証は緩和不可**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-027 | `applyCustomization` | override=trueのカスタマイズポリシーを適用する | Level間依存を緩和しようとした場合 | NonRelaxableDependencyOverrideErrorをスローする |
| UT-PD-028 | `applyCustomization` | override=trueのカスタマイズポリシーを適用する | TDD最低保証を緩和しようとした場合 | NonRelaxableDependencyOverrideErrorをスローする |
| UT-PD-029 | `applyCustomization` | override=trueのカスタマイズポリシーを適用する | 緩和可能な制約のみを緩和する場合 | ポリシーが正常に適用される |

**不変条件 INV-7: override=true適用時に監査ペイロード返却**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-030 | `applyCustomization` | override=trueのカスタマイズポリシーを適用する | 緩和可能な制約を緩和した場合 | 監査ペイロードが返却される |
| UT-PD-031 | `applyCustomization` | override=trueのカスタマイズポリシーを適用する | 緩和可能な制約を緩和した場合 | 監査ペイロードに適用されたルールとタイムスタンプが含まれる |

**その他の異常系**

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-032 | `applyCustomization` | カスタマイズポリシーを適用する | カスタムルールが存在しないフェーズノードを参照している場合 | InvalidCustomRuleErrorをスローする |
| UT-PD-033 | `applyCustomization` | カスタマイズポリシーを適用する | カスタムルール適用後に循環依存が発生する場合 | CyclicPhaseDependencyErrorをスローする |

### 3.6 getDependencies(from)

| ケースID | target | describe | context | it（期待値） |
|---------|--------|----------|---------|------------|
| UT-PD-034 | `getDependencies` | 指定フェーズノードの依存関係を返す | 依存先が存在するノードを指定した場合 | 該当する依存関係の配列を返す |
| UT-PD-035 | `getDependencies` | 指定フェーズノードの依存関係を返す | 依存先が存在しないノードを指定した場合 | 空配列を返す |

---

## 4. 値オブジェクトテストケース

### 4.1 PhaseLevel

> **制約帰属**: PhaseLevelの生成規則（1/2/3のみ許可）はPhaseLevel自身の制約。Level 1起点/Level 3終点の構造的バリデーションもPhaseLevel自身が持つ。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-036 | `PhaseLevel.create` | PhaseLevelを生成する | 値が1の場合 | PhaseLevel(1)が生成される | `phase-structure.test.ts` |
| UT-PD-037 | `PhaseLevel.create` | PhaseLevelを生成する | 値が2の場合 | PhaseLevel(2)が生成される | `phase-structure.test.ts` |
| UT-PD-038 | `PhaseLevel.create` | PhaseLevelを生成する | 値が3の場合 | PhaseLevel(3)が生成される | `phase-structure.test.ts` |
| UT-PD-039 | `PhaseLevel.create` | PhaseLevelを生成する | 値が0の場合 | InvalidPhaseLevelErrorをスローする | `phase-structure.test.ts` |
| UT-PD-040 | `PhaseLevel.create` | PhaseLevelを生成する | 値が4の場合 | InvalidPhaseLevelErrorをスローする | `phase-structure.test.ts` |
| UT-PD-041 | `isHigherThan` | 他のPhaseLevelとの大小比較を行う | Level 2とLevel 1を比較した場合 | trueを返す | `phase-structure.test.ts` |
| UT-PD-042 | `isHigherThan` | 他のPhaseLevelとの大小比較を行う | Level 1とLevel 2を比較した場合 | falseを返す | `phase-structure.test.ts` |
| UT-PD-043 | `isPrerequisiteOf` | 前提条件関係を判定する | Level 1がLevel 2の前提かを判定した場合 | trueを返す | `phase-structure.test.ts` |
| UT-PD-044 | `isPrerequisiteOf` | 前提条件関係を判定する | Level 2がLevel 1の前提かを判定した場合 | falseを返す | `phase-structure.test.ts` |
| UT-PD-045 | `equals` | 値等価性を判定する | 同一値のPhaseLevelを比較した場合 | trueを返す | `phase-structure.test.ts` |
| UT-PD-046 | `equals` | 値等価性を判定する | 異なる値のPhaseLevelを比較した場合 | falseを返す | `phase-structure.test.ts` |

### 4.2 Artifact

> **制約帰属**: 空文字不可制約、許可外プレースホルダ禁止（WI-085 / ADR-016: 許可は `{designDocsRoot}` / `{inceptionDocsRoot}` / `{unit}` / `{storyId}`）、`required === true`の未解決プレースホルダ禁止はいずれもArtifact自身の制約。`docs/`始まり制約は WI-085 で撤廃した。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-047 | `Artifact.create` | Artifactを生成する | pathが"docs/"で始まる有効なパスの場合 | Artifactが正常に生成される | `phase-structure.test.ts` |
| UT-PD-048 | `Artifact.create` | Artifactを生成する | pathが空文字の場合 | InvalidArtifactPathErrorをスローする | `phase-structure.test.ts` |
| UT-PD-049 | `Artifact.create` | Artifactを生成する | pathが"docs/"以外で始まる場合（WI-085: 接頭辞バリデーション撤廃） | Artifactが正常に生成される | `phase-structure.test.ts` |
| UT-PD-050 | `Artifact.create` | Artifactを生成する | required=trueかつpathに未解決プレースホルダが含まれる場合 | InvalidArtifactPathErrorをスローする | `phase-structure.test.ts` |
| UT-PD-051 | `Artifact.create` | Artifactを生成する | required=falseかつpathに未解決プレースホルダが含まれる場合 | Artifactが正常に生成される（required=falseは許容） | `phase-structure.test.ts` |
| UT-PD-052 | `Artifact.create` | Artifactを生成する | required=trueかつ有効なパスの場合 | required=trueのArtifactが生成される | `phase-structure.test.ts` |
| UT-PD-053 | `equals` | 値等価性を判定する | 同一属性のArtifactを比較した場合 | trueを返す | `phase-structure.test.ts` |
| UT-PD-169 | `Artifact.create` | Artifactを生成する | pathに`{designDocsRoot}`プレースホルダを含む場合（WI-085） | Artifactが正常に生成される | `phase-structure.test.ts` |
| UT-PD-170 | `Artifact.create` | Artifactを生成する | pathに`{inceptionDocsRoot}`プレースホルダを含む場合（WI-085） | Artifactが正常に生成される | `phase-structure.test.ts` |
| UT-PD-171 | `Artifact.create` | Artifactを生成する | pathに許可外プレースホルダ（例: `{unknownRoot}`）を含む場合（WI-085） | InvalidArtifactPathErrorをスローする | `phase-structure.test.ts` |

### 4.3 PhaseNode

> **制約帰属**: skillName空文字不可、Level 3のstoryIdプレースホルダ制約はPhaseNode自身の制約。「同一Level内のノード重複不可」はPhaseStructure集約の不変条件（nodeIndexによるキー重複検出）で保証される。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-054 | `PhaseNode.create` | PhaseNodeを生成する | skillNameとartifactsとlevelが有効な場合 | PhaseNodeが正常に生成される | `phase-structure.test.ts` |
| UT-PD-055 | `PhaseNode.create` | PhaseNodeを生成する | skillNameが空文字の場合 | エラーをスローする | `phase-structure.test.ts` |
| UT-PD-056 | `PhaseNode.create` | PhaseNodeを生成する | Level 3でstoryIdプレースホルダが設定されている場合 | PhaseNodeが正常に生成される | `phase-structure.test.ts` |
| UT-PD-057 | `PhaseNode.create` | PhaseNodeを生成する | 複数のArtifactを持つ場合 | 全Artifactが保持されたPhaseNodeが生成される | `phase-structure.test.ts` |
| UT-PD-058 | `equals` | 値等価性を判定する | 同一属性のPhaseNodeを比較した場合 | trueを返す | `phase-structure.test.ts` |
| UT-PD-059 | `equals` | 値等価性を判定する | skillNameが異なるPhaseNodeを比較した場合 | falseを返す | `phase-structure.test.ts` |

### 4.4 PhaseDependency

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-060 | `PhaseDependency.create` | PhaseDependencyを生成する | from/toが異なるノードでtype=requiresの場合 | PhaseDependencyが正常に生成される | `phase-structure.test.ts` |
| UT-PD-061 | `PhaseDependency.create` | PhaseDependencyを生成する | from/toが異なるノードでtype=recommendsの場合 | PhaseDependencyが正常に生成される | `phase-structure.test.ts` |
| UT-PD-062 | `PhaseDependency.create` | PhaseDependencyを生成する | fromとtoが同一ノードの場合 | InvalidPhaseDependencyErrorをスローする | `phase-structure.test.ts` |
| UT-PD-063 | `PhaseDependency.create` | PhaseDependencyを生成する | typeがrequires/recommends以外の場合 | InvalidPhaseDependencyErrorをスローする | `phase-structure.test.ts` |
| UT-PD-064 | `equals` | 値等価性を判定する | 同一属性のPhaseDependencyを比較した場合 | trueを返す | `phase-structure.test.ts` |

### 4.5 PlanningMode

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-065 | `PlanningMode.create` | PlanningModeを生成する | "interactive"を指定した場合 | PlanningMode(interactive)が生成される | `planning-mode.test.ts` |
| UT-PD-066 | `PlanningMode.create` | PlanningModeを生成する | "embedded-qa"を指定した場合 | PlanningMode(embedded-qa)が生成される | `planning-mode.test.ts` |
| UT-PD-067 | `PlanningMode.create` | PlanningModeを生成する | 無効な文字列を指定した場合 | InvalidPlanningModeErrorをスローする | `planning-mode.test.ts` |
| UT-PD-068 | `fromConfig` | HarnessConfigV2の設定値からPlanningModeに変換する | 有効な設定値の場合 | 対応するPlanningModeが生成される | `planning-mode.test.ts` |
| UT-PD-069 | `equals` | 値等価性を判定する | 同一値のPlanningModeを比較した場合 | trueを返す | `planning-mode.test.ts` |

### 4.6 PlanEvidence

> **制約帰属**: `exists=false`なら`qaComplete`/`planningModeMatch`もfalseである制約、`planningModeMatch=true`なら`exists=true`である制約はPlanEvidence自身の制約。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-070 | `PlanEvidence.create` | PlanEvidenceを生成する | exists=true, qaComplete=true, planningModeMatch=trueの場合 | PlanEvidenceが正常に生成される | `phase-structure.test.ts` |
| UT-PD-071 | `PlanEvidence.create` | PlanEvidenceを生成する | exists=falseの場合 | qaComplete=false, planningModeMatch=falseのPlanEvidenceが生成される | `phase-structure.test.ts` |
| UT-PD-072 | `PlanEvidence.create` | PlanEvidenceを生成する | exists=falseかつqaComplete=trueを指定した場合 | 矛盾するためエラーをスローする | `phase-structure.test.ts` |
| UT-PD-073 | `PlanEvidence.create` | PlanEvidenceを生成する | planningModeMatch=trueかつexists=falseを指定した場合 | 矛盾するためエラーをスローする | `phase-structure.test.ts` |
| UT-PD-074 | `PlanEvidence.create` | PlanEvidenceを生成する | exists=true, qaComplete=false, planningModeMatch=falseの場合 | PlanEvidenceが正常に生成される | `phase-structure.test.ts` |

### 4.7 CustomRule

> **制約帰属**: targetPhase空文字不可、action1件以上はCustomRule自身の制約。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-075 | `CustomRule.create` | CustomRuleを生成する | targetPhaseとconditionとactionが有効な場合 | CustomRuleが正常に生成される | `phase-customization-policy.test.ts` |
| UT-PD-076 | `CustomRule.create` | CustomRuleを生成する | targetPhaseが空文字の場合 | InvalidCustomRuleErrorをスローする | `phase-customization-policy.test.ts` |
| UT-PD-077 | `CustomRule.create` | CustomRuleを生成する | actionが空配列の場合 | InvalidCustomRuleErrorをスローする | `phase-customization-policy.test.ts` |
| UT-PD-078 | `CustomRule.create` | CustomRuleを生成する | actionが複数件の場合 | 全actionを保持したCustomRuleが生成される | `phase-customization-policy.test.ts` |

### 4.8 PhaseCustomizationPolicy

> **制約帰属**: preset制約（有効なプリセット値のみ許容）、overrideEnabled制約（boolean型）はPhaseCustomizationPolicy自身の制約。Level間依存やTDD最低保証の緩和不可はPhaseStructure集約の不変条件（INV-3, INV-6）で保証される。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-079 | `PhaseCustomizationPolicy.create` | PhaseCustomizationPolicyを生成する | rulesとoverrideEnabled=falseの場合 | PhaseCustomizationPolicyが正常に生成される | `phase-customization-policy.test.ts` |
| UT-PD-080 | `PhaseCustomizationPolicy.create` | PhaseCustomizationPolicyを生成する | overrideEnabled=trueの場合 | overrideEnabled=trueのPhaseCustomizationPolicyが生成される | `phase-customization-policy.test.ts` |
| UT-PD-081 | `PhaseCustomizationPolicy.create` | PhaseCustomizationPolicyを生成する | rulesが空配列の場合 | ルールなしのPhaseCustomizationPolicyが正常に生成される | `phase-customization-policy.test.ts` |
| UT-PD-082 | `PhaseCustomizationPolicy.create` | PhaseCustomizationPolicyを生成する | 複数のCustomRuleを持つ場合 | 全ルールを保持したPhaseCustomizationPolicyが生成される | `phase-customization-policy.test.ts` |
| UT-PD-083 | `equals` | 値等価性を判定する | 同一属性のPhaseCustomizationPolicyを比較した場合 | trueを返す | `phase-customization-policy.test.ts` |

### 4.9 PhaseGateResult

> **制約帰属**: `passed=false`ならblockers1件以上、`auditPayload`はoverride適用時のみ付与はPhaseGateResult自身の制約。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-084 | `PhaseGateResult.create` | PhaseGateResultを生成する | passed=trueかつblockersが空の場合 | PhaseGateResultが正常に生成される | `phase-structure.test.ts` |
| UT-PD-085 | `PhaseGateResult.create` | PhaseGateResultを生成する | passed=falseかつblockersが1件以上の場合 | PhaseGateResultが正常に生成される | `phase-structure.test.ts` |
| UT-PD-086 | `PhaseGateResult.create` | PhaseGateResultを生成する | passed=falseかつblockersが空の場合 | 矛盾するためエラーをスローする | `phase-structure.test.ts` |
| UT-PD-087 | `PhaseGateResult.create` | PhaseGateResultを生成する | auditPayloadが付与されている場合 | auditPayloadを保持したPhaseGateResultが生成される | `phase-structure.test.ts` |
| UT-PD-088 | `PhaseGateResult.create` | PhaseGateResultを生成する | passed=trueかつwarningsが含まれる場合 | warningsを保持したPhaseGateResultが生成される | `phase-structure.test.ts` |

---

## 5. ドメインサービステストケース

該当なし。PhaseStructure集約が全ての検証ロジックを内包しているため、ドメインサービスは存在しない。

---

## 6. 境界値・異常系

### 6.1 PhaseLevel境界値

| ケースID | 入力値 | 期待結果 | 根拠 |
|---------|-------|---------|------|
| UT-PD-089 | 0（下限外） | InvalidPhaseLevelError | 生成規則: 1/2/3のみ許可 |
| UT-PD-090 | 1（下限） | 正常生成 | 有効値の下限 |
| UT-PD-091 | 3（上限） | 正常生成 | 有効値の上限 |
| UT-PD-092 | 4（上限外） | InvalidPhaseLevelError | 生成規則: 1/2/3のみ許可 |
| UT-PD-093 | -1（負数） | InvalidPhaseLevelError | 生成規則: 1/2/3のみ許可 |
| UT-PD-094 | 1.5（小数） | InvalidPhaseLevelError | 整数のみ許可 |

### 6.2 Artifact.path境界値

| ケースID | 入力値 | 期待結果 | 根拠 |
|---------|-------|---------|------|
| UT-PD-095 | `""` | InvalidArtifactPathError | 空文字不可 |
| UT-PD-096 | `"docs/"` | 正常生成 | 最短の有効パス |
| UT-PD-097 | `"docs/valid.md"` | 正常生成 | 典型的な有効パス |
| UT-PD-098 | `"src/invalid.md"` | 正常生成 | WI-085: `docs/`接頭辞バリデーション撤廃により非`docs/`配下も許容 |
| UT-PD-099 | `"DOCS/upper.md"` | 正常生成 | WI-085: 同上（任意のリテラル相対パスを許容） |

### 6.3 CustomRule.action境界値

| ケースID | 入力値 | 期待結果 | 根拠 |
|---------|-------|---------|------|
| UT-PD-100 | 空配列 `[]` | InvalidCustomRuleError | action1件以上必須 |
| UT-PD-101 | 1件 `["skip"]` | 正常生成 | 最小有効件数 |
| UT-PD-102 | 複数件 `["skip", "warn"]` | 正常生成 | 複数action許容 |

### 6.4 PlanEvidence属性組合せ

| ケースID | exists | qaComplete | planningModeMatch | 期待結果 | 根拠 |
|---------|--------|-----------|-------------------|---------|------|
| UT-PD-103 | false | false | false | 正常生成 | 全false: 整合的 |
| UT-PD-104 | false | true | false | エラー | exists=false時の残り属性もfalse制約違反 |
| UT-PD-105 | false | false | true | エラー | planningModeMatch=trueならexists=true制約違反 |
| UT-PD-106 | true | false | false | 正常生成 | exists=trueで他属性はfalse: 整合的 |
| UT-PD-107 | true | true | true | 正常生成 | 全true: 整合的 |

### 6.5 ドメインエラー網羅性

| ケースID | ドメインエラー | 発生条件 | 検証ケースID参照 |
|---------|-------------|---------|----------------|
| UT-PD-108 | InvalidPhaseLevelError | PhaseLevel生成時に1/2/3以外を指定 | UT-PD-039, UT-PD-040, UT-PD-089〜094 |
| UT-PD-109 | InvalidPlanningModeError | PlanningMode生成時にinteractive/embedded-qa以外を指定 | UT-PD-067 |
| UT-PD-110 | InvalidArtifactPathError | Artifact.pathが空文字、または許可外プレースホルダを含む（WI-085: 許可は`{designDocsRoot}` / `{inceptionDocsRoot}` / `{unit}` / `{storyId}`）、またはrequired=trueで未解決プレースホルダ | UT-PD-048, UT-PD-050, UT-PD-095, UT-PD-171 |
| UT-PD-111 | InvalidPhaseDependencyError | PhaseDependency生成時に自己依存またはtype制約違反 | UT-PD-062, UT-PD-063 |
| UT-PD-112 | InvalidCustomRuleError | CustomRuleが未知ノード参照またはtargetPhase空文字またはaction空 | UT-PD-004, UT-PD-032, UT-PD-076, UT-PD-077 |
| UT-PD-113 | NonRelaxableDependencyOverrideError | Level間依存またはTDD最低保証の緩和を試行 | UT-PD-005, UT-PD-026〜028 |
| UT-PD-114 | CyclicPhaseDependencyError | カスタムルール適用後に循環依存が発生 | UT-PD-006, UT-PD-033 |

---

## 7. テスト環境設定

### Vitestコンフィグ

- 共有設定: `scripts/harness/__tests__/vitest.config.ts`
- フレームワーク: Vitest 3.0.0

### テストヘルパー

- `target` / `context` エイリアス: `describe`のエイリアスとして定義（共通ヘルパーからimport）
- テストデータファクトリ: PhaseStructure集約テストではテストデータ量が大きくなるため、以下のファクトリ関数を用意する
  - `createDefaultPhaseStructure()`: デフォルトのPhaseStructureを生成
  - `createPhaseLevel(value)`: PhaseLevelを生成
  - `createArtifact(overrides?)`: Artifactを生成（デフォルト値付き）
  - `createPhaseNode(overrides?)`: PhaseNodeを生成（デフォルト値付き）
  - `createPhaseDependency(overrides?)`: PhaseDependencyを生成（デフォルト値付き）
  - `createPlanEvidence(overrides?)`: PlanEvidenceを生成（デフォルト値付き）
  - `createCustomRule(overrides?)`: CustomRuleを生成（デフォルト値付き）
  - `createPhaseCustomizationPolicy(overrides?)`: PhaseCustomizationPolicyを生成（デフォルト値付き）

### 前提条件

- `domain/definitions/default-phase-nodes.ts` と `default-phase-dependencies.ts` の静的定義が実装済みであること
- ドメインエラー7種（InvalidPhaseLevelError, InvalidPlanningModeError, InvalidArtifactPathError, InvalidPhaseDependencyError, InvalidCustomRuleError, NonRelaxableDependencyOverrideError, CyclicPhaseDependencyError）が実装済みであること

### モック方針

- **ドメイン層**: モック禁止。値オブジェクト・集約は全て実体を使用する
- **ポート**: 本テスト設計のスコープ外（ユニットテストではドメイン層のみを対象とする）

---

---

## 8. カバレッジギャップ補強ケース

> 以下のケースは `coverage_report.md` セクション5・6で特定された未カバー項目を補うために追加する。

### 8.1 AC-PD-04: 設計文書・plan文書なしの実装コード変更拒否

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-115 | `checkPhaseGate` | changedFilesに実装コードが含まれる場合のフェーズゲートを検証する | Level 2の設計文書（domain_model.md）が未整備の場合 | PhaseGateResult.passed=falseかつblockersに設計文書不足が含まれる | `phase-structure.test.ts` |
| UT-PD-116 | `checkPhaseGate` | changedFilesに実装コードが含まれる場合のフェーズゲートを検証する | Level 3のplan文書が未整備の場合 | PhaseGateResult.passed=falseかつblockersにplan文書不足が含まれる | `phase-structure.test.ts` |
| UT-PD-117 | `checkPhaseGate` | changedFilesに実装コードが含まれる場合のフェーズゲートを検証する | 設計文書・plan文書が全て整備されている場合 | PhaseGateResult.passed=trueを返す | `phase-structure.test.ts` |

### 8.2 AC-PD-03: Level内上流設計未完了時の下流設計拒否

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-118 | `checkPhaseGate` | Level 2内の上流設計依存を検証する | domain_model.md未整備のままlogical_design.mdへ進もうとした場合 | PhaseGateResult.passed=falseかつblockersにdomain_model.md不足が含まれる | `phase-structure.test.ts` |
| UT-PD-119 | `checkPhaseGate` | Level 2内の上流設計依存を検証する | domain_model.md未整備のままunit_test_design.mdへ進もうとした場合 | PhaseGateResult.passed=falseかつblockersにdomain_model.md不足が含まれる | `phase-structure.test.ts` |
| UT-PD-120 | `checkPhaseGate` | Level 3内の上流設計依存を検証する | 上流設計フェーズ未完了のまま下流設計へ進もうとした場合 | PhaseGateResult.passed=falseかつblockersに上流設計不足が含まれる | `phase-structure.test.ts` |

### 8.3 AC-PD-08: モード別inception/*_plan.md成果物処理

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-121 | `checkPhaseGate` | interactiveモードでinception配下のplan成果物を検証する | 対象ノードのplan成果物パスがinception/配下に解決される場合 | PhaseGateResult.passed=trueかつplan成果物パスがinception/{unit}/*_plan.mdとして解決される | `phase-structure.test.ts` |
| UT-PD-122 | `checkPhaseGate` | embedded-qaモードでinception配下のplan成果物を検証する | 対象ノードのplan成果物パスがinception/配下に解決される場合 | PhaseGateResult.passed=trueかつplan成果物パスがinception/{unit}/*_plan.mdとして解決される | `phase-structure.test.ts` |
| UT-PD-123 | `checkPhaseGate` | interactiveモードでinception配下のplan成果物を検証する | plan成果物がinception/配下に存在しない場合 | PhaseGateResult.passed=falseかつblockersにplan成果物不足が含まれる | `phase-structure.test.ts` |

### 8.4 AC-PD-13: relaxable依存のoverride境界

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-124 | `applyCustomization` | 緩和可能な依存に対するoverride境界を検証する | override=falseで緩和可能な依存を削除しようとした場合 | OverrideRequiredErrorをスローする | `phase-structure.test.ts` |
| UT-PD-125 | `applyCustomization` | 緩和可能な依存に対するoverride境界を検証する | override=trueで緩和可能な依存を削除した場合 | ポリシーが正常に適用され監査ペイロードが返却される | `phase-structure.test.ts` |
| UT-PD-126 | `applyCustomization` | 緩和可能な依存に対するoverride境界を検証する | override=trueで非緩和依存（Level間依存）を削除しようとした場合 | NonRelaxableDependencyOverrideErrorをスローする（override=trueでも不可） | `phase-structure.test.ts` |

### 8.5 PhaseNode: Level 3成果物の{storyId}制約（負例）

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-127 | `PhaseNode.create` | PhaseNodeを生成する | Level 3でstory scope必須成果物に{storyId}プレースホルダが含まれていない場合 | エラーをスローする（Level 3のstory scope必須成果物には{storyId}が必要） | `phase-structure.test.ts` |

### 8.6 PhaseDependency: recommendsがphase-gate blockerにならない

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-128 | `checkPhaseGate` | recommends依存のみが未充足の場合のフェーズゲートを検証する | requires依存は全て充足しrecommends依存のみ未充足の場合 | PhaseGateResult.passed=trueを返す（recommendsはblockerにならない） | `phase-structure.test.ts` |
| UT-PD-129 | `checkPhaseGate` | recommends依存のみが未充足の場合のフェーズゲートを検証する | requires依存は全て充足しrecommends依存のみ未充足の場合 | PhaseGateResult.warningsにrecommends未充足の警告が含まれる | `phase-structure.test.ts` |

### 8.7 CustomRule: 追加依存のみを表す意味論

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-130 | `CustomRule.create` | CustomRuleの意味論を検証する | actionが既存依存の削除（remove）を指定している場合 | InvalidCustomRuleErrorをスローする（CustomRuleは追加依存のみを表す） | `phase-customization-policy.test.ts` |
| UT-PD-131 | `applyCustomization` | CustomRuleによる依存追加を検証する | CustomRuleで依存追加を適用した場合 | 新しい依存がグラフに追加され、既存依存は変更されない | `phase-structure.test.ts` |

### 8.8 PhaseCustomizationPolicy: preset=default + rules併用時の追加依存解釈

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-132 | `applyCustomization` | preset=defaultとcustomRules併用時のポリシー適用を検証する | preset=defaultかつcustomRulesで依存追加を指定した場合 | 既定依存は維持されたまま、customRulesの依存が追加依存として適用される | `phase-structure.test.ts` |
| UT-PD-133 | `applyCustomization` | preset=defaultとcustomRules併用時のポリシー適用を検証する | preset=defaultかつcustomRulesで依存追加を指定した場合 | 既定依存の削除は行われない（追加依存としてのみ解釈される） | `phase-structure.test.ts` |

---

## 9. ISSUE-001追加分: checkPhaseGate() コンテキスト依存チェック（INV-8, INV-9）

> ISSUE-001（inception側フェーズゲート整備）により追加された不変条件 INV-8, INV-9 に対応するテストケース。
> `checkPhaseGate(targetLevel, evidence, scope?)` の第3引数 `scope` によるコンテキスト依存動作を検証する。

### 9.1 scope未提供時の既存動作維持（INV-9）

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-134 | `checkPhaseGate` | scope未提供時のLevel 3フェーズゲートを検証する | scope引数を省略した場合 | Level 3ノードのrequired=false成果物がチェックされずゲートを通過する | `phase-structure.test.ts` |
| UT-PD-135 | `checkPhaseGate` | scope未提供時のLevel 3フェーズゲートを検証する | scope引数を省略しLevel 2の前提成果物が欠損している場合 | Level 2前提成果物の欠損によりゲートでブロックされる（Level 3 required=false成果物はスキップされるが、Level 2前提チェックは維持） | `phase-structure.test.ts` |

### 9.2 scope.unitIdのみ提供（storyIdなし）時の動作（INV-9）

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-136 | `checkPhaseGate` | scope.unitIdのみ提供時のLevel 3フェーズゲートを検証する | scope.unitIdのみ提供しstoryIdが未定義の場合 | Level 3ノードのrequired=false成果物がチェックされずscope未提供時と同一動作になる | `phase-structure.test.ts` |
| UT-PD-137 | `checkPhaseGate` | scope.unitIdのみ提供時のLevel 3フェーズゲートを検証する | scope.unitIdのみ提供しstoryIdが未定義かつLevel 2の前提成果物が欠損の場合 | Level 2前提成果物の欠損によりゲートでブロックされる | `phase-structure.test.ts` |

### 9.3 scope.storyId提供時のコンテキスト依存チェック（INV-8）

**resolve(scope) によるパス解決**

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-138 | `checkPhaseGate` | scope.storyId提供時のLevel 3成果物パス解決を検証する | scope={unitId:'agent-integration', storyId:'H11-05'}を提供した場合 | Level 3ノードの成果物がresolve(scope)で解決され{unitId}と{storyId}プレースホルダが実値に置換される | `phase-structure.test.ts` |
| UT-PD-139 | `checkPhaseGate` | scope.storyId提供時のLevel 3成果物存在チェックを検証する | resolve済みパスが全て存在する場合 | 該当ノードは完了と判定されゲートを通過する | `phase-structure.test.ts` |
| UT-PD-140 | `checkPhaseGate` | scope.storyId提供時のLevel 3成果物存在チェックを検証する | resolve済みパスが存在しない場合 | 該当ノードは未完了と判定されゲートでブロックされる | `phase-structure.test.ts` |

**未完了ノードに依存するノードのブロック**

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-141 | `checkPhaseGate` | 未完了ノードに依存するノードの成果物書き込みを検証する | 前提ノードが未完了かつそのノードに依存するノードの成果物がターゲットの場合 | ゲートでブロックされblockersに未完了前提ノードの情報が含まれる | `phase-structure.test.ts` |
| UT-PD-142 | `checkPhaseGate` | 未完了ノードに依存するノードの成果物書き込みを検証する | 前提ノードが完了済みかつそのノードに依存するノードの成果物がターゲットの場合 | ゲートを通過する | `phase-structure.test.ts` |

### 9.4 依存グラフに基づくブロックテスト（INV-8 + Level 3依存グラフ）

> Level 3内の依存グラフ:
> `2:logical-designer → 3:logical-designer → 3:scenario-test-designer → 3:scenario-test-logic-designer → 3:implementation-readiness-checker → 3:story-implementor`

**直接依存によるブロック**

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-143 | `checkPhaseGate` | Level 3依存グラフでlogical_design.md未作成時のブロックを検証する | scope.storyId提供時にlogical_design.mdが未作成の場合 | ゲートでブロックされblockersにlogical_design.md不足が含まれる | `phase-structure.test.ts` |
| UT-PD-144 | `checkPhaseGate` | Level 3依存グラフでscenario_test_design.md未作成時のブロックを検証する | scope.storyId提供時にlogical_design.md作成済みだがscenario_test_design.md未作成の場合 | ゲートでブロックされblockersにscenario_test_design.md不足が含まれる | `phase-structure.test.ts` |
| UT-PD-145 | `checkPhaseGate` | Level 3依存グラフでimplementation_readiness未完了時のブロックを検証する | scope.storyId提供時にimplementation-readiness-checker未完了の場合 | ゲートでブロックされblockersにimplementation-readiness-checker未完了が含まれる | `phase-structure.test.ts` |

**推移的依存によるブロック**

> 注: checkPhaseGate() APIにはターゲットノード（書き込み先）の指定がないため、推移的依存のテストは「依存チェーンの起点（logical_design.md）が欠損している場合にゲート全体がブロックされる」ことの検証として統合する。旧UT-PD-147はUT-PD-146と実質同一であったため統合。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-146 | `checkPhaseGate` | Level 3依存グラフで推移的依存によるブロックを検証する | scope.storyId提供時にlogical_design.mdが未作成の場合 | 依存チェーン全体がブロックされblockersにlogical_design.md不足が含まれる | `phase-structure.test.ts` |

**全前提成果物存在時のパス**

> 注: checkPhaseGate() APIにはターゲットノード（書き込み先）の指定がないため、全前提成果物存在時のテストは1つに統合する。旧UT-PD-149はUT-PD-148と実質同一であったため統合。

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-148 | `checkPhaseGate` | Level 3依存グラフで全前提成果物が存在する場合を検証する | scope.storyId提供時に依存チェーン上の全成果物が存在する場合 | ゲートを通過する | `phase-structure.test.ts` |

### 9.5 Artifact.resolve()との連携テスト（PhaseStructure内部使用）

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-150 | `Artifact.resolve` | scope提供時のArtifactパス解決を検証する | resolve({unitId:'agent-integration', storyId:'H11-05'}) を pathRoots 省略で呼び出した場合 | {unit} が 'agent-integration' に、{storyId} が 'H11-05' に置換され、`{designDocsRoot}`/`{inceptionDocsRoot}` はデフォルト値（`docs/product/construction`/`docs/inception`）で展開された実パスが返される（WI-085: 後方互換） | `phase-structure.test.ts` |
| UT-PD-151 | `Artifact.resolve` | scope提供時のArtifactパス解決を検証する | resolve({unitId:'phase-dependency-model', storyId:'H02-01'}) を pathRoots 省略で呼び出した場合 | docs/inception/ 配下の実パスが返される（WI-085: 後方互換、デフォルト inceptionDocsRoot で展開） | `phase-structure.test.ts` |
| UT-PD-152 | `Artifact.resolve` | scope未提供時のArtifactパス解決を検証する | scope を省略または storyId 未指定で呼び出した場合（pathRoots 省略時はデフォルト値で展開） | scope 由来のプレースホルダ（`{unit}` / `{storyId}`）は未解決のまま、`{designDocsRoot}`/`{inceptionDocsRoot}` はデフォルト値で展開されたパスが返される | `phase-structure.test.ts` |
| UT-PD-172 | `Artifact.resolve` | カスタム pathRoots での `{designDocsRoot}` 展開を検証する（WI-085） | path=`'{designDocsRoot}/{unit}/domain_model.md'`, scope={unitId:'phase-dependency-model'}, pathRoots={designDocsRoot:'mydocs/product', inceptionDocsRoot:'mydocs/inception'} で呼び出した場合 | `'mydocs/product/phase-dependency-model/domain_model.md'` が返される | `phase-structure.test.ts` |
| UT-PD-173 | `Artifact.resolve` | カスタム pathRoots での `{inceptionDocsRoot}` 展開を検証する（WI-085） | path=`'{inceptionDocsRoot}/{unit}/{storyId}/logical_design.md'`, scope={unitId:'X', storyId:'H02-01'}, pathRoots={designDocsRoot:'mydocs/product', inceptionDocsRoot:'mydocs/inception'} で呼び出した場合 | `'mydocs/inception/X/H02-01/logical_design.md'` が返される | `phase-structure.test.ts` |
| UT-PD-174 | `Artifact.resolve` | pathRoots 省略時のデフォルト designDocsRoot 展開を検証する（WI-085: 後方互換） | path=`'{designDocsRoot}/{unit}/domain_model.md'`, scope={unitId:'phase-dependency-model'}, pathRoots 省略 | `'docs/product/construction/phase-dependency-model/domain_model.md'` が返される | `phase-structure.test.ts` |
| UT-PD-175 | `Artifact.resolve` | pathRoots 省略時のデフォルト inceptionDocsRoot 展開を検証する（WI-085: 後方互換） | path=`'{inceptionDocsRoot}/_shared/product_overview_plan.md'`, pathRoots 省略 | `'docs/inception/_shared/product_overview_plan.md'` が返される | `phase-structure.test.ts` |
| UT-PD-176 | `Artifact.resolve` | root + unit + storyId プレースホルダ混在の展開を検証する（WI-085） | 全種プレースホルダを含むパス + scope + pathRoots を提供した場合 | 全プレースホルダが対応する実値で展開された解決済みパスが返される | `phase-structure.test.ts` |
| UT-PD-177 | `Artifact.resolve` | required=true で `{unit}` 未提供時の未解決検知を検証する（WI-085） | required=true の Artifact について scope.unitId 未提供で resolve を呼び出した場合 | InvalidArtifactPathError をスローする（既存の未解決プレースホルダ検知挙動） | `phase-structure.test.ts` |

### 9.6 H02-04 `@work-item-id` アノテーション併存対応

対象: `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation`（infrastructure 層）

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-153 | `fileContainsStoryAnnotation` | `@issue-id` 検出を検証する | product 文書に `@issue-id ISSUE-026` がある場合 | true を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-154 | `fileContainsStoryAnnotation` | `@work-item-id` 検出を検証する | product 文書に `@work-item-id WI-001` がある場合 | true を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-155 | `fileContainsStoryAnnotation` | `@work-item-id` を HTML コメントで検出する | `<!-- @work-item-id WI-001 -->` がある場合 | true を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-156 | `fileContainsStoryAnnotation` | `@work-item-id` のカンマ区切り複数 ID を検出する | `@work-item-id WI-001, WI-002, WI-003` がある場合 | 指定した各 ID について true を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-157 | `fileContainsStoryAnnotation` | 異なるアノテーション種別が混在しても独立検出できる | `@story-id H02-04` と `@work-item-id WI-001` が同一ファイルにある場合 | いずれの ID でも true を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-158 | `fileContainsStoryAnnotation` | 未知 ID は検出されない | `@work-item-id WI-001` のみある状態で存在しない ID を問い合わせた場合 | false を返す | `file-system-story-reflection-adapter.test.ts` |

### 9.7 H02-05 WI-aware story reflection listing

対象: `FileSystemStoryReflectionAdapter#listStoryDirectories`

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-159 | `listStoryDirectories` | WI layout の列挙を検証する | `docs/inception/{unit}/WI-001` がある場合 | `WI-001` を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-160 | 同上 | cross WI の列挙を検証する | `docs/inception/_cross/WI-026` がある場合 | `WI-026` を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-161 | 同上 | 旧issuesディレクトリ除外を検証する | `docs/inception/{unit}/issues/ISSUE-001` がある場合 | `issues` / `ISSUE-001` を返さない | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-162 | 同上 | `_cross` の非WI除外を検証する | `docs/inception/_cross/memo` がある場合 | `memo` を返さない | `file-system-story-reflection-adapter.test.ts` |

### 9.8 H02-06 WI frontmatter affects-aware story reflection

対象: `StoryReflectionChecker`, `FileSystemStoryReflectionAdapter#storyAffectsUnit`

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-163 | `StoryReflectionChecker` | cross WI の実在パス解決を検証する | `_cross/WI-026/logical_design.md` が存在し `storyAffectsUnit=true` の場合 | product未反映なら violation を返す | `story-reflection-checker.test.ts` |
| UT-PD-164 | `StoryReflectionChecker` | cross WI の対象Unit絞り込みを検証する | `_cross/WI-026/logical_design.md` が存在し `storyAffectsUnit=false` の場合 | 対象外として pass | `story-reflection-checker.test.ts` |
| UT-PD-165 | `storyAffectsUnit` | affects frontmatter を検出する | `affects: [order, billing]` がある場合 | `order` に true を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-166 | `storyAffectsUnit` | affects 対象外を検出する | `affects: [order]` がある場合 | `billing` に false を返す | `file-system-story-reflection-adapter.test.ts` |

### 9.9 H02-07 WI annotation legacy compatibility

対象: `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation`

| ケースID | target | describe | context | it（期待値） | テストファイル |
|---------|--------|----------|---------|------------|-------------|
| UT-PD-167 | `fileContainsStoryAnnotation` | legacy_id 経由の旧issue annotation検出 | `legacy_id: ISSUE-001` と product `@issue-id ISSUE-001` がある場合 | `WI-001` に true を返す | `file-system-story-reflection-adapter.test.ts` |
| UT-PD-168 | 同上 | legacy_id 不在時の誤検出防止 | product `@issue-id ISSUE-001` のみある場合 | `WI-001` に false を返す | `file-system-story-reflection-adapter.test.ts` |

---

## テストケース総数

| 分類 | ケース数 |
|------|---------|
| PhaseStructure集約 | 35件（UT-PD-001〜035） |
| 値オブジェクト（9種） | 53件（UT-PD-036〜088） |
| 境界値・異常系 | 26件（UT-PD-089〜114） |
| カバレッジギャップ補強 | 19件（UT-PD-115〜133） |
| ISSUE-001追加: コンテキスト依存チェック（INV-8, INV-9） | 17件（UT-PD-134〜152、UT-PD-147/149統合により2件減） |
| H02-04 `@work-item-id` アノテーション併存対応 | 6件（UT-PD-153〜158） |
| H02-05 WI-aware story reflection listing | 4件（UT-PD-159〜162） |
| H02-06 WI frontmatter affects-aware story reflection | 4件（UT-PD-163〜166） |
| H02-07 WI annotation legacy compatibility | 2件（UT-PD-167〜168） |
| **合計** | **166件** |

> 注: 境界値・異常系のケース（セクション6）は、セクション3・4のケースと一部重複する参照関係を持つ。実装時にはテストファイル内で適切なdescribe/contextグループに統合すること。
> 注: ISSUE-001追加分（セクション9）はcheckPhaseGateのscope引数に関するテストであり、セクション3.2の既存checkPhaseGateテストと同一テストファイル内のdescribeブロックに統合可能。
