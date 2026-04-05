/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { MINIMAL_PHASE_NODES } from './minimal-phase-nodes.js';
import { PhaseDependency } from '../values/phase-dependency.js';
import { PhaseNode } from '../values/phase-node.js';

const nodeIndex = new Map<string, PhaseNode>(
  MINIMAL_PHASE_NODES.map((node) => [node.nodeKey(), node]),
);

const getNode = (nodeKey: string): PhaseNode => {
  const actual = nodeIndex.get(nodeKey);

  if (!actual) {
    throw new Error(`ノードが見つかりません: ${nodeKey}`);
  }

  return actual;
};

const createDependency = (
  from: string,
  to: string,
  type: 'requires' | 'recommends' = 'requires',
): PhaseDependency => PhaseDependency.create({ from: getNode(from), to: getNode(to), type });

export const MINIMAL_PHASE_DEPENDENCIES: readonly PhaseDependency[] = Object.freeze([
  createDependency('1:product-architect', '2:logical-designer'),
]);
