import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  Artifact,
  InvalidArtifactPathError,
} from '../../../phase-dependency-model/domain/values/artifact.js';
import {
  CustomRule,
  InvalidCustomRuleError,
} from '../../../phase-dependency-model/domain/values/custom-rule.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';
import {
  CyclicPhaseDependencyError,
  NonRelaxableDependencyOverrideError,
  PhaseStructure,
} from '../../../phase-dependency-model/domain/models/phase-structure.js';
import {
  InvalidPhaseDependencyError,
  PhaseDependency,
} from '../../../phase-dependency-model/domain/values/phase-dependency.js';
import { PhaseGateResult } from '../../../phase-dependency-model/domain/values/phase-gate-result.js';
import {
  InvalidPhaseLevelError,
  PhaseLevel,
} from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PhaseNode } from '../../../phase-dependency-model/domain/values/phase-node.js';
import { PlanEvidence } from '../../../phase-dependency-model/domain/values/plan-evidence.js';
import { PlanningMode } from '../../../phase-dependency-model/domain/values/planning-mode.js';

const createPhaseLevel = (value: number = 1): PhaseLevel => PhaseLevel.create(value);

const createArtifact = (
  overrides: Partial<{
    name: string;
    path: string;
    required: boolean;
  }> = {},
): Artifact =>
  Artifact.create({
    name: 'artifact',
    path: 'docs/product/construction/phase-dependency-model/domain_model.md',
    required: true,
    ...overrides,
  });

const createPhaseNode = (
  overrides: Partial<{
    skillName: string;
    level: PhaseLevel;
    artifacts: readonly Artifact[];
  }> = {},
): PhaseNode =>
  PhaseNode.create({
    skillName: 'domain-designer',
    artifacts: [createArtifact()],
    level: createPhaseLevel(2),
    ...overrides,
  });

const createPhaseDependency = (
  overrides: Partial<{
    from: PhaseNode;
    to: PhaseNode;
    type: 'requires' | 'recommends' | 'invalid';
  }> = {},
): PhaseDependency =>
  PhaseDependency.create({
    from: createPhaseNode({
      skillName: 'domain-designer',
      level: createPhaseLevel(2),
    }),
    to: createPhaseNode({
      skillName: 'logical-designer',
      level: createPhaseLevel(3),
      artifacts: [createArtifact({ path: 'docs/inception/phase-dependency-model/{storyId}/logical_design.md', required: false })],
    }),
    type: 'requires',
    ...overrides,
  } as {
    from: PhaseNode;
    to: PhaseNode;
    type: 'requires' | 'recommends';
  });

const createPlanEvidence = (
  overrides: Partial<{
    exists: boolean;
    qaComplete: boolean;
    planningModeMatch: boolean;
  }> = {},
): PlanEvidence =>
  PlanEvidence.create({
    exists: true,
    qaComplete: true,
    planningModeMatch: true,
    ...overrides,
  });

const createCustomRule = (
  overrides: Partial<{
    targetPhase: string;
    condition: string;
    action: readonly string[];
  }> = {},
): CustomRule =>
  CustomRule.create({
    targetPhase: '3:implementation-readiness-checker',
    condition: 'requires-all',
    action: ['2:it-test-logic-designer'],
    ...overrides,
  });

const createPhaseCustomizationPolicy = (
  overrides: Partial<{
    preset: 'default' | 'custom';
    rules: readonly CustomRule[];
    overrideEnabled: boolean;
  }> = {},
): PhaseCustomizationPolicy =>
  PhaseCustomizationPolicy.create({
    preset: 'default',
    rules: [],
    overrideEnabled: false,
    ...overrides,
  });

const createDefaultPhaseStructure = (
  overrides: Partial<{
    preset: 'default' | 'custom';
    rules: readonly CustomRule[];
    overrideEnabled: boolean;
  }> = {},
): PhaseStructure => PhaseStructure.createDefault(createPhaseCustomizationPolicy(overrides));

const createGateEvidence = (
  sut: PhaseStructure,
  targetLevel: PhaseLevel,
  overrides: Partial<{
    artifactStatuses: ReadonlyMap<string, boolean>;
    planEvidences: ReadonlyMap<string, PlanEvidence>;
    planningMode: PlanningMode;
  }> = {},
): {
  artifactStatuses: ReadonlyMap<string, boolean>;
  planEvidences: ReadonlyMap<string, PlanEvidence>;
  planningMode: PlanningMode;
} => {
  const prerequisiteNodes = [1, 2, 3]
    .map((value) => createPhaseLevel(value))
    .filter((level) => level.isPrerequisiteOf(targetLevel))
    .flatMap((level) => sut.getPhaseNodes(level));

  const artifactStatuses = new Map<string, boolean>();
  const planEvidences = new Map<string, PlanEvidence>();

  for (const node of prerequisiteNodes) {
    for (const artifact of node.requiredArtifacts()) {
      artifactStatuses.set(artifact.path, true);
    }

    if (node.planArtifacts().length > 0) {
      planEvidences.set(node.nodeKey(), createPlanEvidence());
    }
  }

  return {
    artifactStatuses,
    planEvidences,
    planningMode: PlanningMode.create('interactive'),
    ...overrides,
  };
};

const createPrerequisiteArtifactMap = (
  sut: PhaseStructure,
  targetLevel: PhaseLevel,
  prerequisiteLevel: PhaseLevel,
  state: 'all' | 'partial' | 'none',
): ReadonlyMap<string, boolean> => {
  const actual = new Map(createGateEvidence(sut, targetLevel).artifactStatuses);
  const artifacts = sut
    .getPhaseNodes(prerequisiteLevel)
    .flatMap((node) => node.requiredArtifacts());

  for (const artifact of artifacts) {
    actual.set(artifact.path, state === 'all');
  }

  if (state === 'partial' && artifacts.length > 0) {
    actual.set(artifacts[0].path, false);
    for (const artifact of artifacts.slice(1)) {
      actual.set(artifact.path, true);
    }
  }

  return actual;
};

const createPlanEvidenceMap = (
  sut: PhaseStructure,
  targetLevel: PhaseLevel,
  overrides: Partial<{
    exists: boolean;
    qaComplete: boolean;
    planningModeMatch: boolean;
  }> = {},
): ReadonlyMap<string, PlanEvidence> => {
  const actual = new Map(createGateEvidence(sut, targetLevel).planEvidences);
  const level = createPhaseLevel(targetLevel.value - 1);

  for (const node of sut.getPhaseNodes(level)) {
    if (node.planArtifacts().length > 0) {
      actual.set(node.nodeKey(), createPlanEvidence(overrides));
    }
  }

  return actual;
};

const expectFailedResult = (
  actual: PhaseGateResult,
  expectedFragments: readonly string[],
): void => {
  expect(actual.passed).toBe(false);
  expect(actual.blockers.length).toBeGreaterThan(0);
  for (const fragment of expectedFragments) {
    expect(actual.blockers.some((blocker) => blocker.includes(fragment))).toBe(true);
  }
};

const expectAuditPayload = (
  actual: PhaseStructure,
  expectedRuleCount: number,
): void => {
  expect(actual.auditPayload).toBeDefined();
  expect(Array.isArray(actual.auditPayload?.appliedRules)).toBe(true);
  expect(actual.auditPayload?.appliedRules).toHaveLength(expectedRuleCount);
  expect(typeof actual.auditPayload?.generatedAt).toBe('string');
  expect(actual.auditPayload?.requestedOverride).toBe(true);
};

target('PhaseStructure.createDefault', () => {
  describe('デフォルトポリシーでPhaseStructureを構築する', () => {
    // UT-PD-001
    context('ルールなしポリシーを渡す場合', () => {
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
    });

    // UT-PD-002
    context('Level 1ノードを参照する場合', () => {
      it('product-wide計画スキルのフェーズノードが含まれる', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();

        // Act
        const actual = sut.getPhaseNodes(createPhaseLevel(1));

        // Assert
        expect(actual.map((node) => node.skillName)).toEqual(
          expect.arrayContaining([
            'product-architect',
            'story-writer',
            'story-mapper',
            'unit-designer',
          ]),
        );
      });
    });

    // UT-PD-003
    context('依存グラフを参照する場合', () => {
      it('Level間依存が設定される', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();

        // Act
        const actual = sut.buildDependencyGraph();

        // Assert
        expect(
          actual.edges.some(
            (edge) =>
              edge.type === 'requires' &&
              edge.from.level.value === 1 &&
              edge.to.level.value === 2,
          ),
        ).toBe(true);
        expect(
          actual.edges.some(
            (edge) =>
              edge.type === 'requires' &&
              edge.from.level.value === 2 &&
              edge.to.level.value === 3,
          ),
        ).toBe(true);
      });
    });

    // UT-PD-004
    context('未知ノードを参照するカスタムルールを含む場合', () => {
      it('InvalidCustomRuleErrorをスローする', () => {
        // Arrange
        const policy = createPhaseCustomizationPolicy({
          rules: [
            createCustomRule({
              targetPhase: 'unknown-phase',
            }),
          ],
        });

        // Act
        const actual = () => PhaseStructure.createDefault(policy);

        // Assert
        expect(actual).toThrowError(InvalidCustomRuleError);
      });
    });

    // UT-PD-005
    context('Level間依存の削除要求を含む場合', () => {
      it('NonRelaxableDependencyOverrideErrorをスローする', () => {
        // Arrange
        const policy = createPhaseCustomizationPolicy({
          rules: [
            createCustomRule({
              targetPhase: '2:domain-designer',
              action: ['remove:1:unit-designer'],
            }),
          ],
        });

        // Act
        const actual = () => PhaseStructure.createDefault(policy);

        // Assert
        expect(actual).toThrowError(NonRelaxableDependencyOverrideError);
      });
    });

    // UT-PD-006
    context('巡回依存を作るカスタムルールを含む場合', () => {
      it('CyclicPhaseDependencyErrorをスローする', () => {
        // Arrange
        const policy = createPhaseCustomizationPolicy({
          rules: [
            createCustomRule({
              targetPhase: '1:product-architect',
              action: ['2:domain-designer'],
            }),
          ],
        });

        // Act
        const actual = () => PhaseStructure.createDefault(policy);

        // Assert
        expect(actual).toThrowError(CyclicPhaseDependencyError);
      });
    });
  });
});

target('PhaseStructure.checkPhaseGate', () => {
  describe('フェーズゲートを検証する', () => {
    // UT-PD-007, UT-PD-008, UT-PD-009, UT-PD-010, UT-PD-011, UT-PD-012
    it.each([
      {
        title: 'Level 1の前提成果物が全て存在する場合はPhaseGateResult.passed=trueを返す',
        targetLevel: 2,
        prerequisiteLevel: 1,
        artifactState: 'all' as const,
        expectedPassed: true,
        expectedBlockers: [],
      },
      {
        title: 'Level 1の前提成果物が一部欠損している場合はPhaseGateResult.passed=falseかつblockersに欠損成果物が含まれる',
        targetLevel: 2,
        prerequisiteLevel: 1,
        artifactState: 'partial' as const,
        expectedPassed: false,
        expectedBlockers: ['docs/'],
      },
      {
        title: 'Level 1の前提成果物が全て欠損している場合はPhaseGateResult.passed=falseかつblockersに全欠損成果物が含まれる',
        targetLevel: 2,
        prerequisiteLevel: 1,
        artifactState: 'none' as const,
        expectedPassed: false,
        expectedBlockers: ['docs/'],
      },
      {
        title: 'Level 2の前提成果物が全て存在する場合はPhaseGateResult.passed=trueを返す',
        targetLevel: 3,
        prerequisiteLevel: 2,
        artifactState: 'all' as const,
        expectedPassed: true,
        expectedBlockers: [],
      },
      {
        title: 'Level 2の前提成果物が一部欠損している場合はPhaseGateResult.passed=falseかつblockersに欠損成果物が含まれる',
        targetLevel: 3,
        prerequisiteLevel: 2,
        artifactState: 'partial' as const,
        expectedPassed: false,
        expectedBlockers: ['docs/'],
      },
      {
        title: 'Level 2の前提成果物が全て欠損している場合はPhaseGateResult.passed=falseかつblockersに全欠損成果物が含まれる',
        targetLevel: 3,
        prerequisiteLevel: 2,
        artifactState: 'none' as const,
        expectedPassed: false,
        expectedBlockers: ['docs/'],
      },
    ])('$title', ({ targetLevel, prerequisiteLevel, artifactState, expectedPassed, expectedBlockers }) => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const target = createPhaseLevel(targetLevel);
      const evidence = createGateEvidence(sut, target, {
        artifactStatuses: createPrerequisiteArtifactMap(
          sut,
          target,
          createPhaseLevel(prerequisiteLevel),
          artifactState,
        ),
      });

      // Act
      const actual = sut.checkPhaseGate(target, evidence);

      // Assert
      if (expectedPassed) {
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      } else {
        expectFailedResult(actual, expectedBlockers);
      }
    });

    // UT-PD-013, UT-PD-014
    context('PlanningMode=interactiveの場合', () => {
      it.each([
        {
          title: 'plan文書にQAセクションが存在する場合はPhaseGateResult.passed=trueを返す',
          qaComplete: true,
          expectedPassed: true,
          expectedFragments: [] as readonly string[],
        },
        {
          title: 'plan文書にQAセクションが存在しない場合はPhaseGateResult.passed=falseかつblockersにQAセクション不足が含まれる',
          qaComplete: false,
          expectedPassed: false,
          expectedFragments: ['QA'],
        },
      ])('$title', ({ qaComplete, expectedPassed, expectedFragments }) => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const target = createPhaseLevel(2);
        const evidence = createGateEvidence(sut, target, {
          planningMode: PlanningMode.create('interactive'),
          planEvidences: createPlanEvidenceMap(sut, target, {
            exists: true,
            qaComplete,
            planningModeMatch: qaComplete,
          }),
        });

        // Act
        const actual = sut.checkPhaseGate(target, evidence);

        // Assert
        if (expectedPassed) {
          expect(actual.passed).toBe(true);
        } else {
          expectFailedResult(actual, expectedFragments);
        }
      });
    });

    // UT-PD-015, UT-PD-016
    context('PlanningMode=embedded-qaの場合', () => {
      it.each([
        {
          title: '対話的Q&Aが完了している場合はPhaseGateResult.passed=trueを返す',
          qaComplete: true,
          planningModeMatch: true,
          expectedPassed: true,
          expectedFragments: [] as readonly string[],
        },
        {
          title: '対話的Q&Aが未完了の場合はPhaseGateResult.passed=falseかつblockersにQ&A未完了が含まれる',
          qaComplete: false,
          planningModeMatch: false,
          expectedPassed: false,
          expectedFragments: ['Q&A'],
        },
      ])('$title', ({ qaComplete, planningModeMatch, expectedPassed, expectedFragments }) => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const target = createPhaseLevel(2);
        const evidence = createGateEvidence(sut, target, {
          planningMode: PlanningMode.create('embedded-qa'),
          planEvidences: createPlanEvidenceMap(sut, target, {
            exists: true,
            qaComplete,
            planningModeMatch,
          }),
        });

        // Act
        const actual = sut.checkPhaseGate(target, evidence);

        // Assert
        if (expectedPassed) {
          expect(actual.passed).toBe(true);
        } else {
          expectFailedResult(actual, expectedFragments);
        }
      });
    });

    // UT-PD-017
    context('Level 1を検証する場合', () => {
      it('起点のため前提条件なしでpassed=trueを返す', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const target = createPhaseLevel(1);
        const evidence = {
          artifactStatuses: new Map<string, boolean>(),
          planEvidences: new Map<string, PlanEvidence>(),
          planningMode: PlanningMode.create('interactive'),
        };

        // Act
        const actual = sut.checkPhaseGate(target, evidence);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      });
    });

    // UT-PD-018
    context('無効なLevelを指定する場合', () => {
      it('InvalidPhaseLevelErrorをスローする', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const invalidLevel = { value: 4 } as PhaseLevel;
        const evidence = createGateEvidence(sut, createPhaseLevel(2));

        // Act
        const actual = () => sut.checkPhaseGate(invalidLevel, evidence);

        // Assert
        expect(actual).toThrowError(InvalidPhaseLevelError);
      });
    });
  });
});

target('PhaseStructure.getPhaseNodes', () => {
  describe('指定Levelのフェーズノード一覧を返す', () => {
    // UT-PD-019, UT-PD-020, UT-PD-021
    it.each([
      {
        title: 'Level 1を指定した場合はLevel 1に属するフェーズノードの配列を返す',
        level: 1,
      },
      {
        title: 'Level 2を指定した場合はLevel 2に属するフェーズノードの配列を返す',
        level: 2,
      },
      {
        title: 'Level 3を指定した場合はLevel 3に属するフェーズノードの配列を返す',
        level: 3,
      },
    ])('$title', ({ level }) => {
      // Arrange
      const sut = createDefaultPhaseStructure();
      const input = createPhaseLevel(level);

      // Act
      const actual = sut.getPhaseNodes(input);

      // Assert
      expect(actual.every((node) => node.level.value === level)).toBe(true);
    });

    // UT-PD-022
    context('無効なLevelを指定する場合', () => {
      it('InvalidPhaseLevelErrorをスローする', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const invalidLevel = { value: 99 } as PhaseLevel;

        // Act
        const actual = () => sut.getPhaseNodes(invalidLevel);

        // Assert
        expect(actual).toThrowError(InvalidPhaseLevelError);
      });
    });
  });
});

target('PhaseStructure.buildDependencyGraph', () => {
  describe('フェーズ依存グラフを構築する', () => {
    // UT-PD-023
    context('既定のPhaseStructureを対象にする場合', () => {
      it('全依存関係を含むグラフ構造を返す', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();

        // Act
        const actual = sut.buildDependencyGraph();

        // Assert
        expect(actual.nodes.length).toBeGreaterThan(0);
        expect(actual.edges.length).toBeGreaterThan(0);
      });
    });

    // UT-PD-024
    context('Level間依存を確認する場合', () => {
      it('requires型で含まれる', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();

        // Act
        const actual = sut.buildDependencyGraph();

        // Assert
        expect(actual.edges.some((edge) => edge.type === 'requires' && edge.isCrossLevel())).toBe(true);
      });
    });
  });
});

target('PhaseStructure.applyCustomization', () => {
  describe('カスタマイズポリシーを適用する', () => {
    // UT-PD-025
    context('追加依存だけを持つ場合', () => {
      it('ポリシーが正常に適用される', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          preset: 'custom',
          rules: [
            createCustomRule({
              targetPhase: '3:story-implementor',
              action: ['2:unit-test-logic-designer'],
            }),
          ],
        });

        // Act
        const actual = sut.applyCustomization(policy);

        // Assert
        expect(actual.buildDependencyGraph().edges.length).toBeGreaterThan(
          sut.buildDependencyGraph().edges.length,
        );
      });
    });

    // UT-PD-026
    context('Level間依存を緩和するルールを適用する場合', () => {
      it('NonRelaxableDependencyOverrideErrorをスローする', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          preset: 'custom',
          rules: [
            createCustomRule({
              targetPhase: '2:domain-designer',
              action: ['remove:1:unit-designer'],
            }),
          ],
        });

        // Act
        const actual = () => sut.applyCustomization(policy);

        // Assert
        expect(actual).toThrowError(NonRelaxableDependencyOverrideError);
      });
    });

    // UT-PD-027
    context('override=trueでLevel間依存を緩和しようとする場合', () => {
      it('NonRelaxableDependencyOverrideErrorをスローする', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          preset: 'custom',
          overrideEnabled: true,
          rules: [
            createCustomRule({
              targetPhase: '2:domain-designer',
              action: ['remove:1:unit-designer'],
            }),
          ],
        });

        // Act
        const actual = () => sut.applyCustomization(policy);

        // Assert
        expect(actual).toThrowError(NonRelaxableDependencyOverrideError);
      });
    });

    // UT-PD-028
    context('override=trueでTDD最低保証を緩和しようとする場合', () => {
      it('NonRelaxableDependencyOverrideErrorをスローする', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          preset: 'custom',
          overrideEnabled: true,
          rules: [
            createCustomRule({
              targetPhase: '3:implementation-readiness-checker',
              action: ['remove:2:unit-test-designer'],
            }),
          ],
        });

        // Act
        const actual = () => sut.applyCustomization(policy);

        // Assert
        expect(actual).toThrowError(NonRelaxableDependencyOverrideError);
      });
    });

    // UT-PD-029, UT-PD-030, UT-PD-031
    context('override=trueで追加依存のみを適用する場合', () => {
      it('監査ペイロード付きで正常に適用される', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          preset: 'custom',
          overrideEnabled: true,
          rules: [
            createCustomRule({
              targetPhase: '3:story-implementor',
              action: ['2:unit-test-logic-designer'],
            }),
          ],
        });

        // Act
        const actual = sut.applyCustomization(policy);

        // Assert
        expect(actual.buildDependencyGraph().edges.length).toBeGreaterThan(
          sut.buildDependencyGraph().edges.length,
        );
        expectAuditPayload(actual, 1);
      });
    });

    // UT-PD-032
    context('未知ノードを参照する場合', () => {
      it('InvalidCustomRuleErrorをスローする', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          preset: 'custom',
          rules: [
            createCustomRule({
              targetPhase: '3:story-implementor',
              action: ['unknown-node'],
            }),
          ],
        });

        // Act
        const actual = () => sut.applyCustomization(policy);

        // Assert
        expect(actual).toThrowError(InvalidCustomRuleError);
      });
    });

    // UT-PD-033
    context('巡回依存が発生する場合', () => {
      it('CyclicPhaseDependencyErrorをスローする', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const policy = createPhaseCustomizationPolicy({
          preset: 'custom',
          rules: [
            createCustomRule({
              targetPhase: '1:product-architect',
              action: ['2:domain-designer'],
            }),
          ],
        });

        // Act
        const actual = () => sut.applyCustomization(policy);

        // Assert
        expect(actual).toThrowError(CyclicPhaseDependencyError);
      });
    });
  });
});

target('PhaseStructure.getDependencies', () => {
  describe('ノードの依存関係を返す', () => {
    // UT-PD-034
    context('依存先が存在するノードを指定する場合', () => {
      it('該当する依存関係の配列を返す', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const node = sut.getPhaseNodes(createPhaseLevel(2))[0];

        // Act
        const actual = sut.getDependencies(node);

        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(actual.every((dependency) => dependency.from.equals(node))).toBe(true);
      });
    });

    // UT-PD-035
    context('依存先が存在しないノードを指定する場合', () => {
      it('空配列を返す', () => {
        // Arrange
        const sut = createDefaultPhaseStructure();
        const node = sut
          .getPhaseNodes(createPhaseLevel(3))
          .find((candidate) => candidate.skillName === 'story-implementor') as PhaseNode;

        // Act
        const actual = sut.getDependencies(node);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});

target('PhaseLevel.create', () => {
  describe('PhaseLevelを生成する', () => {
    // UT-PD-039, UT-PD-040, UT-PD-089, UT-PD-092, UT-PD-093, UT-PD-094
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

target('PhaseLevel.isHigherThan', () => {
  describe('他のPhaseLevelとの大小比較を行う', () => {
    // UT-PD-041
    context('Level 2とLevel 1を比較する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createPhaseLevel(2);
        const right = createPhaseLevel(1);

        // Act
        const actual = left.isHigherThan(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-PD-042
    context('Level 1とLevel 2を比較する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const left = createPhaseLevel(1);
        const right = createPhaseLevel(2);

        // Act
        const actual = left.isHigherThan(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('PhaseLevel.isPrerequisiteOf', () => {
  describe('前提条件関係を判定する', () => {
    // UT-PD-043
    context('Level 1がLevel 2の前提かを判定する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createPhaseLevel(1);
        const right = createPhaseLevel(2);

        // Act
        const actual = left.isPrerequisiteOf(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-PD-044
    context('Level 2がLevel 1の前提かを判定する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const left = createPhaseLevel(2);
        const right = createPhaseLevel(1);

        // Act
        const actual = left.isPrerequisiteOf(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('PhaseLevel.equals', () => {
  describe('値等価性を判定する', () => {
    // UT-PD-045
    context('同一値のPhaseLevelを比較する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createPhaseLevel(2);
        const right = createPhaseLevel(2);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-PD-046
    context('異なる値のPhaseLevelを比較する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const left = createPhaseLevel(1);
        const right = createPhaseLevel(2);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('Artifact.create', () => {
  describe('Artifactを生成する', () => {
    // UT-PD-047, UT-PD-051, UT-PD-052, UT-PD-096, UT-PD-097
    it.each([
      {
        title: 'pathが"docs/"で始まる有効なパスの場合はArtifactが正常に生成される',
        input: { name: 'artifact', path: 'docs/product/construction/phase-dependency-model/domain_model.md', required: true },
      },
      {
        title: 'required=falseかつpathにプレースホルダが含まれる場合はArtifactが正常に生成される',
        input: { name: 'artifact', path: 'docs/inception/{unit}/{storyId}/logical_design.md', required: false },
      },
      {
        title: 'required=trueかつ有効なパスの場合はrequired=trueのArtifactが生成される',
        input: { name: 'artifact', path: 'docs/product/construction/phase-dependency-model/logical_design.md', required: true },
      },
      {
        title: '"docs/"を指定した場合は正常生成される',
        input: { name: 'artifact', path: 'docs/', required: true },
      },
      {
        title: '"docs/valid.md"を指定した場合は正常生成される',
        input: { name: 'artifact', path: 'docs/valid.md', required: true },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const props = input;

      // Act
      const actual = Artifact.create(props);

      // Assert
      expect(actual.path).toBe(props.path);
      expect(actual.required).toBe(props.required);
    });

    // UT-PD-048, UT-PD-049, UT-PD-050, UT-PD-095, UT-PD-098, UT-PD-099
    it.each([
      {
        title: 'pathが空文字の場合はInvalidArtifactPathErrorをスローする',
        input: { name: 'artifact', path: '', required: true },
      },
      {
        title: 'pathが"docs/"で始まらない場合はInvalidArtifactPathErrorをスローする',
        input: { name: 'artifact', path: 'src/invalid.md', required: true },
      },
      {
        title: 'required=trueかつ未知プレースホルダが含まれる場合はInvalidArtifactPathErrorをスローする',
        input: { name: 'artifact', path: 'docs/product/{unknown}/domain_model.md', required: true },
      },
      {
        title: '空文字を指定した場合はInvalidArtifactPathErrorをスローする',
        input: { name: 'artifact', path: '', required: true },
      },
      {
        title: '"src/invalid.md"を指定した場合はInvalidArtifactPathErrorをスローする',
        input: { name: 'artifact', path: 'src/invalid.md', required: true },
      },
      {
        title: '"DOCS/upper.md"を指定した場合はInvalidArtifactPathErrorをスローする',
        input: { name: 'artifact', path: 'DOCS/upper.md', required: true },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const props = input;

      // Act
      const actual = () => Artifact.create(props);

      // Assert
      expect(actual).toThrowError(InvalidArtifactPathError);
    });
  });
});

target('Artifact.equals', () => {
  describe('値等価性を判定する', () => {
    // UT-PD-053
    context('同一属性のArtifactを比較する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createArtifact();
        const right = createArtifact();

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('PhaseNode.create', () => {
  describe('PhaseNodeを生成する', () => {
    // UT-PD-054, UT-PD-056, UT-PD-057
    it.each([
      {
        title: 'skillNameとartifactsとlevelが有効な場合はPhaseNodeが正常に生成される',
        input: {
          skillName: 'domain-designer',
          artifacts: [createArtifact()],
          level: createPhaseLevel(2),
        },
      },
      {
        title: 'Level 3でstoryIdプレースホルダが設定されている場合はPhaseNodeが正常に生成される',
        input: {
          skillName: 'story-implementor',
          artifacts: [
            createArtifact({
              path: 'docs/inception/phase-dependency-model/{storyId}/tdd_implementation_plan.md',
              required: false,
            }),
          ],
          level: createPhaseLevel(3),
        },
      },
      {
        title: '複数のArtifactを持つ場合は全Artifactが保持されたPhaseNodeが生成される',
        input: {
          skillName: 'unit-designer',
          artifacts: [
            createArtifact(),
            createArtifact({
              name: 'integration-contract',
              path: 'docs/product/units/integration_contract.md',
              required: true,
            }),
          ],
          level: createPhaseLevel(1),
        },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const props = input;

      // Act
      const actual = PhaseNode.create(props);

      // Assert
      expect(actual.skillName).toBe(props.skillName);
      expect(actual.level.equals(props.level)).toBe(true);
      expect(actual.artifacts).toEqual(props.artifacts);
    });

    // UT-PD-055
    context('skillNameが空文字の場合', () => {
      it('エラーをスローする', () => {
        // Arrange
        const input = {
          skillName: '',
          artifacts: [createArtifact()],
          level: createPhaseLevel(2),
        };

        // Act
        const actual = () => PhaseNode.create(input);

        // Assert
        expect(actual).toThrowError(Error);
      });
    });
  });
});

target('PhaseNode.equals', () => {
  describe('値等価性を判定する', () => {
    // UT-PD-058
    context('同一属性のPhaseNodeを比較する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createPhaseNode();
        const right = createPhaseNode();

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-PD-059
    context('skillNameが異なるPhaseNodeを比較する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const left = createPhaseNode({ skillName: 'domain-designer' });
        const right = createPhaseNode({ skillName: 'logical-designer' });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('PhaseDependency.create', () => {
  describe('PhaseDependencyを生成する', () => {
    // UT-PD-062, UT-PD-063
    it.each([
      {
        title: 'fromとtoが同一ノードの場合はInvalidPhaseDependencyErrorをスローする',
        input: (() => {
          const node = createPhaseNode();
          return { from: node, to: node, type: 'requires' };
        })(),
      },
      {
        title: 'typeがrequires/recommends以外の場合はInvalidPhaseDependencyErrorをスローする',
        input: {
          from: createPhaseNode({ skillName: 'domain-designer' }),
          to: createPhaseNode({ skillName: 'logical-designer' }),
          type: 'invalid',
        },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const props = input;

      // Act
      const actual = () => PhaseDependency.create(props as never);

      // Assert
      expect(actual).toThrowError(InvalidPhaseDependencyError);
    });
  });
});

target('PhaseDependency.equals', () => {
  describe('値等価性を判定する', () => {
    // UT-PD-064
    context('同一属性のPhaseDependencyを比較する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createPhaseDependency();
        const right = createPhaseDependency();

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('PlanEvidence.create', () => {
  describe('PlanEvidenceを生成する', () => {
    // UT-PD-070, UT-PD-071, UT-PD-074, UT-PD-103, UT-PD-106, UT-PD-107
    it.each([
      {
        title: 'exists=true, qaComplete=true, planningModeMatch=trueの場合はPlanEvidenceが正常に生成される',
        input: { exists: true, qaComplete: true, planningModeMatch: true },
      },
      {
        title: 'exists=falseの場合はqaComplete=false, planningModeMatch=falseのPlanEvidenceが生成される',
        input: { exists: false, qaComplete: false, planningModeMatch: false },
      },
      {
        title: 'exists=true, qaComplete=false, planningModeMatch=falseの場合はPlanEvidenceが正常に生成される',
        input: { exists: true, qaComplete: false, planningModeMatch: false },
      },
      {
        title: 'false, false, false は正常生成される',
        input: { exists: false, qaComplete: false, planningModeMatch: false },
      },
      {
        title: 'true, false, false は正常生成される',
        input: { exists: true, qaComplete: false, planningModeMatch: false },
      },
      {
        title: 'true, true, true は正常生成される',
        input: { exists: true, qaComplete: true, planningModeMatch: true },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const props = input;

      // Act
      const actual = PlanEvidence.create(props);

      // Assert
      expect(actual.exists).toBe(props.exists);
      expect(actual.qaComplete).toBe(props.qaComplete);
      expect(actual.planningModeMatch).toBe(props.planningModeMatch);
    });

    // UT-PD-072, UT-PD-073, UT-PD-104, UT-PD-105
    it.each([
      {
        title: 'exists=falseかつqaComplete=trueを指定した場合は矛盾するためエラーをスローする',
        input: { exists: false, qaComplete: true, planningModeMatch: false },
      },
      {
        title: 'planningModeMatch=trueかつexists=falseを指定した場合は矛盾するためエラーをスローする',
        input: { exists: false, qaComplete: false, planningModeMatch: true },
      },
      {
        title: 'false, true, false はエラーになる',
        input: { exists: false, qaComplete: true, planningModeMatch: false },
      },
      {
        title: 'false, false, true はエラーになる',
        input: { exists: false, qaComplete: false, planningModeMatch: true },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const props = input;

      // Act
      const actual = () => PlanEvidence.create(props);

      // Assert
      expect(actual).toThrowError(Error);
    });
  });
});

target('PhaseGateResult.create', () => {
  describe('PhaseGateResultを生成する', () => {
    // UT-PD-084, UT-PD-085, UT-PD-087, UT-PD-088
    it.each([
      {
        title: 'passed=trueかつblockersが空の場合はPhaseGateResultが正常に生成される',
        input: { passed: true, blockers: [], warnings: [] },
      },
      {
        title: 'passed=falseかつblockersが1件以上の場合はPhaseGateResultが正常に生成される',
        input: { passed: false, blockers: ['blocker'], warnings: [] },
      },
      {
        title: 'auditPayloadが付与されている場合はauditPayloadを保持したPhaseGateResultが生成される',
        input: {
          passed: true,
          blockers: [],
          warnings: [],
          auditPayload: {
            appliedRules: ['2:unit-test-logic-designer->3:story-implementor'],
            generatedAt: '2026-03-14T00:00:00.000Z',
            requestedOverride: true,
          },
        },
      },
      {
        title: 'passed=trueかつwarningsが含まれる場合はwarningsを保持したPhaseGateResultが生成される',
        input: { passed: true, blockers: [], warnings: ['warning'] },
      },
    ])('$title', ({ input }) => {
      // Arrange
      const props = input;

      // Act
      const actual = PhaseGateResult.create(props);

      // Assert
      expect(actual.passed).toBe(props.passed);
      expect(actual.blockers).toEqual(props.blockers);
      expect(actual.warnings).toEqual(props.warnings);
      if ('auditPayload' in props) {
        expect(actual.auditPayload).toEqual(props.auditPayload);
      }
    });

    // UT-PD-086
    context('passed=falseかつblockersが空の場合', () => {
      it('矛盾するためエラーをスローする', () => {
        // Arrange
        const input = { passed: false, blockers: [], warnings: [] };

        // Act
        const actual = () => PhaseGateResult.create(input);

        // Assert
        expect(actual).toThrowError(Error);
      });
    });
  });
});

target('ドメインエラー網羅性', () => {
  describe('代表的な失敗経路を確認する', () => {
    // UT-PD-108, UT-PD-110, UT-PD-111, UT-PD-112, UT-PD-113, UT-PD-114
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
      {
        title: 'PhaseDependency制約違反時はInvalidPhaseDependencyErrorへ到達する',
        execute: () => {
          const node = createPhaseNode();
          PhaseDependency.create({ from: node, to: node, type: 'requires' });
        },
        expectedError: InvalidPhaseDependencyError,
      },
      {
        title: 'CustomRuleが未知ノード参照または必須項目不足の場合はInvalidCustomRuleErrorへ到達する',
        execute: () => {
          const sut = createDefaultPhaseStructure();
          sut.applyCustomization(
            createPhaseCustomizationPolicy({
              preset: 'custom',
              rules: [
                createCustomRule({
                  targetPhase: '3:story-implementor',
                  action: ['unknown-node'],
                }),
              ],
            }),
          );
        },
        expectedError: InvalidCustomRuleError,
      },
      {
        title: 'Level間依存またはTDD最低保証の緩和を試行した場合はNonRelaxableDependencyOverrideErrorへ到達する',
        execute: () => {
          const sut = createDefaultPhaseStructure();
          sut.applyCustomization(
            createPhaseCustomizationPolicy({
              preset: 'custom',
              overrideEnabled: true,
              rules: [
                createCustomRule({
                  targetPhase: '3:implementation-readiness-checker',
                  action: ['remove:2:unit-test-designer'],
                }),
              ],
            }),
          );
        },
        expectedError: NonRelaxableDependencyOverrideError,
      },
      {
        title: 'カスタムルール適用後に循環依存が発生する場合はCyclicPhaseDependencyErrorへ到達する',
        execute: () => {
          const sut = createDefaultPhaseStructure();
          sut.applyCustomization(
            createPhaseCustomizationPolicy({
              preset: 'custom',
              rules: [
                createCustomRule({
                  targetPhase: '1:product-architect',
                  action: ['2:domain-designer'],
                }),
              ],
            }),
          );
        },
        expectedError: CyclicPhaseDependencyError,
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
