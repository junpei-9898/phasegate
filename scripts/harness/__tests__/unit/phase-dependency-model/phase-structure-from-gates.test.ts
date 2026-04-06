// @layer test
import { describe, expect, it } from 'vitest';
import { GateGraphValidationError } from '../../../phase-dependency-model/domain/services/gate-graph.js';
import { PhaseStructure } from '../../../phase-dependency-model/domain/models/phase-structure.js';
import { GateDefinition } from '../../../phase-dependency-model/domain/values/gate-definition.js';
import { GateName } from '../../../phase-dependency-model/domain/values/gate-name.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PlanEvidence } from '../../../phase-dependency-model/domain/values/plan-evidence.js';
import { PlanningMode } from '../../../phase-dependency-model/domain/values/planning-mode.js';

const createGateDefinition = (
  overrides: Partial<{
    name: string;
    level: number;
    requires: readonly { path: string; required: boolean }[];
    dependsOn: readonly string[];
  }> = {},
): GateDefinition =>
  GateDefinition.create({
    name: GateName.create(overrides.name ?? 'domain-designer'),
    level: PhaseLevel.create(overrides.level ?? 2),
    requires: overrides.requires ?? [],
    blocks: [],
    dependsOn: Object.freeze((overrides.dependsOn ?? []).map((name) => GateName.create(name))),
  });

const createPolicy = (): PhaseCustomizationPolicy =>
  PhaseCustomizationPolicy.create({
    preset: 'custom',
    rules: [],
    overrideEnabled: false,
  });

describe('PhaseStructure.fromGates', () => {
  it('GateDefinition を PhaseNode と PhaseDependency に変換できること', () => {
    // Arrange
    const gates = [
      createGateDefinition({
        name: 'product-architect',
        level: 1,
        requires: [{ path: 'docs/inception/_shared/product_overview_plan.md', required: true }],
      }),
      createGateDefinition({
        name: 'domain-designer',
        level: 2,
        requires: [{ path: 'docs/product/construction/{unit}/domain_model.md', required: true }],
        dependsOn: ['product-architect'],
      }),
      createGateDefinition({
        name: 'story-implementor',
        level: 3,
        requires: [{ path: 'docs/inception/{unit}/{storyId}/tdd_implementation_plan.md', required: false }],
        dependsOn: ['domain-designer'],
      }),
    ];

    // Act
    const actual = PhaseStructure.fromGates(gates, createPolicy());

    // Assert
    expect(actual.getPhaseNodes(PhaseLevel.create(1)).map((node) => node.nodeKey())).toEqual([
      '1:product-architect',
    ]);
    expect(actual.getPhaseNodes(PhaseLevel.create(2)).map((node) => node.nodeKey())).toEqual([
      '2:domain-designer',
    ]);
    expect(actual.getPhaseNodes(PhaseLevel.create(3)).map((node) => node.nodeKey())).toEqual([
      '3:story-implementor',
    ]);
    expect(
      actual
        .buildDependencyGraph()
        .dependencies.map((dependency) => `${dependency.from.nodeKey()}->${dependency.to.nodeKey()}`),
    ).toEqual([
      '1:product-architect->2:domain-designer',
      '2:domain-designer->3:story-implementor',
    ]);
  });

  it('既存の phase-gate 判定ロジックを継承すること', () => {
    // Arrange
    const sut = PhaseStructure.fromGates(
      [
        createGateDefinition({
          name: 'product-architect',
          level: 1,
          requires: [{ path: 'docs/inception/_shared/product_overview_plan.md', required: true }],
        }),
        createGateDefinition({
          name: 'domain-designer',
          level: 2,
          requires: [{ path: 'docs/product/construction/{unit}/domain_model.md', required: true }],
          dependsOn: ['product-architect'],
        }),
      ],
      createPolicy(),
    );

    // Act
    const actual = sut.checkPhaseGate(
      PhaseLevel.create(2),
      {
        artifactStatuses: new Map([
          ['docs/inception/_shared/product_overview_plan.md', false],
          ['docs/product/construction/{unit}/domain_model.md', true],
        ]),
        planEvidences: new Map<string, PlanEvidence>(),
        planningMode: PlanningMode.create('interactive'),
      },
      { unitId: 'phase-dependency-model' },
    );

    // Assert
    expect(actual.passed).toBe(false);
    expect(actual.blockers).toContain('成果物が不足しています: docs/inception/_shared/product_overview_plan.md');
  });

  it('GateGraph.build のエラーをラップせずに伝搬すること', () => {
    // Arrange
    const gates = [
      createGateDefinition({ name: 'logical-designer', level: 3, dependsOn: ['scenario-test-designer'] }),
      createGateDefinition({ name: 'scenario-test-designer', level: 3, dependsOn: ['logical-designer'] }),
    ];
    const act = (): PhaseStructure => PhaseStructure.fromGates(gates, createPolicy());

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
  });

  it('既存の createDefault の挙動を維持すること', () => {
    // Arrange
    const policy = PhaseCustomizationPolicy.create({
      preset: 'default',
      rules: [],
      overrideEnabled: false,
    });

    // Act
    const actual = PhaseStructure.createDefault(policy);

    // Assert
    expect(actual.getPhaseNodes(PhaseLevel.create(1)).length).toBeGreaterThan(0);
    expect(actual.getPhaseNodes(PhaseLevel.create(2)).length).toBeGreaterThan(0);
    expect(actual.getPhaseNodes(PhaseLevel.create(3)).length).toBeGreaterThan(0);
  });
});
