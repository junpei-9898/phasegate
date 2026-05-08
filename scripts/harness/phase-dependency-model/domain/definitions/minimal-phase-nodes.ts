/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { Artifact } from '../values/artifact.js';
import { PhaseLevel } from '../values/phase-level.js';
import { PhaseNode } from '../values/phase-node.js';

const createNode = (
  level: 1 | 2 | 3,
  skillName: string,
  artifacts: readonly {
    readonly name: string;
    readonly path: string;
    readonly required: boolean;
  }[],
): PhaseNode =>
  PhaseNode.create({
    skillName,
    level: PhaseLevel.create(level),
    artifacts: artifacts.map((artifact) => Artifact.create(artifact)),
  });

export const MINIMAL_PHASE_NODES: readonly PhaseNode[] = Object.freeze([
  createNode(1, 'product-architect', [
    {
      name: 'product-overview-plan',
      path: '{inceptionDocsRoot}/_shared/product_overview_plan.md',
      required: true,
    },
    {
      name: 'product-overview',
      path: '{designDocsRoot}/../product_overview.md',
      required: true,
    },
  ]),
  createNode(2, 'logical-designer', [
    {
      name: 'logical-design-plan',
      path: '{inceptionDocsRoot}/{unit}/logical_design_plan.md',
      required: true,
    },
    {
      name: 'logical-design',
      path: '{designDocsRoot}/{unit}/logical_design.md',
      required: true,
    },
  ]),
]);
