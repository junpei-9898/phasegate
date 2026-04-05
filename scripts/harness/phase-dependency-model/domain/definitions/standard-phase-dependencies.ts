/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { STANDARD_PHASE_NODES } from './standard-phase-nodes.js';
import { PhaseDependency } from '../values/phase-dependency.js';
import { PhaseNode } from '../values/phase-node.js';

const nodeIndex = new Map<string, PhaseNode>(
  STANDARD_PHASE_NODES.map((node) => [node.nodeKey(), node]),
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

export const STANDARD_PHASE_DEPENDENCIES: readonly PhaseDependency[] = Object.freeze([
  createDependency('1:product-architect', '1:story-writer'),
  createDependency('1:story-writer', '2:domain-designer'),
  createDependency('2:domain-designer', '2:logical-designer'),
  createDependency('2:logical-designer', '3:logical-designer'),
  createDependency('3:logical-designer', '3:scenario-test-designer'),
  createDependency('3:scenario-test-designer', '3:scenario-test-logic-designer'),
  createDependency('3:scenario-test-logic-designer', '3:implementation-readiness-checker'),
  createDependency('3:implementation-readiness-checker', '3:story-implementor'),
]);
