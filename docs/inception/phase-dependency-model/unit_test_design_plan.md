# ユニットテスト設計計画: phase-dependency-model

> **作成日**: 2026-03-13
> **対応ストーリー**: H02-01, H02-02, H02-03
> **正規ソース**: `docs/product/construction/phase-dependency-model/domain_model.md`

---

## QA

Q: A-4 インフラ層追加のユニットテストは本計画のスコープに含むか？
A: 含む。`HarnessConfigPhaseConfigProvider` の preset マッピング + storyReflection パース、および `FileSystemStoryReflectionAdapter` の tmp ディレクトリ I/O テストをユニットテスト枠で実装する。詳細ロジックは `unit_test_logic_plan.md` に記載。

Q: 既存ユニットテストへの影響は？
A: 無影響。`PhaseConfigProviderPort` に `getStoryReflectionConfig()` を追加するだけで、既存 VO・集約テストはそのまま。

## 1. スコープ

- 対象Unit: phase-dependency-model
- ドメインモデルに定義された集約・値オブジェクト・ドメインエラーの全コンポーネントが対象
- ドメインサービスは存在しない（PhaseStructure集約が検証ロジックを内包）

### テスト対象コンポーネント一覧

| 分類 | コンポーネント | テストファイル |
|------|-------------|-------------|
| 集約 | PhaseStructure | `phase-structure.test.ts` |
| 値オブジェクト | PhaseLevel | `phase-structure.test.ts` 内で検証 |
| 値オブジェクト | Artifact | `phase-structure.test.ts` 内で検証 |
| 値オブジェクト | PhaseNode | `phase-structure.test.ts` 内で検証 |
| 値オブジェクト | PhaseDependency | `phase-structure.test.ts` 内で検証 |
| 値オブジェクト | PlanningMode | `planning-mode.test.ts` |
| 値オブジェクト | PlanEvidence | `phase-structure.test.ts` 内で検証 |
| 値オブジェクト | CustomRule | `phase-customization-policy.test.ts` 内で検証 |
| 値オブジェクト | PhaseCustomizationPolicy | `phase-customization-policy.test.ts` |
| 値オブジェクト | PhaseGateResult | `phase-structure.test.ts` 内で検証 |

---

## 2. テスト対象分析

### 集約

| 集約名 | 不変条件数 | 状態遷移数 | テストケース概算 |
|--------|----------|----------|---------------|
| PhaseStructure | 7 (INV-1〜INV-7) | 1フロー（checkPhaseGateの判定フロー） | 35〜45件 |

**PhaseStructure メソッド別テストケース内訳**:

| メソッド | 正常系 | 異常系 | 概算 |
|---------|--------|--------|------|
| `createDefault(policy)` | 3 | 3 (InvalidCustomRuleError, NonRelaxableDependencyOverrideError, CyclicPhaseDependencyError) | 6 |
| `checkPhaseGate(targetLevel, evidence)` | 5 | 6 (INV-1〜INV-5違反, InvalidPhaseLevelError) | 11 |
| `getPhaseNodes(level)` | 3 | 1 (InvalidPhaseLevelError) | 4 |
| `buildDependencyGraph()` | 2 | 0 | 2 |
| `applyCustomization(policy)` | 3 | 3 (InvalidCustomRuleError, NonRelaxableDependencyOverrideError, CyclicPhaseDependencyError) | 6 |

**不変条件別テストケース**:

| 不変条件 | テストケース概算 |
|---------|---------------|
| INV-1: Level 2開始にはLevel 1前提成果物が全存在 | 3 |
| INV-2: Level 3開始にはLevel 2前提成果物が全存在 | 3 |
| INV-3: Level間依存は緩和不可 | 2 |
| INV-4: interactive時、plan文書にQAセクション存在 | 2 |
| INV-5: embedded-qa時、対話的Q&A完了 | 2 |
| INV-6: override=trueでもLevel間依存とTDD最低保証は緩和不可 | 2 |
| INV-7: override=true適用時に監査ペイロード返却 | 2 |

### エンティティ

ドメインモデルにエンティティは定義されていない。

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| PhaseLevel | 制約2件（生成ルール1件: 1/2/3のみ許可 + バリデーション1件: Level 1は起点・Level 3は終点）、振る舞い3件（isHigherThan, isPrerequisiteOf, equals） | 8 |
| Artifact | 3 (pathはdocs/始まり, 空文字不可, `required === true` の成果物のみresolve()後の未解決プレースホルダ禁止) | 7 |
| PhaseNode | 2 (skillName空文字不可, Level 3のstoryIdプレースホルダ)。「同一Level重複不可」はPhaseNode単体では検証不可であり、PhaseStructure集約の不変条件として `nodeIndex` によるキー重複検出で保証される（PhaseStructure集約テストで検証） | 6 |
| PhaseDependency | 2 (自己依存不可, type制約) | 5 |
| PlanningMode | 2 (interactive/embedded-qaのみ, fromConfig変換) | 5 |
| PlanEvidence | 2 (exists=falseなら残り2属性もfalse, planningModeMatch=trueならexists=true) | 5 |
| CustomRule | 2 (targetPhase空文字不可, action1件以上) | 4 |
| PhaseCustomizationPolicy | 2 (preset制約, overrideEnabled制約) | 5 |
| PhaseGateResult | 2 (passed=falseならblockers>=1, auditPayload条件) | 5 |

### ドメインサービス

ドメインモデルにドメインサービスは定義されていない。

---

## 3. テスト方針

### 正常系/異常系のバランス

- 各値オブジェクトの生成規則に対して正常系1件以上 + 異常系1件以上を設ける
- PhaseStructure集約の不変条件（INV-1〜INV-7）は正常系・異常系ともに必ず検証する
- ドメインエラー7種（InvalidPhaseLevelError, InvalidPlanningModeError, InvalidArtifactPathError, InvalidPhaseDependencyError, InvalidCustomRuleError, NonRelaxableDependencyOverrideError, CyclicPhaseDependencyError）はすべて発生条件を検証する

### 境界値テストの対象

- PhaseLevel: 0, 1, 2, 3, 4（境界: 1と3）。生成ルール（1/2/3のみ許可）と構造的バリデーション（Level 1起点/Level 3終点）の両方を境界値で検証する
- Artifact.path: 空文字, "docs/", "docs/valid.md", "src/invalid.md"
- CustomRule.action: 空配列, 1件, 複数件
- PlanEvidence: exists=false時の残り属性組合せ

### テスト規約

- **ドメイン実体のモック禁止**: 値オブジェクトと集約は実体で検証する。テストダブルは一切使用しない
- **AAAパターン**: 全テストケースでArrange/Act/Assertを明記する
- **テストケース名は日本語**: 何も知らない開発者が読んでわかる表現にする
- **実行結果はactualに代入**: `const actual = ...` で統一する
- **describe/it構造**: target/describe/context/itパターンを使用する
- **ファイル名**: kebab-caseで統一する

### テストファイル構成

| テストファイル | テスト対象 |
|-------------|----------|
| `phase-structure.test.ts` | PhaseStructure集約（PhaseLevel, PhaseNode, Artifact, PhaseDependency, PlanEvidence, PhaseGateResultの生成・検証含む） |
| `planning-mode.test.ts` | PlanningMode値オブジェクト |
| `phase-customization-policy.test.ts` | PhaseCustomizationPolicy, CustomRule値オブジェクト |

### テスト構造例

```
target('createDefault', () => {
  describe('デフォルトポリシーでPhaseStructureを構築する', () => {
    it('3層のフェーズノードと既定依存関係を持つPhaseStructureが生成される', ...);
    context('カスタムルールが未知ノードを参照している場合', () => {
      it('InvalidCustomRuleErrorをスローする', ...);
    });
  });
});
```

---

## 4. QA（不明点・確認事項）

- なし（ドメインモデルに十分な定義がある）

---

## 5. 前提条件・リスク

### 前提条件

- `domain/definitions/default-phase-nodes.ts` と `default-phase-dependencies.ts` の静的定義が実装済みであること
- ドメインエラー7種が実装済みであること

### リスク

- PhaseStructure集約の不変条件テストは、静的定義（ノード一覧・既定依存）の量に比例してテストデータの準備が大きくなる可能性がある。テストヘルパーやファクトリ関数での共通化を検討すること
