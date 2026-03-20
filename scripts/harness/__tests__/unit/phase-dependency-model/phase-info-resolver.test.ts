import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { PhaseInfoResolver } from '../../../phase-dependency-model/application/services/phase-info-resolver.js';
import { PhaseStructure } from '../../../phase-dependency-model/domain/models/phase-structure.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PlanEvidence } from '../../../phase-dependency-model/domain/values/plan-evidence.js';

const createPolicy = () =>
  PhaseCustomizationPolicy.create({
    rules: [],
    overrideEnabled: false,
  });

const createPlanEvidence = (overrides?: Partial<{ exists: boolean; qaComplete: boolean; planningModeMatch: boolean }>) =>
  PlanEvidence.create({
    exists: true,
    qaComplete: true,
    planningModeMatch: true,
    ...overrides,
  });

const createCompletedEvidence = (nodeKeys: readonly string[]) => {
  const structure = PhaseStructure.createDefault(createPolicy());
  const graph = structure.buildDependencyGraph();
  const nodes = graph.nodes.filter((node) => nodeKeys.includes(node.nodeKey()));

  return {
    artifactStatuses: new Map(nodes.flatMap((node) => node.requiredArtifacts().map((artifact) => [artifact.path, true] as const))),
    planEvidences: new Map(
      nodes
        .filter((node) => node.planArtifacts().length > 0)
        .map((node) => [node.nodeKey(), createPlanEvidence()] as const),
    ),
    graph,
  };
};

target('PhaseInfoResolver', () => {
  describe('resolve', () => {
    context('Level 1のノードだけが完了している場合', () => {
      it('currentLevel=2と着手可能な次ノードを返すこと', () => {
        // Arrange
        const completedNodeKeys = PhaseStructure.createDefault(createPolicy())
          .getPhaseNodes(PhaseLevel.create(1))
          .map((node) => node.nodeKey());
        const { artifactStatuses, planEvidences, graph } = createCompletedEvidence(completedNodeKeys);
        const sut = new PhaseInfoResolver();

        // Act
        const actual = sut.resolve(graph, artifactStatuses, planEvidences);

        // Assert
        expect(actual.currentLevel).toBe(2);
        expect(actual.completedNodes).toEqual(completedNodeKeys);
        expect(actual.nextNodes).toEqual(['2:domain-designer']);
        expect(actual.blockers.some((entry) => entry.includes('2:domain-designer -> 2:logical-designer'))).toBe(true);
      });
    });

    context('最上流の成果物が未整備の場合', () => {
      it('currentLevel=1と不足中のblockersを返すこと', () => {
        // Arrange
        const graph = PhaseStructure.createDefault(createPolicy()).buildDependencyGraph();
        const sut = new PhaseInfoResolver();

        // Act
        const actual = sut.resolve(graph, new Map(), new Map());

        // Assert
        expect(actual.currentLevel).toBe(1);
        expect(actual.nextNodes).toEqual(['1:product-architect']);
        expect(actual.blockers.some((entry) => entry.includes('docs/inception/_shared/product_overview_plan.md'))).toBe(true);
      });
    });
  });
});
