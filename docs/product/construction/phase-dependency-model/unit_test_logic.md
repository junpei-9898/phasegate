# ユニットテストロジック設計: phase-dependency-model

> 対象ケース: `UT-PD-001` 〜 `UT-PD-114`, `UT-PD-134` 〜 `UT-PD-152`（ISSUE-001追加分）
> 正規ケース定義: `docs/product/construction/phase-dependency-model/unit_test_design.md`
> 参照: `docs/product/construction/phase-dependency-model/domain_model.md`, `docs/product/construction/phase-dependency-model/coverage_report.md`
> 対応Issue: ISSUE-001

`coverage_report.md` で指摘されている `AC-PD-03` / `AC-PD-04` / `AC-PD-08` / `AC-PD-13` などの未カバー項目は、現時点で `unit_test_design.md` に対応する `UT-PD-*` が未定義のため本書の対象外とする。本書は `unit_test_design.md` に存在するケースIDのみを実装対象とする。

`domain_model.md` のクラス図では `applyCustomization(policy): void` と読める一方、`unit_test_design.md` の `UT-PD-030` / `UT-PD-031` は監査ペイロード返却を要求している。本書では `unit_test_design.md` を優先し、`applyCustomization()` の戻り値、または適用直後に取得できる適用結果オブジェクトを `actual` として扱う前提で疑似コードを記述する。

## 1. テストファイル構成
| ファイルパス | 対象モデル | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/phase-dependency-model/phase-structure.test.ts` | `PhaseStructure`, `PhaseLevel`, `Artifact`, `PhaseNode`, `PhaseDependency`, `PlanEvidence`, `PhaseGateResult` | 95 |
| `scripts/harness/__tests__/phase-dependency-model/planning-mode.test.ts` | `PlanningMode` | 5 |
| `scripts/harness/__tests__/phase-dependency-model/phase-customization-policy.test.ts` | `CustomRule`, `PhaseCustomizationPolicy` | 12 |

実装方針は以下に統一する。

- テストケース名はすべて日本語で記述する
- `target()` と `context()` は `describe()` のエイリアスとして扱う
- すべての `it()` は `// Arrange` / `// Act` / `// Assert` を明記する
- Act の戻り値は必ず `actual` に代入する
- `beforeEach` に暗黙の Arrange を置かず、各ケース内で必要なデータだけを組み立てる
- ドメイン実体にモックは使わず、実体ファクトリと静的定義を利用する

## 2. 共通ヘルパー・ファクトリ

### 2.1 共通 import とエイリアス

```ts
import { describe, expect, it } from 'vitest';
import { target, context } from '../helpers/bdd-alias';
import { PhaseStructure } from '@/scripts/harness/domain/phase-dependency-model/phase-structure';
import { PhaseLevel } from '@/scripts/harness/domain/phase-dependency-model/phase-level';
import { Artifact } from '@/scripts/harness/domain/phase-dependency-model/artifact';
import { PhaseNode } from '@/scripts/harness/domain/phase-dependency-model/phase-node';
import { PhaseDependency } from '@/scripts/harness/domain/phase-dependency-model/phase-dependency';
import { PlanningMode } from '@/scripts/harness/domain/phase-dependency-model/planning-mode';
import { PlanEvidence } from '@/scripts/harness/domain/phase-dependency-model/plan-evidence';
import { CustomRule } from '@/scripts/harness/domain/phase-dependency-model/custom-rule';
import { PhaseCustomizationPolicy } from '@/scripts/harness/domain/phase-dependency-model/phase-customization-policy';
import { PhaseGateResult } from '@/scripts/harness/domain/phase-dependency-model/phase-gate-result';
import {
  InvalidArtifactPathError,
  InvalidCustomRuleError,
  InvalidPhaseDependencyError,
  InvalidPhaseLevelError,
  InvalidPlanningModeError,
  NonRelaxableDependencyOverrideError,
  CyclicPhaseDependencyError,
} from '@/scripts/harness/domain/phase-dependency-model/errors';
```

### 2.2 ファクトリ一覧
| ヘルパー | 用途 | 既定値 |
|---|---|---|
| `createPhaseLevel(value = 1)` | `PhaseLevel.create()` を簡潔に呼ぶ | `1` |
| `createArtifact(overrides?)` | `Artifact.create()` の最小有効入力を供給する | `name: "artifact"`, `path: "docs/product/construction/phase-dependency-model/domain_model.md"`, `required: true` |
| `createPhaseNode(overrides?)` | `PhaseNode.create()` 用の有効ノードを生成する | `skillName: "domain-designer"`, `artifacts: [createArtifact()]`, `level: createPhaseLevel(2)` |
| `createPhaseDependency(overrides?)` | `PhaseDependency.create()` 用の有効依存を生成する | `from: level2Node`, `to: level1Node`, `type: "requires"` |
| `createPlanEvidence(overrides?)` | `PlanEvidence.create()` 用の有効証跡を生成する | `exists: true`, `qaComplete: true`, `planningModeMatch: true` |
| `createCustomRule(overrides?)` | `CustomRule.create()` 用の有効ルールを生成する | `targetPhase: "level-2"`, `condition: "when target node exists"`, `action: ["add-dependency"]` |
| `createPhaseCustomizationPolicy(overrides?)` | `PhaseCustomizationPolicy.create()` を簡潔に呼ぶ | `rules: []`, `overrideEnabled: false` |
| `createDefaultPhaseStructure(policyOverrides?)` | 静的定義を使って既定の `PhaseStructure` を生成する | `PhaseCustomizationPolicy.create({ rules: [], overrideEnabled: false })` |
| `createGateEvidence(overrides?)` | `checkPhaseGate()` に渡す証跡マップを生成する | 前提成果物は全存在、plan 証跡は有効 |
| `expectFailedResult(actual, expectedFragments)` | `PhaseGateResult` の blocker 検証を共通化する | `passed === false` と blocker 部分一致 |
| `expectAuditPayload(actual, expectedRuleCount)` | override 適用時の監査ペイロード検証を共通化する | ルール一覧、タイムスタンプ、override 有無 |

### 2.3 推奨ファクトリ疑似コード

```ts
function createArtifact(overrides = {}) {
  return Artifact.create({
    name: 'artifact',
    path: 'docs/product/construction/phase-dependency-model/domain_model.md',
    required: true,
    ...overrides,
  });
}

function createPhaseNode(overrides = {}) {
  return PhaseNode.create({
    skillName: 'domain-designer',
    artifacts: [createArtifact()],
    level: createPhaseLevel(2),
    ...overrides,
  });
}

function createGateEvidence(overrides = {}) {
  return {
    artifactExistenceByPath: new Map(),
    planEvidenceByNodeKey: new Map(),
    planningMode: PlanningMode.create('interactive'),
    ...overrides,
  };
}
```

### 2.4 テーブル駆動の基本形

```ts
it.each(cases)('$title', ({ arrange, expected }) => {
  // Arrange
  const sut = arrange.sut();
  const input = arrange.input();

  // Act
  const actual = arrange.act(sut, input);

  // Assert
  expected(actual);
});
```

## 3. テストケース詳細ロジック

### 3.1 `phase-structure.test.ts`

#### 3.1.1 `target('createDefault')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-001 | 3層のフェーズノードと既定依存関係を持つPhaseStructureが生成される | ルールなしポリシーを用意する | `PhaseStructure.createDefault(policy)` | Level 1/2/3 のノード配列が空でなく、依存グラフの edge が存在する |
| UT-PD-002 | Level 1にproduct-wide計画スキルのフェーズノードが含まれる | ルールなしポリシーを用意する | 同上 | `getPhaseNodes(Level 1)` に product-wide 計画スキルが含まれる |
| UT-PD-003 | Level 2→Level 1、Level 3→Level 2の既定依存関係が設定される | ルールなしポリシーを用意する | 同上 | 依存グラフに `requires` の Level 間 edge が含まれる |
| UT-PD-004 | カスタムルールが存在しないフェーズノードを参照している場合はInvalidCustomRuleErrorをスローする | 未知ノード名を参照する `CustomRule` を作る | `() => PhaseStructure.createDefault(policy)` | `InvalidCustomRuleError` |
| UT-PD-005 | カスタムルールがLevel間依存を緩和しようとしている場合はNonRelaxableDependencyOverrideErrorをスローする | Level 2→1 または Level 3→2 を削除するルールを作る | 同上 | `NonRelaxableDependencyOverrideError` |
| UT-PD-006 | カスタムルール適用後に循環依存が発生する場合はCyclicPhaseDependencyErrorをスローする | Level 1←2 に加え逆向き依存を追加するルールを作る | 同上 | `CyclicPhaseDependencyError` |

```ts
target('createDefault', () => {
  describe('デフォルトポリシーでPhaseStructureを構築する', () => {
    it('3層のフェーズノードと既定依存関係を持つPhaseStructureが生成される', () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy();

      // Act
      const actual = PhaseStructure.createDefault(policy);

      // Assert
      expect(actual.getPhaseNodes(createPhaseLevel(1))).not.toHaveLength(0);
      expect(actual.getPhaseNodes(createPhaseLevel(2))).not.toHaveLength(0);
      expect(actual.getPhaseNodes(createPhaseLevel(3))).not.toHaveLength(0);
      expect(actual.buildDependencyGraph().edges).not.toHaveLength(0);
    });

    context('カスタムルールが存在しないフェーズノードを参照している場合', () => {
      it('InvalidCustomRuleErrorをスローする', () => {
        // Arrange
        const policy = createPhaseCustomizationPolicy({
          rules: [createCustomRule({ targetPhase: 'unknown-phase' })],
        });

        // Act
        const actual = () => PhaseStructure.createDefault(policy);

        // Assert
        expect(actual).toThrowError(InvalidCustomRuleError);
      });
    });
  });
});
```

#### 3.1.2 `target('checkPhaseGate')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-007 | Level 1の前提成果物が全て存在する場合はPhaseGateResult.passed=trueを返す | Level 2 対象、Level 1 成果物を全存在にした evidence を作る | `sut.checkPhaseGate(Level 2, evidence)` | `passed === true`, `blockers === []` |
| UT-PD-008 | Level 1の前提成果物が一部欠損している場合はPhaseGateResult.passed=falseかつblockersに欠損成果物が含まれる | Level 1 成果物の一部だけ `false` にする | 同上 | 欠損 artifact path が blocker に含まれる |
| UT-PD-009 | Level 1の前提成果物が全て欠損している場合はPhaseGateResult.passed=falseかつblockersに全欠損成果物が含まれる | Level 1 成果物を全て `false` にする | 同上 | 全 path が blocker に含まれる |
| UT-PD-010 | Level 2の前提成果物が全て存在する場合はPhaseGateResult.passed=trueを返す | Level 3 対象、Level 2 成果物を全存在にする | `sut.checkPhaseGate(Level 3, evidence)` | `passed === true` |
| UT-PD-011 | Level 2の前提成果物が一部欠損している場合はPhaseGateResult.passed=falseかつblockersに欠損成果物が含まれる | Level 2 成果物の一部だけ `false` にする | 同上 | 欠損 artifact path が blocker に含まれる |
| UT-PD-012 | Level 2の前提成果物が全て欠損している場合はPhaseGateResult.passed=falseかつblockersに全欠損成果物が含まれる | Level 2 成果物を全て `false` にする | 同上 | 全 path が blocker に含まれる |
| UT-PD-013 | plan文書にQAセクションが存在する場合はPhaseGateResult.passed=trueを返す | `planningMode: interactive`, `PlanEvidence.exists=true`, `qaComplete=true` を用意する | `sut.checkPhaseGate(Level 2, evidence)` | `passed === true` |
| UT-PD-014 | plan文書にQAセクションが存在しない場合はPhaseGateResult.passed=falseかつblockersにQAセクション不足が含まれる | `planningMode: interactive`, `qaComplete=false` を用意する | 同上 | blocker に QA セクション不足メッセージが含まれる |
| UT-PD-015 | 対話的Q&Aが完了している場合はPhaseGateResult.passed=trueを返す | `planningMode: embedded-qa`, `PlanEvidence.planningModeMatch=true`, `qaComplete=true` を用意する | 同上 | `passed === true` |
| UT-PD-016 | 対話的Q&Aが未完了の場合はPhaseGateResult.passed=falseかつblockersにQ&A未完了が含まれる | `planningMode: embedded-qa`, `qaComplete=false` を用意する | 同上 | blocker に Q&A 未完了メッセージが含まれる |
| UT-PD-017 | Level 1は起点のため前提条件なしでPhaseGateResult.passed=trueを返す | Level 1 用の空 evidence を作る | `sut.checkPhaseGate(Level 1, evidence)` | `passed === true`, `blockers === []` |
| UT-PD-018 | 無効なPhaseLevelが指定された場合はInvalidPhaseLevelErrorをスローする | `PhaseLevel` の不正入力を用意する | `() => sut.checkPhaseGate(invalidLevel, evidence)` | `InvalidPhaseLevelError` |

```ts
target('checkPhaseGate', () => {
  describe('フェーズゲートを検証する', () => {
    const artifactCases = [
      {
        title: 'Level 1の前提成果物が全て存在する場合はPhaseGateResult.passed=trueを返す',
        targetLevel: 2,
        prerequisiteLevel: 1,
        artifactState: 'all',
        expectedPassed: true,
        expectedBlockers: [],
      },
      {
        title: 'Level 1の前提成果物が一部欠損している場合はPhaseGateResult.passed=falseかつblockersに欠損成果物が含まれる',
        targetLevel: 2,
        prerequisiteLevel: 1,
        artifactState: 'partial',
        expectedPassed: false,
        expectedBlockers: ['domain_model.md'],
      },
    ];

    it.each(artifactCases)('$title', ({ targetLevel, prerequisiteLevel, artifactState, expectedPassed, expectedBlockers }) => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const evidence = createGateEvidence({
        artifactExistenceByPath: createPrerequisiteArtifactMap({
          prerequisiteLevel,
          state: artifactState,
        }),
      });

      // Act
      const actual = sut.checkPhaseGate(createPhaseLevel(targetLevel), evidence);

      // Assert
      if (expectedPassed) {
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      } else {
        expectFailedResult(actual, expectedBlockers);
      }
    });

    context('PlanningMode=interactiveの場合', () => {
      it('plan文書にQAセクションが存在しない場合はPhaseGateResult.passed=falseかつblockersにQAセクション不足が含まれる', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const evidence = createGateEvidence({
          planningMode: PlanningMode.create('interactive'),
          planEvidenceByNodeKey: createInteractivePlanEvidenceMap({
            qaComplete: false,
          }),
        });

        // Act
        const actual = sut.checkPhaseGate(createPhaseLevel(2), evidence);

        // Assert
        expectFailedResult(actual, ['QA']);
      });
    });
  });
});
```

#### 3.1.3 `target('getPhaseNodes')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-019 | Level 1を指定した場合はLevel 1に属するフェーズノードの配列を返す | 既定 `PhaseStructure` を作る | `sut.getPhaseNodes(Level 1)` | 全ノードの `level` が `1` |
| UT-PD-020 | Level 2を指定した場合はLevel 2に属するフェーズノードの配列を返す | 同上 | `sut.getPhaseNodes(Level 2)` | 全ノードの `level` が `2` |
| UT-PD-021 | Level 3を指定した場合はLevel 3に属するフェーズノードの配列を返す | 同上 | `sut.getPhaseNodes(Level 3)` | 全ノードの `level` が `3` |
| UT-PD-022 | 無効なPhaseLevelが指定された場合はInvalidPhaseLevelErrorをスローする | 不正 Level を用意する | `() => sut.getPhaseNodes(invalidLevel)` | `InvalidPhaseLevelError` |

#### 3.1.4 `target('buildDependencyGraph')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-023 | 全依存関係を含むグラフ構造を返す | 既定 `PhaseStructure` を作る | `sut.buildDependencyGraph()` | `nodes` と `edges` が既定依存数を満たす |
| UT-PD-024 | Level間依存がrequires型で含まれる | 同上 | 同上 | `edges` に `type === "requires"` かつ Level 間 edge が含まれる |

#### 3.1.5 `target('applyCustomization')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-025 | Level間依存を緩和しないルールの場合はポリシーが正常に適用される | 追加依存だけを持つ `policy` を作る | `sut.applyCustomization(policy)` | 例外なし、依存数が増える |
| UT-PD-026 | Level間依存を緩和するルールの場合はNonRelaxableDependencyOverrideErrorをスローする | Level 間 `requires` を削除するルールを作る | `() => sut.applyCustomization(policy)` | `NonRelaxableDependencyOverrideError` |
| UT-PD-027 | override=trueでLevel間依存を緩和しようとした場合はNonRelaxableDependencyOverrideErrorをスローする | `overrideEnabled: true` かつ Level 間削除ルールを作る | 同上 | `NonRelaxableDependencyOverrideError` |
| UT-PD-028 | override=trueでTDD最低保証を緩和しようとした場合はNonRelaxableDependencyOverrideErrorをスローする | `story-implementor` 前の test design 依存を外すルールを作る | 同上 | `NonRelaxableDependencyOverrideError` |
| UT-PD-029 | 緩和可能な制約のみを緩和する場合はポリシーが正常に適用される | `overrideEnabled: true` かつ追加依存のみのルールを作る | `sut.applyCustomization(policy)` | 例外なし、適用済み依存が増える |
| UT-PD-030 | 緩和可能な制約を緩和した場合は監査ペイロードが返却される | `UT-PD-029` と同じ policy を用意する | 同上 | `auditPayload` が存在する |
| UT-PD-031 | 緩和可能な制約を緩和した場合は監査ペイロードに適用されたルールとタイムスタンプが含まれる | `UT-PD-029` と同じ policy を用意する | 同上 | `auditPayload.rules`, `auditPayload.timestamp` を検証する |
| UT-PD-032 | カスタムルールが存在しないフェーズノードを参照している場合はInvalidCustomRuleErrorをスローする | 未知ノード参照ルールを作る | `() => sut.applyCustomization(policy)` | `InvalidCustomRuleError` |
| UT-PD-033 | カスタムルール適用後に循環依存が発生する場合はCyclicPhaseDependencyErrorをスローする | 循環 edge を作るルールを用意する | 同上 | `CyclicPhaseDependencyError` |

```ts
target('applyCustomization', () => {
  describe('カスタマイズポリシーを適用する', () => {
    it('Level間依存を緩和しないルールの場合はポリシーが正常に適用される', () => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const policy = createPhaseCustomizationPolicy({
        rules: [createAdditiveRule()],
      });

      // Act
      const actual = sut.applyCustomization(policy);

      // Assert
      expect(actual).toBeDefined();
      expect(sut.buildDependencyGraph().edges.length).toBeGreaterThan(DEFAULT_EDGE_COUNT);
    });

    context('override=trueで緩和可能な制約を緩和した場合', () => {
      it('監査ペイロードに適用されたルールとタイムスタンプが含まれる', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          overrideEnabled: true,
          rules: [createAdditiveRule()],
        });

        // Act
        const actual = sut.applyCustomization(policy);

        // Assert
        expectAuditPayload(actual, 1);
      });
    });
  });
});
```

#### 3.1.6 `target('getDependencies')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-034 | 依存先が存在するノードを指定した場合は該当する依存関係の配列を返す | 依存を持つ node を特定する | `sut.getDependencies(node)` | 配列が空でなく、すべて `from` が指定 node |
| UT-PD-035 | 依存先が存在しないノードを指定した場合は空配列を返す | 末端 node を作る、または既定ノードから選ぶ | 同上 | `[]` |

#### 3.1.7 `target('PhaseLevel.create' / 'isHigherThan' / 'isPrerequisiteOf' / 'equals')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-036 | 値が1の場合はPhaseLevel(1)が生成される | 入力 `1` を用意する | `PhaseLevel.create(1)` | `value === 1` |
| UT-PD-037 | 値が2の場合はPhaseLevel(2)が生成される | 入力 `2` | `PhaseLevel.create(2)` | `value === 2` |
| UT-PD-038 | 値が3の場合はPhaseLevel(3)が生成される | 入力 `3` | `PhaseLevel.create(3)` | `value === 3` |
| UT-PD-039 | 値が0の場合はInvalidPhaseLevelErrorをスローする | 入力 `0` | `() => PhaseLevel.create(0)` | `InvalidPhaseLevelError` |
| UT-PD-040 | 値が4の場合はInvalidPhaseLevelErrorをスローする | 入力 `4` | 同上 | `InvalidPhaseLevelError` |
| UT-PD-041 | Level 2とLevel 1を比較した場合はtrueを返す | `level2`, `level1` を作る | `level2.isHigherThan(level1)` | `true` |
| UT-PD-042 | Level 1とLevel 2を比較した場合はfalseを返す | `level1`, `level2` を作る | `level1.isHigherThan(level2)` | `false` |
| UT-PD-043 | Level 1がLevel 2の前提かを判定した場合はtrueを返す | `level1`, `level2` を作る | `level1.isPrerequisiteOf(level2)` | `true` |
| UT-PD-044 | Level 2がLevel 1の前提かを判定した場合はfalseを返す | `level2`, `level1` を作る | `level2.isPrerequisiteOf(level1)` | `false` |
| UT-PD-045 | 同一値のPhaseLevelを比較した場合はtrueを返す | `PhaseLevel(2)` を2つ作る | `left.equals(right)` | `true` |
| UT-PD-046 | 異なる値のPhaseLevelを比較した場合はfalseを返す | `PhaseLevel(1)`, `PhaseLevel(2)` を作る | `left.equals(right)` | `false` |
| UT-PD-089 | 0を指定した場合はInvalidPhaseLevelErrorをスローする | 入力 `0` を用意する | `() => PhaseLevel.create(0)` | `InvalidPhaseLevelError` |
| UT-PD-090 | 1を指定した場合は正常生成される | 入力 `1` | `PhaseLevel.create(1)` | `value === 1` |
| UT-PD-091 | 3を指定した場合は正常生成される | 入力 `3` | `PhaseLevel.create(3)` | `value === 3` |
| UT-PD-092 | 4を指定した場合はInvalidPhaseLevelErrorをスローする | 入力 `4` | `() => PhaseLevel.create(4)` | `InvalidPhaseLevelError` |
| UT-PD-093 | -1を指定した場合はInvalidPhaseLevelErrorをスローする | 入力 `-1` | `() => PhaseLevel.create(-1)` | `InvalidPhaseLevelError` |
| UT-PD-094 | 1.5を指定した場合はInvalidPhaseLevelErrorをスローする | 入力 `1.5` | `() => PhaseLevel.create(1.5)` | `InvalidPhaseLevelError` |

```ts
target('PhaseLevel.create', () => {
  describe('PhaseLevelを生成する', () => {
    it.each([
      { title: '値が1の場合はPhaseLevel(1)が生成される', input: 1, expected: 1 },
      { title: '値が2の場合はPhaseLevel(2)が生成される', input: 2, expected: 2 },
      { title: '値が3の場合はPhaseLevel(3)が生成される', input: 3, expected: 3 },
      { title: '1を指定した場合は正常生成される', input: 1, expected: 1 },
      { title: '3を指定した場合は正常生成される', input: 3, expected: 3 },
    ])('$title', ({ input, expected }) => {
      // Arrange
      const value = input;

      // Act
      const actual = PhaseLevel.create(value);

      // Assert
      expect(actual.value).toBe(expected);
    });

    it.each([
      { title: '値が0の場合はInvalidPhaseLevelErrorをスローする', input: 0 },
      { title: '値が4の場合はInvalidPhaseLevelErrorをスローする', input: 4 },
      { title: '0を指定した場合はInvalidPhaseLevelErrorをスローする', input: 0 },
      { title: '4を指定した場合はInvalidPhaseLevelErrorをスローする', input: 4 },
      { title: '-1を指定した場合はInvalidPhaseLevelErrorをスローする', input: -1 },
      { title: '1.5を指定した場合はInvalidPhaseLevelErrorをスローする', input: 1.5 },
    ])('$title', ({ input }) => {
      // Arrange
      const value = input;

      // Act
      const actual = () => PhaseLevel.create(value);

      // Assert
      expect(actual).toThrowError(InvalidPhaseLevelError);
    });
  });
});
```

#### 3.1.8 `target('Artifact.create' / 'equals')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-047 | pathが"docs/"で始まる有効なパスの場合はArtifactが正常に生成される | 有効 path を用意する | `Artifact.create(input)` | `path` を保持する |
| UT-PD-048 | pathが空文字の場合はInvalidArtifactPathErrorをスローする | `path: ""` を用意する | `() => Artifact.create(input)` | `InvalidArtifactPathError` |
| UT-PD-049 | pathが"docs/"で始まらない場合はInvalidArtifactPathErrorをスローする | `path: "src/invalid.md"` を用意する | 同上 | `InvalidArtifactPathError` |
| UT-PD-050 | required=trueかつpathに未解決プレースホルダが含まれる場合はInvalidArtifactPathErrorをスローする | `required: true`, `path: "docs/.../{unit}.md"` を用意する | 同上 | `InvalidArtifactPathError` |
| UT-PD-051 | required=falseかつpathに未解決プレースホルダが含まれる場合はArtifactが正常に生成される | `required: false`, 未解決プレースホルダ path を用意する | `Artifact.create(input)` | 正常生成される |
| UT-PD-052 | required=trueかつ有効なパスの場合はrequired=trueのArtifactが生成される | `required: true` の有効 path を用意する | 同上 | `required === true` |
| UT-PD-053 | 同一属性のArtifactを比較した場合はtrueを返す | 同一属性 artifact を2つ作る | `left.equals(right)` | `true` |
| UT-PD-095 | 空文字を指定した場合はInvalidArtifactPathErrorをスローする | `path: ""` を用意する | `() => Artifact.create(input)` | `InvalidArtifactPathError` |
| UT-PD-096 | "docs/"を指定した場合は正常生成される | `path: "docs/"` を用意する | `Artifact.create(input)` | `path === "docs/"` |
| UT-PD-097 | "docs/valid.md"を指定した場合は正常生成される | `path: "docs/valid.md"` を用意する | 同上 | `path === "docs/valid.md"` |
| UT-PD-098 | "src/invalid.md"を指定した場合はInvalidArtifactPathErrorをスローする | `path: "src/invalid.md"` を用意する | `() => Artifact.create(input)` | `InvalidArtifactPathError` |
| UT-PD-099 | "DOCS/upper.md"を指定した場合はInvalidArtifactPathErrorをスローする | `path: "DOCS/upper.md"` を用意する | 同上 | `InvalidArtifactPathError` |

#### 3.1.9 `target('PhaseNode.create' / 'equals')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-054 | skillNameとartifactsとlevelが有効な場合はPhaseNodeが正常に生成される | 有効 `skillName`, `artifacts`, `level` を用意する | `PhaseNode.create(input)` | すべての属性が保持される |
| UT-PD-055 | skillNameが空文字の場合はエラーをスローする | `skillName: ""` を用意する | `() => PhaseNode.create(input)` | 例外送出 |
| UT-PD-056 | Level 3でstoryIdプレースホルダが設定されている場合はPhaseNodeが正常に生成される | Level 3 + `{storyId}` を含む artifact path を用意する | `PhaseNode.create(input)` | 正常生成される |
| UT-PD-057 | 複数のArtifactを持つ場合は全Artifactが保持されたPhaseNodeが生成される | artifact を2件以上用意する | 同上 | `artifacts.length` が入力と一致する |
| UT-PD-058 | 同一属性のPhaseNodeを比較した場合はtrueを返す | 同一属性 node を2つ作る | `left.equals(right)` | `true` |
| UT-PD-059 | skillNameが異なるPhaseNodeを比較した場合はfalseを返す | `skillName` のみ異なる node を2つ作る | 同上 | `false` |

#### 3.1.10 `target('PhaseDependency.create' / 'equals')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-060 | from/toが異なるノードでtype=requiresの場合はPhaseDependencyが正常に生成される | 異なる node と `type: "requires"` を用意する | `PhaseDependency.create(input)` | `type === "requires"` |
| UT-PD-061 | from/toが異なるノードでtype=recommendsの場合はPhaseDependencyが正常に生成される | 異なる node と `type: "recommends"` を用意する | 同上 | `type === "recommends"` |
| UT-PD-062 | fromとtoが同一ノードの場合はInvalidPhaseDependencyErrorをスローする | 同一 node を `from/to` に入れる | `() => PhaseDependency.create(input)` | `InvalidPhaseDependencyError` |
| UT-PD-063 | typeがrequires/recommends以外の場合はInvalidPhaseDependencyErrorをスローする | `type: "invalid"` を用意する | 同上 | `InvalidPhaseDependencyError` |
| UT-PD-064 | 同一属性のPhaseDependencyを比較した場合はtrueを返す | 同一属性 dependency を2つ作る | `left.equals(right)` | `true` |

#### 3.1.11 `target('PlanEvidence.create')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-070 | exists=true, qaComplete=true, planningModeMatch=trueの場合はPlanEvidenceが正常に生成される | 全 true の input を用意する | `PlanEvidence.create(input)` | 3属性が保持される |
| UT-PD-071 | exists=falseの場合はqaComplete=false, planningModeMatch=falseのPlanEvidenceが生成される | `exists: false` の input を用意する | 同上 | `qaComplete === false`, `planningModeMatch === false` |
| UT-PD-072 | exists=falseかつqaComplete=trueを指定した場合は矛盾するためエラーをスローする | 矛盾入力を用意する | `() => PlanEvidence.create(input)` | 例外送出 |
| UT-PD-073 | planningModeMatch=trueかつexists=falseを指定した場合は矛盾するためエラーをスローする | 矛盾入力を用意する | 同上 | 例外送出 |
| UT-PD-074 | exists=true, qaComplete=false, planningModeMatch=falseの場合はPlanEvidenceが正常に生成される | input を用意する | `PlanEvidence.create(input)` | 属性が保持される |
| UT-PD-103 | false, false, false は正常生成される | `exists: false`, `qaComplete: false`, `planningModeMatch: false` を用意する | 同上 | 正常生成 |
| UT-PD-104 | false, true, false はエラーになる | 矛盾入力を用意する | `() => PlanEvidence.create(input)` | 例外送出 |
| UT-PD-105 | false, false, true はエラーになる | 矛盾入力を用意する | 同上 | 例外送出 |
| UT-PD-106 | true, false, false は正常生成される | input を用意する | `PlanEvidence.create(input)` | 正常生成 |
| UT-PD-107 | true, true, true は正常生成される | input を用意する | 同上 | 正常生成 |

#### 3.1.12 `target('PhaseGateResult.create')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-084 | passed=trueかつblockersが空の場合はPhaseGateResultが正常に生成される | `passed: true`, `blockers: []` を用意する | `PhaseGateResult.create(input)` | 正常生成 |
| UT-PD-085 | passed=falseかつblockersが1件以上の場合はPhaseGateResultが正常に生成される | `passed: false`, `blockers: ["..."]` を用意する | 同上 | 正常生成 |
| UT-PD-086 | passed=falseかつblockersが空の場合は矛盾するためエラーをスローする | 矛盾入力を用意する | `() => PhaseGateResult.create(input)` | 例外送出 |
| UT-PD-087 | auditPayloadが付与されている場合はauditPayloadを保持したPhaseGateResultが生成される | `auditPayload` 付き input を用意する | `PhaseGateResult.create(input)` | `auditPayload` を保持する |
| UT-PD-088 | passed=trueかつwarningsが含まれる場合はwarningsを保持したPhaseGateResultが生成される | `warnings` 付き input を用意する | 同上 | `warnings` を保持する |

#### 3.1.13 `target('ドメインエラー網羅性')`
`UT-PD-108` 〜 `UT-PD-114` は新規の振る舞いを増やすのではなく、異常系テストのトレーサビリティを明示する補助ケースとして実装する。独立 `it()` を増やす場合は以下のように最小代表入力を使う。重複を避けたい場合は既存 `it.each()` のデータ行に `coverageCaseIds` を保持して一覧化してもよい。

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-108 | PhaseLevel生成時に1/2/3以外を指定した場合はInvalidPhaseLevelErrorへ到達する | `0`, `4`, `-1`, `1.5` など代表入力を選ぶ | `() => PhaseLevel.create(input)` | `InvalidPhaseLevelError` |
| UT-PD-109 | PlanningMode生成時にinteractive/embedded-qa以外を指定した場合はInvalidPlanningModeErrorへ到達する | `"invalid"` を用意する | `() => PlanningMode.create("invalid")` | `InvalidPlanningModeError` |
| UT-PD-110 | Artifact.path制約違反時はInvalidArtifactPathErrorへ到達する | 空文字、`src/...`、未解決プレースホルダを用意する | `() => Artifact.create(input)` | `InvalidArtifactPathError` |
| UT-PD-111 | PhaseDependency制約違反時はInvalidPhaseDependencyErrorへ到達する | 自己依存または不正 type を用意する | `() => PhaseDependency.create(input)` | `InvalidPhaseDependencyError` |
| UT-PD-112 | CustomRuleが未知ノード参照または必須項目不足の場合はInvalidCustomRuleErrorへ到達する | 未知ノード参照 rule または空 action を用意する | `() => executor()` | `InvalidCustomRuleError` |
| UT-PD-113 | Level間依存またはTDD最低保証の緩和を試行した場合はNonRelaxableDependencyOverrideErrorへ到達する | Level 間削除 rule または TDD 保証削除 rule を用意する | `() => sut.applyCustomization(policy)` | `NonRelaxableDependencyOverrideError` |
| UT-PD-114 | カスタムルール適用後に循環依存が発生する場合はCyclicPhaseDependencyErrorへ到達する | 循環 edge を作る rule を用意する | `() => sut.applyCustomization(policy)` | `CyclicPhaseDependencyError` |

```ts
target('ドメインエラー網羅性', () => {
  describe('代表的な失敗経路を確認する', () => {
    it.each([
      {
        title: 'PhaseLevel生成時に1/2/3以外を指定した場合はInvalidPhaseLevelErrorへ到達する',
        execute: () => PhaseLevel.create(0),
        expectedError: InvalidPhaseLevelError,
      },
      {
        title: 'Artifact.path制約違反時はInvalidArtifactPathErrorへ到達する',
        execute: () => Artifact.create({ name: 'artifact', path: '', required: true }),
        expectedError: InvalidArtifactPathError,
      },
    ])('$title', ({ execute, expectedError }) => {
      // Arrange
      const action = execute;

      // Act
      const actual = () => action();

      // Assert
      expect(actual).toThrowError(expectedError);
    });
  });
});
```

### 3.2 `planning-mode.test.ts`

#### 3.2.1 `target('PlanningMode.create' / 'fromConfig' / 'equals')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-065 | "interactive"を指定した場合はPlanningMode(interactive)が生成される | `"interactive"` を用意する | `PlanningMode.create("interactive")` | `value === "interactive"` |
| UT-PD-066 | "embedded-qa"を指定した場合はPlanningMode(embedded-qa)が生成される | `"embedded-qa"` を用意する | `PlanningMode.create("embedded-qa")` | `value === "embedded-qa"` |
| UT-PD-067 | 無効な文字列を指定した場合はInvalidPlanningModeErrorをスローする | `"invalid"` を用意する | `() => PlanningMode.create("invalid")` | `InvalidPlanningModeError` |
| UT-PD-068 | 有効な設定値の場合は対応するPlanningModeが生成される | config から mode 文字列を取り出す | `PlanningMode.fromConfig(config)` | 対応する値になる |
| UT-PD-069 | 同一値のPlanningModeを比較した場合はtrueを返す | 同値の mode を2つ作る | `left.equals(right)` | `true` |

```ts
target('PlanningMode.create', () => {
  describe('PlanningModeを生成する', () => {
    it.each([
      { title: '"interactive"を指定した場合はPlanningMode(interactive)が生成される', input: 'interactive' },
      { title: '"embedded-qa"を指定した場合はPlanningMode(embedded-qa)が生成される', input: 'embedded-qa' },
    ])('$title', ({ input }) => {
      // Arrange
      const value = input;

      // Act
      const actual = PlanningMode.create(value);

      // Assert
      expect(actual.value).toBe(value);
    });

    it('無効な文字列を指定した場合はInvalidPlanningModeErrorをスローする', () => {
      // Arrange
      const value = 'invalid';

      // Act
      const actual = () => PlanningMode.create(value);

      // Assert
      expect(actual).toThrowError(InvalidPlanningModeError);
    });
  });
});
```

### 3.3 `phase-customization-policy.test.ts`

#### 3.3.1 `target('CustomRule.create')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-075 | targetPhaseとconditionとactionが有効な場合はCustomRuleが正常に生成される | 有効入力を用意する | `CustomRule.create(input)` | すべての属性が保持される |
| UT-PD-076 | targetPhaseが空文字の場合はInvalidCustomRuleErrorをスローする | `targetPhase: ""` を用意する | `() => CustomRule.create(input)` | `InvalidCustomRuleError` |
| UT-PD-077 | actionが空配列の場合はInvalidCustomRuleErrorをスローする | `action: []` を用意する | 同上 | `InvalidCustomRuleError` |
| UT-PD-078 | actionが複数件の場合は全actionを保持したCustomRuleが生成される | `action: ["skip", "warn"]` を用意する | `CustomRule.create(input)` | action 配列をそのまま保持する |
| UT-PD-100 | 空配列はInvalidCustomRuleErrorになる | `action: []` を用意する | `() => CustomRule.create(input)` | `InvalidCustomRuleError` |
| UT-PD-101 | 1件 `["skip"]` は正常生成される | `action: ["skip"]` を用意する | `CustomRule.create(input)` | action 配列長が `1` |
| UT-PD-102 | 複数件 `["skip", "warn"]` は正常生成される | `action: ["skip", "warn"]` を用意する | 同上 | action 配列長が `2` |

#### 3.3.2 `target('PhaseCustomizationPolicy.create' / 'equals')`
| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-079 | rulesとoverrideEnabled=falseの場合はPhaseCustomizationPolicyが正常に生成される | rule 1件, `overrideEnabled: false` を用意する | `PhaseCustomizationPolicy.create(input)` | 属性が保持される |
| UT-PD-080 | overrideEnabled=trueの場合はoverrideEnabled=trueのPhaseCustomizationPolicyが生成される | `overrideEnabled: true` を用意する | 同上 | `overrideEnabled === true` |
| UT-PD-081 | rulesが空配列の場合はルールなしのPhaseCustomizationPolicyが正常に生成される | `rules: []` を用意する | 同上 | `rules.length === 0` |
| UT-PD-082 | 複数のCustomRuleを持つ場合は全ルールを保持したPhaseCustomizationPolicyが生成される | rule を2件以上用意する | 同上 | `rules.length === 入力件数` |
| UT-PD-083 | 同一属性のPhaseCustomizationPolicyを比較した場合はtrueを返す | 同一属性 policy を2つ作る | `left.equals(right)` | `true` |

```ts
target('CustomRule.create', () => {
  describe('CustomRuleを生成する', () => {
    it.each([
      { title: 'targetPhaseとconditionとactionが有効な場合はCustomRuleが正常に生成される', action: ['add-dependency'] },
      { title: '1件 ["skip"] は正常生成される', action: ['skip'] },
      { title: '複数件 ["skip", "warn"] は正常生成される', action: ['skip', 'warn'] },
    ])('$title', ({ action }) => {
      // Arrange
      const input = {
        targetPhase: 'level-2',
        condition: 'when target node exists',
        action,
      };

      // Act
      const actual = CustomRule.create(input);

      // Assert
      expect(actual.action).toEqual(action);
    });

    it.each([
      { title: 'targetPhaseが空文字の場合はInvalidCustomRuleErrorをスローする', input: { targetPhase: '', condition: 'when', action: ['skip'] } },
      { title: 'actionが空配列の場合はInvalidCustomRuleErrorをスローする', input: { targetPhase: 'level-2', condition: 'when', action: [] } },
      { title: '空配列はInvalidCustomRuleErrorになる', input: { targetPhase: 'level-2', condition: 'when', action: [] } },
    ])('$title', ({ input }) => {
      // Arrange
      const invalidInput = input;

      // Act
      const actual = () => CustomRule.create(invalidInput);

      // Assert
      expect(actual).toThrowError(InvalidCustomRuleError);
    });
  });
});
```

## 4. モック戦略

- ドメイン実体はすべて実体を使う。`PhaseStructure`, 値オブジェクト群, ドメインエラーに対して `vi.fn()` やスタブは使わない。
- 共通化はモックではなくファクトリ関数で行う。共通 Arrange は `create*` ヘルパーへ寄せ、各 `it()` の先頭で明示的に呼ぶ。
- 静的定義 `default-phase-nodes.ts` / `default-phase-dependencies.ts` は固定 fixture として import する。差し替えずに実データとして検証する。
- ポートはユニットテスト対象外なのでモックしない。`checkPhaseGate()` の入力になる証跡は `createGateEvidence()` が組み立てる plain object / `Map` で供給する。
- `UT-PD-108` 〜 `UT-PD-114` の網羅性ケースも代表入力を使うだけで、専用スタブは作らない。
- `beforeEach` で `sut` や入力を暗黙作成しない。AAA の独立性を優先し、必要な Arrange は各ケースに閉じる。

## 5. 境界値テスト一覧
| ケースID | 対象 | 境界入力 | 実装ロジック |
|---|---|---|---|
| UT-PD-089 | `PhaseLevel.create` | `0` | `it.each()` の異常系行で `InvalidPhaseLevelError` を検証する |
| UT-PD-090 | `PhaseLevel.create` | `1` | `it.each()` の正常系行で `value === 1` を検証する |
| UT-PD-091 | `PhaseLevel.create` | `3` | `it.each()` の正常系行で `value === 3` を検証する |
| UT-PD-092 | `PhaseLevel.create` | `4` | `it.each()` の異常系行で `InvalidPhaseLevelError` を検証する |
| UT-PD-093 | `PhaseLevel.create` | `-1` | `it.each()` の異常系行で `InvalidPhaseLevelError` を検証する |
| UT-PD-094 | `PhaseLevel.create` | `1.5` | `it.each()` の異常系行で `InvalidPhaseLevelError` を検証する |
| UT-PD-095 | `Artifact.create` | `""` | 空文字 path を与えて `InvalidArtifactPathError` を検証する |
| UT-PD-096 | `Artifact.create` | `"docs/"` | 最短有効 path を与えて正常生成を検証する |
| UT-PD-097 | `Artifact.create` | `"docs/valid.md"` | 代表的な有効 path で正常生成を検証する |
| UT-PD-098 | `Artifact.create` | `"src/invalid.md"` | `docs/` 以外の path で `InvalidArtifactPathError` を検証する |
| UT-PD-099 | `Artifact.create` | `"DOCS/upper.md"` | 大文字 `DOCS/` で `InvalidArtifactPathError` を検証する |
| UT-PD-100 | `CustomRule.create` | `[]` | `action` が空配列なら `InvalidCustomRuleError` を検証する |
| UT-PD-101 | `CustomRule.create` | `["skip"]` | 最小有効件数で正常生成を検証する |
| UT-PD-102 | `CustomRule.create` | `["skip", "warn"]` | 複数 action を保持できることを検証する |
| UT-PD-103 | `PlanEvidence.create` | `false, false, false` | 整合ケースとして正常生成を検証する |
| UT-PD-104 | `PlanEvidence.create` | `false, true, false` | 矛盾ケースとして例外を検証する |
| UT-PD-105 | `PlanEvidence.create` | `false, false, true` | 矛盾ケースとして例外を検証する |
| UT-PD-106 | `PlanEvidence.create` | `true, false, false` | 中間ケースとして正常生成を検証する |
| UT-PD-107 | `PlanEvidence.create` | `true, true, true` | 完全充足ケースとして正常生成を検証する |

境界値ケースは専用ファイルへ分けず、各 target の `it.each()` に統合する。これにより `target > describe > context > it` の構造を維持しつつ、重複 Arrange を最小化できる。

## ISSUE-001追加分

> ISSUE-001（inception側フェーズゲート整備）により追加された不変条件 INV-8, INV-9 に対応するテストロジック。
> `checkPhaseGate(targetLevel, evidence, scope?)` の第3引数 `scope` によるコンテキスト依存動作を検証する。
> 対象ケース: `UT-PD-134` 〜 `UT-PD-152`（17件、UT-PD-147/149はAPI仕様に基づき統合済み）
> テストファイル: `scripts/harness/__tests__/phase-dependency-model/phase-structure.test.ts`

### 6.1 追加ヘルパー・ファクトリ

| ヘルパー | 用途 | 既定値 |
|---|---|---|
| `createScope(overrides?)` | `checkPhaseGate()` の第3引数 `scope` を生成する | `unitId: 'agent-integration'`, `storyId: 'H11-05'` |
| `createLevel3ArtifactStatusMap(overrides?)` | Level 3 成果物の resolve 済みパスに対する存在マップを生成する | 依存チェーン上の全成果物が存在 |
| `resolvedPath(unitId, storyId, fileName)` | Level 3 成果物の resolve 済みパスを組み立てるユーティリティ | - |

```ts
function createScope(overrides = {}) {
  return {
    unitId: 'agent-integration',
    storyId: 'H11-05',
    ...overrides,
  };
}

function resolvedPath(unitId: string, storyId: string, fileName: string): string {
  return `docs/inception/${unitId}/${storyId}/${fileName}`;
}

function createLevel3ArtifactStatusMap(
  scope: { unitId: string; storyId: string },
  overrides: Record<string, boolean> = {},
): Map<string, boolean> {
  const base = new Map<string, boolean>([
    [resolvedPath(scope.unitId, scope.storyId, 'logical_design.md'), true],
    [resolvedPath(scope.unitId, scope.storyId, 'scenario_test_design.md'), true],
    [resolvedPath(scope.unitId, scope.storyId, 'scenario_test_logic.md'), true],
    [resolvedPath(scope.unitId, scope.storyId, 'tdd_implementation_plan.md'), true],
    [resolvedPath(scope.unitId, scope.storyId, 'implementation_readiness.md'), true],
  ]);
  for (const [key, value] of Object.entries(overrides)) {
    base.set(key, value);
  }
  return base;
}
```

### 6.2 テストケース詳細ロジック（`phase-structure.test.ts` 追記分）

#### 6.2.1 scope未提供時の既存動作維持（INV-9）: UT-PD-134〜135

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-134 | scope引数を省略した場合はLevel 3ノードのrequired=false成果物がチェックされずゲートを通過する | Level 3 対象、Level 2 前提成果物を全存在にした evidence を作る。scope は渡さない | `sut.checkPhaseGate(Level 3, evidence)` | `passed === true`, `blockers === []` |
| UT-PD-135 | scope引数を省略しLevel 2の前提成果物が欠損している場合はゲートでブロックされる | Level 3 対象、Level 2 前提成果物の一部を `false` にする。scope は渡さない。（Level 3 required=false成果物はスキップされるが、Level 2前提チェックは維持されることを検証する） | `sut.checkPhaseGate(Level 3, evidence)` | `passed === false`, Level 2 欠損成果物が blocker に含まれる |

```ts
target('checkPhaseGate', () => {
  describe('scope未提供時のLevel 3フェーズゲートを検証する', () => {
    it('scope引数を省略した場合はLevel 3ノードのrequired=false成果物がチェックされずゲートを通過する', () => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const evidence = createGateEvidence({
        artifactExistenceByPath: createPrerequisiteArtifactMap({
          prerequisiteLevel: 2,
          state: 'all',
        }),
      });

      // Act
      const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.blockers).toEqual([]);
    });

    context('scope引数を省略しLevel 2の前提成果物が欠損している場合', () => {
      it('ゲートでブロックされblockersにLevel 2欠損成果物が含まれる', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const evidence = createGateEvidence({
          artifactExistenceByPath: createPrerequisiteArtifactMap({
            prerequisiteLevel: 2,
            state: 'partial',
          }),
        });

        // Act
        const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.blockers.length).toBeGreaterThan(0);
      });
    });
  });
});
```

#### 6.2.2 scope.unitIdのみ提供（storyIdなし）時の動作（INV-9）: UT-PD-136〜137

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-136 | scope.unitIdのみ提供しstoryIdが未定義の場合はLevel 3ノードのrequired=false成果物がチェックされずscope未提供時と同一動作になる | scope に `unitId` のみ設定し `storyId` を `undefined` にする | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === true`, `blockers === []` |
| UT-PD-137 | scope.unitIdのみ提供しstoryIdが未定義かつLevel 2の前提成果物が欠損の場合はゲートでブロックされる | scope に `unitId` のみ設定。Level 2 前提成果物の一部を `false` にする | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === false` |

```ts
describe('scope.unitIdのみ提供時のLevel 3フェーズゲートを検証する', () => {
  it('scope.unitIdのみ提供しstoryIdが未定義の場合はLevel 3ノードのrequired=false成果物がチェックされずscope未提供時と同一動作になる', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope({ storyId: undefined });
    const evidence = createGateEvidence({
      artifactExistenceByPath: createPrerequisiteArtifactMap({
        prerequisiteLevel: 2,
        state: 'all',
      }),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expect(actual.passed).toBe(true);
    expect(actual.blockers).toEqual([]);
  });

  context('scope.unitIdのみ提供しstoryIdが未定義かつLevel 2の前提成果物が欠損の場合', () => {
    it('ゲートでブロックされる', () => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const scope = createScope({ storyId: undefined });
      const evidence = createGateEvidence({
        artifactExistenceByPath: createPrerequisiteArtifactMap({
          prerequisiteLevel: 2,
          state: 'partial',
        }),
      });

      // Act
      const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

      // Assert
      expect(actual.passed).toBe(false);
    });
  });
});
```

#### 6.2.3 scope.storyId提供時のコンテキスト依存チェック（INV-8）: UT-PD-138〜142

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-138 | scope={unitId:'agent-integration', storyId:'H11-05'}を提供した場合はLevel 3ノードの成果物がresolve(scope)で解決され{unitId}と{storyId}プレースホルダが実値に置換される | scope を提供し、Level 3 ノードの成果物 resolve 結果を確認する | `sut.checkPhaseGate(Level 3, evidence, scope)` | resolve 済みパスが `docs/inception/agent-integration/H11-05/` を含む |
| UT-PD-139 | resolve済みパスが全て存在する場合は該当ノードは完了と判定されゲートを通過する | 全 resolve 済みパスを `true` にした evidence を作る | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === true` |
| UT-PD-140 | resolve済みパスが存在しない場合は該当ノードは未完了と判定されゲートでブロックされる | logical_design.md の resolve 済みパスを `false` にする | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === false` |
| UT-PD-141 | 前提ノードが未完了の場合はゲートでブロックされblockersに未完了前提ノードの情報が含まれる | logical_design.md 未存在の evidence を作る | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === false`, blocker に logical_design 不足が含まれる |
| UT-PD-142 | 前提ノードが全て完了済みの場合はゲートを通過する | logical_design.md 含む全成果物存在の evidence を作る | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === true` |

```ts
describe('scope.storyId提供時のLevel 3成果物パス解決を検証する', () => {
  it('scope提供時にLevel 3ノードの成果物がresolve(scope)で解決され{unitId}と{storyId}プレースホルダが実値に置換される', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope({ unitId: 'agent-integration', storyId: 'H11-05' });
    const level3Statuses = createLevel3ArtifactStatusMap(scope);
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...level3Statuses,
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    // resolve 済みパスが evidence 内で参照されていることを間接検証
    // (passed=true は全 resolve 済みパスが存在したことを意味する)
    expect(actual.passed).toBe(true);
    for (const [path] of level3Statuses) {
      expect(path).toContain('docs/inception/agent-integration/H11-05/');
    }
  });
});

describe('scope.storyId提供時のLevel 3成果物存在チェックを検証する', () => {
  it('resolve済みパスが全て存在する場合は該当ノードは完了と判定されゲートを通過する', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope();
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...createLevel3ArtifactStatusMap(scope),
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expect(actual.passed).toBe(true);
  });

  it('resolve済みパスが存在しない場合は該当ノードは未完了と判定されゲートでブロックされる', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope();
    const logicalDesignPath = resolvedPath(scope.unitId, scope.storyId, 'logical_design.md');
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...createLevel3ArtifactStatusMap(scope, { [logicalDesignPath]: false }),
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expect(actual.passed).toBe(false);
  });
});

describe('未完了ノードに依存するノードの成果物書き込みを検証する', () => {
  context('前提ノードが未完了の場合', () => {
    it('ゲートでブロックされblockersに未完了前提ノードの情報が含まれる', () => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const scope = createScope();
      const logicalDesignPath = resolvedPath(scope.unitId, scope.storyId, 'logical_design.md');
      const evidence = createGateEvidence({
        artifactExistenceByPath: new Map([
          ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
          ...createLevel3ArtifactStatusMap(scope, { [logicalDesignPath]: false }),
        ]),
      });

      // Act
      const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

      // Assert
      expect(actual.passed).toBe(false);
      expectFailedResult(actual, ['logical_design']);
    });
  });

  context('前提ノードが全て完了済みの場合', () => {
    it('ゲートを通過する', () => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const scope = createScope();
      const evidence = createGateEvidence({
        artifactExistenceByPath: new Map([
          ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
          ...createLevel3ArtifactStatusMap(scope),
        ]),
      });

      // Act
      const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

      // Assert
      expect(actual.passed).toBe(true);
    });
  });
});
```

#### 6.2.4 依存グラフに基づくブロックテスト（INV-8 + Level 3依存グラフ）: UT-PD-143〜149

> Level 3 内の依存グラフ:
> `2:logical-designer -> 3:logical-designer -> 3:scenario-test-designer -> 3:scenario-test-logic-designer -> 3:implementation-readiness-checker -> 3:story-implementor`

**直接依存によるブロック**

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-143 | scope.storyId提供時にlogical_design.md未作成の場合はゲートでブロックされblockersにlogical_design.md不足が含まれる | logical_design.md を `false`、他を `true` にする | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === false`, blocker に `logical_design` が含まれる |
| UT-PD-144 | scope.storyId提供時にlogical_design.md作成済みだがscenario_test_design.md未作成の場合はゲートでブロックされblockersにscenario_test_design.md不足が含まれる | logical_design.md を `true`、scenario_test_design.md を `false` にする | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === false`, blocker に `scenario_test_design` が含まれる |
| UT-PD-145 | scope.storyId提供時にimplementation-readiness-checker未完了の場合はゲートでブロックされblockersにimplementation-readiness-checker未完了が含まれる | implementation_readiness.md を `false` にする | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === false`, blocker に `implementation_readiness` が含まれる |

**推移的依存によるブロック**

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-146 | scope.storyId提供時にlogical_design.mdが未作成の場合は依存チェーン全体がブロックされblockersにlogical_design.md不足が含まれる | logical_design.md を `false` にする。checkPhaseGate() APIにターゲットノード指定がないため、チェーン起点の欠損がゲート全体をブロックすることを検証する | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === false`, blocker に `logical_design` が含まれる |

**全前提成果物存在時のパス**

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-148 | scope.storyId提供時に依存チェーン上の全成果物が存在する場合はゲートを通過する | 全 resolve 済みパスを `true` にする | `sut.checkPhaseGate(Level 3, evidence, scope)` | `passed === true`, `blockers === []` |

```ts
describe('Level 3依存グラフでlogical_design.md未作成時のブロックを検証する', () => {
  it('scope.storyId提供時にlogical_design.md未作成の場合はゲートでブロックされblockersにlogical_design.md不足が含まれる', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope();
    const logicalDesignPath = resolvedPath(scope.unitId, scope.storyId, 'logical_design.md');
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...createLevel3ArtifactStatusMap(scope, { [logicalDesignPath]: false }),
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expectFailedResult(actual, ['logical_design']);
  });
});

describe('Level 3依存グラフでscenario_test_design.md未作成時のブロックを検証する', () => {
  it('scope.storyId提供時にlogical_design.md作成済みだがscenario_test_design.md未作成の場合はゲートでブロックされblockersにscenario_test_design.md不足が含まれる', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope();
    const scenarioTestDesignPath = resolvedPath(scope.unitId, scope.storyId, 'scenario_test_design.md');
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...createLevel3ArtifactStatusMap(scope, { [scenarioTestDesignPath]: false }),
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expectFailedResult(actual, ['scenario_test_design']);
  });
});

describe('Level 3依存グラフでimplementation_readiness未完了時のブロックを検証する', () => {
  it('scope.storyId提供時にimplementation-readiness-checker未完了の場合はゲートでブロックされblockersにimplementation-readiness-checker未完了が含まれる', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope();
    const implReadinessPath = resolvedPath(scope.unitId, scope.storyId, 'implementation_readiness.md');
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...createLevel3ArtifactStatusMap(scope, { [implReadinessPath]: false }),
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expectFailedResult(actual, ['implementation_readiness']);
  });
});

describe('Level 3依存グラフで推移的依存によるブロックを検証する', () => {
  // 注: checkPhaseGate() APIにターゲットノード指定がないため、旧UT-PD-147（チェーン末端への推移的ブロック）は
  // UT-PD-146と実質同一であり統合した。チェーン起点の欠損がゲート全体をブロックすることを検証する。
  it('scope.storyId提供時にlogical_design.mdが未作成の場合は依存チェーン全体がブロックされblockersにlogical_design.md不足が含まれる', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope();
    const logicalDesignPath = resolvedPath(scope.unitId, scope.storyId, 'logical_design.md');
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...createLevel3ArtifactStatusMap(scope, { [logicalDesignPath]: false }),
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expectFailedResult(actual, ['logical_design']);
  });
});

describe('Level 3依存グラフで全前提成果物が存在する場合を検証する', () => {
  // 注: checkPhaseGate() APIにターゲットノード指定がないため、旧UT-PD-149（チェーン末端も通過）は
  // UT-PD-148と実質同一であり統合した。
  it('scope.storyId提供時に依存チェーン上の全成果物が存在する場合はゲートを通過する', () => {
    // Arrange
    const sut = createDefaultPhaseStructure();
    const scope = createScope();
    const evidence = createGateEvidence({
      artifactExistenceByPath: new Map([
        ...createPrerequisiteArtifactMap({ prerequisiteLevel: 2, state: 'all' }),
        ...createLevel3ArtifactStatusMap(scope),
      ]),
    });

    // Act
    const actual = sut.checkPhaseGate(createPhaseLevel(3), evidence, scope);

    // Assert
    expect(actual.passed).toBe(true);
    expect(actual.blockers).toEqual([]);
  });
});
```

#### 6.2.5 Artifact.resolve()との連携テスト: UT-PD-150〜152

| ケースID | テスト名 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PD-150 | resolve({unitId:'agent-integration', storyId:'H11-05'})を呼び出した場合は{unitId}が'agent-integration'に、{storyId}が'H11-05'に置換された実パスが返される | `{storyId}` と `{unitId}` を含む path の Artifact を作る | `artifact.resolve(scope)` | `docs/inception/agent-integration/H11-05/logical_design.md` |
| UT-PD-151 | resolve({unitId:'phase-dependency-model', storyId:'H02-01'})を呼び出した場合はdocs/inception/phase-dependency-model/H02-01/配下の実パスが返される | 同上 | `artifact.resolve(scope)` | `docs/inception/phase-dependency-model/H02-01/` を含むパス |
| UT-PD-152 | scopeを省略またはstoryId未指定で呼び出した場合はプレースホルダが未解決のままのパスが返される | プレースホルダ付き Artifact を作る | `artifact.resolve()` または `artifact.resolve({ unitId: 'x' })` | `{storyId}` が残存するパス |

```ts
target('Artifact.resolve', () => {
  describe('scope提供時のArtifactパス解決を検証する', () => {
    it('resolve({unitId:\'agent-integration\', storyId:\'H11-05\'})を呼び出した場合は{unitId}が\'agent-integration\'に{storyId}が\'H11-05\'に置換された実パスが返される', () => {
      // Arrange
      const artifact = createArtifact({
        name: 'story-logical-design',
        path: 'docs/inception/{unitId}/{storyId}/logical_design.md',
        required: false,
      });
      const scope = { unitId: 'agent-integration', storyId: 'H11-05' };

      // Act
      const actual = artifact.resolve(scope);

      // Assert
      expect(actual).toBe('docs/inception/agent-integration/H11-05/logical_design.md');
    });

    it('resolve({unitId:\'phase-dependency-model\', storyId:\'H02-01\'})を呼び出した場合はdocs/inception/phase-dependency-model/H02-01/配下の実パスが返される', () => {
      // Arrange
      const artifact = createArtifact({
        name: 'story-logical-design',
        path: 'docs/inception/{unitId}/{storyId}/logical_design.md',
        required: false,
      });
      const scope = { unitId: 'phase-dependency-model', storyId: 'H02-01' };

      // Act
      const actual = artifact.resolve(scope);

      // Assert
      expect(actual).toContain('docs/inception/phase-dependency-model/H02-01/');
    });
  });

  describe('scope未提供時のArtifactパス解決を検証する', () => {
    it('scopeを省略またはstoryId未指定で呼び出した場合はプレースホルダが未解決のままのパスが返される', () => {
      // Arrange
      const artifact = createArtifact({
        name: 'story-logical-design',
        path: 'docs/inception/{unitId}/{storyId}/logical_design.md',
        required: false,
      });

      // Act
      const actual = artifact.resolve();

      // Assert
      expect(actual).toContain('{storyId}');
    });
  });
});
```

### 6.3 モック戦略（ISSUE-001追加分）

- 既存のモック戦略を継続する。ドメイン実体はすべて実体を使い、`vi.fn()` やスタブは使わない。
- `scope` 引数は plain object で供給する。専用のモックは不要。
- `createLevel3ArtifactStatusMap()` で Level 3 成果物の resolve 済みパスを生成し、`createGateEvidence()` に合成する。
- `resolvedPath()` ヘルパーは Artifact.resolve() の期待値を手動構築するユーティリティであり、テスト対象の `Artifact.resolve()` とは独立した実装とする。
