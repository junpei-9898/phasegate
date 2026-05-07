/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { PhaseInfoDto } from '../dto/phase-info-dto.js';
import type { PhaseDependency } from '../../domain/values/phase-dependency.js';
import type { PhaseNode } from '../../domain/values/phase-node.js';
import type { PlanEvidence } from '../../domain/values/plan-evidence.js';
import { DEFAULT_PATH_ROOTS, type PathRoots } from '../../domain/values/artifact.js';

export interface ResolvedPhaseInfo
  extends Omit<PhaseInfoDto, 'unitId' | 'storyId'> {}

const unique = (values: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(values)]);

const collectIncomingDependencies = (
  dependencies: readonly PhaseDependency[],
): ReadonlyMap<string, readonly PhaseDependency[]> => {
  const actual = new Map<string, PhaseDependency[]>();

  for (const dependency of dependencies) {
    const existing = actual.get(dependency.to.nodeKey()) ?? [];
    existing.push(dependency);
    actual.set(dependency.to.nodeKey(), existing);
  }

  return new Map(
    [...actual.entries()].map(([nodeKey, nodeDependencies]) => [
      nodeKey,
      Object.freeze([...nodeDependencies]),
    ]),
  );
};

export class PhaseInfoResolver {
  resolve(
    graph: {
      readonly nodes: readonly PhaseNode[];
      readonly dependencies: readonly PhaseDependency[];
    },
    artifactStatuses: ReadonlyMap<string, boolean>,
    planEvidences: ReadonlyMap<string, PlanEvidence>,
    pathRoots: PathRoots = DEFAULT_PATH_ROOTS,
  ): ResolvedPhaseInfo {
    const incomingDependencies = collectIncomingDependencies(graph.dependencies);
    const completedNodeKeys = new Set<string>();
    let progressed = true;

    while (progressed) {
      progressed = false;

      for (const node of graph.nodes) {
        if (completedNodeKeys.has(node.nodeKey())) {
          continue;
        }

        const requiresDependencies = (incomingDependencies.get(node.nodeKey()) ?? []).filter(
          (dependency) => dependency.type === 'requires',
        );
        const dependenciesSatisfied = requiresDependencies.every((dependency) =>
          completedNodeKeys.has(dependency.from.nodeKey()),
        );

        if (!dependenciesSatisfied) {
          continue;
        }

        const artifactsSatisfied = node
          .requiredArtifacts()
          .every((artifact) => artifactStatuses.get(artifact.path) === true);
        const planSatisfied =
          node.planArtifacts().length === 0 ||
          (() => {
            const actual = planEvidences.get(node.nodeKey());
            return actual?.exists === true && actual.qaComplete && actual.planningModeMatch;
          })();

        if (artifactsSatisfied && planSatisfied) {
          completedNodeKeys.add(node.nodeKey());
          progressed = true;
        }
      }
    }

    const completedNodes = graph.nodes
      .map((node) => node.nodeKey())
      .filter((nodeKey) => completedNodeKeys.has(nodeKey));
    const nextNodes = graph.nodes
      .filter((node) => !completedNodeKeys.has(node.nodeKey()))
      .filter((node) =>
        (incomingDependencies.get(node.nodeKey()) ?? [])
          .filter((dependency) => dependency.type === 'requires')
          .every((dependency) => completedNodeKeys.has(dependency.from.nodeKey())),
      )
      .map((node) => node.nodeKey());
    const blockers: string[] = [];

    for (const node of graph.nodes) {
      if (completedNodeKeys.has(node.nodeKey())) {
        continue;
      }

      for (const dependency of (incomingDependencies.get(node.nodeKey()) ?? []).filter(
        (entry) => entry.type === 'requires' && !completedNodeKeys.has(entry.from.nodeKey()),
      )) {
        blockers.push(`依存未充足です: ${dependency.from.nodeKey()} -> ${dependency.to.nodeKey()}`);
      }

      for (const artifact of node.requiredArtifacts()) {
        if (artifactStatuses.get(artifact.path) !== true) {
          blockers.push(`成果物が不足しています: ${artifact.expandRoots(pathRoots)}`);
        }
      }

      if (node.planArtifacts().length > 0) {
        const actual = planEvidences.get(node.nodeKey());

        if (!actual?.exists) {
          blockers.push(`plan文書が不足しています: ${node.nodeKey()}`);
          continue;
        }
        if (!actual.qaComplete) {
          blockers.push(`QAが未完了です: ${node.nodeKey()}`);
        }
        if (!actual.planningModeMatch) {
          blockers.push(`Planning Mode要件を満たしていません: ${node.nodeKey()}`);
        }
      }
    }

    const currentLevel = (() => {
      if (nextNodes.length > 0) {
        return graph.nodes
          .filter((node) => nextNodes.includes(node.nodeKey()))
          .reduce<1 | 2 | 3>((min, node) => (node.level.value < min ? node.level.value : min), 3);
      }

      const incompleteNodes = graph.nodes.filter((node) => !completedNodeKeys.has(node.nodeKey()));
      if (incompleteNodes.length === 0) {
        return 3;
      }

      return incompleteNodes.reduce<1 | 2 | 3>(
        (min, node) => (node.level.value < min ? node.level.value : min),
        3,
      );
    })();

    return Object.freeze({
      currentLevel,
      completedNodes: Object.freeze([...completedNodes]),
      nextNodes: unique(nextNodes),
      blockers: unique(blockers),
    });
  }
}
