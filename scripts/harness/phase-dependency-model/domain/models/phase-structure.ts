/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { DEFAULT_PHASE_DEPENDENCIES } from '../definitions/default-phase-dependencies.js';
import { DEFAULT_PHASE_NODES } from '../definitions/default-phase-nodes.js';
import { CustomRule, InvalidCustomRuleError } from '../values/custom-rule.js';
import { PhaseCustomizationPolicy } from '../values/phase-customization-policy.js';
import { PhaseDependency } from '../values/phase-dependency.js';
import { PhaseGateResult } from '../values/phase-gate-result.js';
import { InvalidPhaseLevelError, PhaseLevel } from '../values/phase-level.js';
import { PhaseNode } from '../values/phase-node.js';
import { PlanEvidence } from '../values/plan-evidence.js';
import { PlanningMode } from '../values/planning-mode.js';

export class NonRelaxableDependencyOverrideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRelaxableDependencyOverrideError';
  }
}

export class CyclicPhaseDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CyclicPhaseDependencyError';
  }
}

interface PhaseStructureArgs {
  readonly levels: ReadonlyMap<1 | 2 | 3, readonly PhaseNode[]>;
  readonly nodeIndex: ReadonlyMap<string, PhaseNode>;
  readonly defaultDependencies: readonly PhaseDependency[];
  readonly effectiveDependencies: readonly PhaseDependency[];
  readonly customizationPolicy: PhaseCustomizationPolicy;
  readonly nonRelaxableDependencies: readonly PhaseDependency[];
  readonly auditPayload?: {
    readonly appliedRules: readonly string[];
    readonly generatedAt: string;
    readonly requestedOverride: boolean;
  };
}

const dependencyKey = (dependency: PhaseDependency): string =>
  `${dependency.from.nodeKey()}->${dependency.to.nodeKey()}:${dependency.type}`;

const buildLevels = (nodes: readonly PhaseNode[]): ReadonlyMap<1 | 2 | 3, readonly PhaseNode[]> =>
  new Map<1 | 2 | 3, readonly PhaseNode[]>([
    [1, Object.freeze(nodes.filter((node) => node.level.value === 1))],
    [2, Object.freeze(nodes.filter((node) => node.level.value === 2))],
    [3, Object.freeze(nodes.filter((node) => node.level.value === 3))],
  ]);

const buildNodeIndex = (nodes: readonly PhaseNode[]): ReadonlyMap<string, PhaseNode> => {
  const actual = new Map<string, PhaseNode>();

  for (const node of nodes) {
    const key = node.nodeKey();
    if (actual.has(key)) {
      throw new InvalidCustomRuleError(`重複するノードキーです: ${key}`);
    }
    actual.set(key, node);
  }

  return actual;
};

const collectMissingArtifactBlockers = (
  nodes: readonly PhaseNode[],
  artifactStatuses: ReadonlyMap<string, boolean>,
): readonly string[] => {
  const blockers: string[] = [];

  for (const node of nodes) {
    for (const artifact of node.requiredArtifacts()) {
      if (!artifactStatuses.get(artifact.path)) {
        blockers.push(`成果物が不足しています: ${artifact.path}`);
      }
    }
  }

  return Object.freeze(blockers);
};

const resolvePlanEvidence = (
  planEvidences: ReadonlyMap<string, PlanEvidence>,
  node: PhaseNode,
): PlanEvidence =>
  planEvidences.get(node.nodeKey()) ??
  PlanEvidence.create({
    exists: false,
    qaComplete: false,
    planningModeMatch: false,
  });

const createAuditPayload = (
  policy: PhaseCustomizationPolicy,
  appliedRules: readonly string[],
):
  | {
      readonly appliedRules: readonly string[];
      readonly generatedAt: string;
      readonly requestedOverride: boolean;
    }
  | undefined => {
  if (!policy.overrideEnabled || appliedRules.length === 0) {
    return undefined;
  }

  return Object.freeze({
    appliedRules: Object.freeze([...appliedRules]),
    generatedAt: new Date().toISOString(),
    requestedOverride: true,
  });
};

export class PhaseStructure {
  readonly levels: ReadonlyMap<1 | 2 | 3, readonly PhaseNode[]>;
  readonly nodeIndex: ReadonlyMap<string, PhaseNode>;
  readonly defaultDependencies: readonly PhaseDependency[];
  readonly effectiveDependencies: readonly PhaseDependency[];
  readonly customizationPolicy: PhaseCustomizationPolicy;
  readonly nonRelaxableDependencies: readonly PhaseDependency[];
  readonly auditPayload?: {
    readonly appliedRules: readonly string[];
    readonly generatedAt: string;
    readonly requestedOverride: boolean;
  };

  private constructor(args: PhaseStructureArgs) {
    this.levels = args.levels;
    this.nodeIndex = args.nodeIndex;
    this.defaultDependencies = Object.freeze([...args.defaultDependencies]);
    this.effectiveDependencies = Object.freeze([...args.effectiveDependencies]);
    this.customizationPolicy = args.customizationPolicy;
    this.nonRelaxableDependencies = Object.freeze([...args.nonRelaxableDependencies]);
    this.auditPayload = args.auditPayload;
    Object.freeze(this);
  }

  static createDefault(policy: PhaseCustomizationPolicy): PhaseStructure {
    const levels = buildLevels(DEFAULT_PHASE_NODES);
    const nodeIndex = buildNodeIndex(DEFAULT_PHASE_NODES);
    const nonRelaxableDependencies = Object.freeze(
      DEFAULT_PHASE_DEPENDENCIES.filter(
        (dependency) =>
          dependency.isLevelTransition() ||
          dependency.to.nodeKey() === '3:implementation-readiness-checker' ||
          dependency.to.nodeKey() === '3:story-implementor',
      ),
    );
    const base = new PhaseStructure({
      levels,
      nodeIndex,
      defaultDependencies: DEFAULT_PHASE_DEPENDENCIES,
      effectiveDependencies: DEFAULT_PHASE_DEPENDENCIES,
      customizationPolicy: policy,
      nonRelaxableDependencies,
    });

    if (!policy.hasRules()) {
      return base;
    }

    return base.applyCustomization(policy);
  }

  checkPhaseGate(
    targetLevel: PhaseLevel,
    evidence: {
      artifactStatuses: ReadonlyMap<string, boolean>;
      planEvidences: ReadonlyMap<string, PlanEvidence>;
      planningMode: PlanningMode;
    },
  ): PhaseGateResult {
    this.assertLevel(targetLevel);

    if (targetLevel.value === 1) {
      return PhaseGateResult.create({
        passed: true,
        blockers: [],
        warnings: [],
        auditPayload: this.auditPayload,
      });
    }

    const prerequisiteNodes = [1, 2, 3]
      .map((value) => PhaseLevel.create(value))
      .filter((level) => level.isPrerequisiteOf(targetLevel))
      .flatMap((level) => this.getPhaseNodes(level));

    const blockers = [
      ...collectMissingArtifactBlockers(prerequisiteNodes, evidence.artifactStatuses),
    ];
    const completedNodeKeys = new Set<string>();
    const warnings: string[] = [];

    for (const node of prerequisiteNodes) {
      const nodeBlockersBefore = blockers.length;

      if (node.planArtifacts().length > 0) {
        const planEvidence = resolvePlanEvidence(evidence.planEvidences, node);

        if (!planEvidence.exists) {
          blockers.push(`plan文書が不足しています: ${node.nodeKey()}`);
        }

        if (evidence.planningMode.requiresQaSection() && !planEvidence.qaComplete) {
          blockers.push(`QAセクションが不足しています: ${node.nodeKey()}`);
        }

        if (evidence.planningMode.requiresAnsweredQa() && !planEvidence.qaComplete) {
          blockers.push(`Q&Aが未完了です: ${node.nodeKey()}`);
        }

        if (!planEvidence.planningModeMatch) {
          blockers.push(`Planning Mode要件を満たしていません: ${node.nodeKey()}`);
        }
      }

      if (nodeBlockersBefore === blockers.length) {
        completedNodeKeys.add(node.nodeKey());
      }
    }

    for (const dependency of this.effectiveDependencies) {
      if (dependency.to.level.value !== targetLevel.value) {
        continue;
      }

      if (!dependency.from.level.isPrerequisiteOf(targetLevel)) {
        continue;
      }

      if (completedNodeKeys.has(dependency.from.nodeKey())) {
        continue;
      }

      if (dependency.type === 'requires') {
        blockers.push(`依存未充足です: ${dependency.from.nodeKey()} -> ${dependency.to.nodeKey()}`);
        continue;
      }

      warnings.push(`推奨依存が未充足です: ${dependency.from.nodeKey()} -> ${dependency.to.nodeKey()}`);
    }

    return PhaseGateResult.create({
      passed: blockers.length === 0,
      blockers,
      warnings,
      auditPayload: blockers.length === 0 ? this.auditPayload : undefined,
    });
  }

  getPhaseNodes(level: PhaseLevel): readonly PhaseNode[] {
    this.assertLevel(level);
    const actual = this.levels.get(level.value as 1 | 2 | 3);

    if (!actual) {
      throw new InvalidPhaseLevelError(level.value);
    }

    return actual;
  }

  buildDependencyGraph(): {
    readonly nodes: readonly PhaseNode[];
    readonly edges: readonly PhaseDependency[];
    readonly dependencies: readonly PhaseDependency[];
  } {
    return {
      nodes: Object.freeze([...this.nodeIndex.values()]),
      edges: this.effectiveDependencies,
      dependencies: this.effectiveDependencies,
    };
  }

  applyCustomization(policy: PhaseCustomizationPolicy): PhaseStructure {
    const dependencies = [...this.defaultDependencies];
    const dependencyIndex = new Map<string, PhaseDependency>(
      dependencies.map((dependency) => [dependencyKey(dependency), dependency]),
    );
    const appliedRules: string[] = [];

    for (const rule of policy.rules) {
      this.validateRule(rule);

      const target = this.requireNode(rule.targetPhase);

      for (const action of rule.action) {
        if (action.startsWith('remove:')) {
          const sourceKey = action.slice('remove:'.length);
          const source = this.requireNode(sourceKey);
          const candidate = PhaseDependency.create({
            from: source,
            to: target,
            type: 'requires',
          });

          if (this.isNonRelaxable(candidate)) {
            throw new NonRelaxableDependencyOverrideError(
              `削除できない依存です: ${candidate.from.nodeKey()} -> ${candidate.to.nodeKey()}`,
            );
          }

          if (!policy.overrideEnabled) {
            throw new InvalidCustomRuleError('overrideEnabled=false では削除要求を扱えません');
          }

          dependencyIndex.delete(dependencyKey(candidate));
          appliedRules.push(`remove:${candidate.from.nodeKey()}->${candidate.to.nodeKey()}`);
          continue;
        }

        const source = this.requireNode(action);
        const candidate = PhaseDependency.create({
          from: source,
          to: target,
          type: 'requires',
        });

        dependencyIndex.set(dependencyKey(candidate), candidate);
        appliedRules.push(`${candidate.from.nodeKey()}->${candidate.to.nodeKey()}`);
      }
    }

    const effectiveDependencies = Object.freeze([...dependencyIndex.values()]);
    this.ensureAcyclic(effectiveDependencies);

    return new PhaseStructure({
      levels: this.levels,
      nodeIndex: this.nodeIndex,
      defaultDependencies: this.defaultDependencies,
      effectiveDependencies,
      customizationPolicy: policy,
      nonRelaxableDependencies: this.nonRelaxableDependencies,
      auditPayload: createAuditPayload(policy, appliedRules),
    });
  }

  getDependencies(node: PhaseNode): readonly PhaseDependency[] {
    return Object.freeze(
      this.effectiveDependencies.filter((dependency) => dependency.from.equals(node)),
    );
  }

  private assertLevel(level: PhaseLevel): void {
    if (level.value !== 1 && level.value !== 2 && level.value !== 3) {
      throw new InvalidPhaseLevelError(level.value);
    }
  }

  private requireNode(nodeKey: string): PhaseNode {
    const actual = this.nodeIndex.get(nodeKey);

    if (!actual) {
      throw new InvalidCustomRuleError(`未知のノード参照です: ${nodeKey}`);
    }

    return actual;
  }

  private validateRule(rule: CustomRule): void {
    this.requireNode(rule.targetPhase);

    for (const entry of rule.action) {
      if (entry.startsWith('remove:')) {
        this.requireNode(entry.slice('remove:'.length));
        continue;
      }

      this.requireNode(entry);
    }
  }

  private isNonRelaxable(candidate: PhaseDependency): boolean {
    return this.nonRelaxableDependencies.some((dependency) => dependency.equals(candidate));
  }

  private ensureAcyclic(dependencies: readonly PhaseDependency[]): void {
    const adjacency = new Map<string, string[]>();

    for (const nodeKey of this.nodeIndex.keys()) {
      adjacency.set(nodeKey, []);
    }

    for (const dependency of dependencies) {
      adjacency.get(dependency.from.nodeKey())?.push(dependency.to.nodeKey());
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeKey: string): void => {
      if (visited.has(nodeKey)) {
        return;
      }

      if (visiting.has(nodeKey)) {
        throw new CyclicPhaseDependencyError(`巡回依存が検出されました: ${nodeKey}`);
      }

      visiting.add(nodeKey);
      for (const nextNodeKey of adjacency.get(nodeKey) ?? []) {
        visit(nextNodeKey);
      }
      visiting.delete(nodeKey);
      visited.add(nodeKey);
    };

    for (const nodeKey of adjacency.keys()) {
      visit(nodeKey);
    }
  }
}
