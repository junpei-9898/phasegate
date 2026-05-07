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

export const STANDARD_PHASE_NODES: readonly PhaseNode[] = Object.freeze([
  createNode(1, 'product-architect', [
    {
      name: 'product-overview-plan',
      path: '{inceptionDocsRoot}/_shared/product_overview_plan.md',
      required: true,
    },
    {
      name: 'product-overview',
      path: 'docs/product/product_overview.md',
      required: true,
    },
  ]),
  createNode(1, 'story-writer', [
    {
      name: 'story-writer-plan',
      path: '{inceptionDocsRoot}/_shared/story_writer_plan.md',
      required: true,
    },
    {
      name: 'user-stories',
      path: 'docs/product/user_stories.md',
      required: true,
    },
  ]),
  createNode(2, 'domain-designer', [
    {
      name: 'domain-model-plan',
      path: '{inceptionDocsRoot}/{unit}/domain_model_plan.md',
      required: true,
    },
    {
      name: 'domain-model',
      path: '{designDocsRoot}/{unit}/domain_model.md',
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
  createNode(3, 'logical-designer', [
    {
      name: 'story-logical-design-plan',
      path: '{inceptionDocsRoot}/{unit}/{storyId}/logical_design_plan.md',
      required: false,
    },
    {
      name: 'story-logical-design',
      path: '{inceptionDocsRoot}/{unit}/{storyId}/logical_design.md',
      required: false,
    },
  ]),
  createNode(3, 'scenario-test-designer', [
    {
      name: 'scenario-test-plan',
      path: '{inceptionDocsRoot}/{unit}/{storyId}/scenario_test_plan.md',
      required: false,
    },
    {
      name: 'scenario-test-design',
      path: '{inceptionDocsRoot}/{unit}/{storyId}/scenario_test_design.md',
      required: false,
    },
  ]),
  createNode(3, 'scenario-test-logic-designer', [
    {
      name: 'scenario-test-logic-plan',
      path: '{inceptionDocsRoot}/{unit}/{storyId}/scenario_test_logic_plan.md',
      required: false,
    },
    {
      name: 'scenario-test-logic',
      path: '{inceptionDocsRoot}/{unit}/{storyId}/scenario_test_logic.md',
      required: false,
    },
  ]),
  createNode(3, 'implementation-readiness-checker', []),
  createNode(3, 'story-implementor', [
    {
      name: 'tdd-implementation-plan',
      path: '{inceptionDocsRoot}/{unit}/{storyId}/tdd_implementation_plan.md',
      required: false,
    },
  ]),
]);
