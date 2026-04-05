// @unit phase-dependency-model
// @layer application

import type { ResolveGateResultDto, ResolveGateFindingDto } from '../dto/resolve-gate-result-dto.js';
import { GateGraph } from '../../domain/services/gate-graph.js';
import type { ArtifactExistenceCheckerPort } from '../../domain/ports/artifact-existence-checker-port.js';
import type { GlobMatcherPort } from '../../domain/ports/glob-matcher-port.js';
import { Artifact } from '../../domain/values/artifact.js';
import type { GateDefinition, GateRequirement } from '../../domain/values/gate-definition.js';

export interface ResolveGateInput {
  readonly targetFilePath: string;
  readonly gates: readonly GateDefinition[];
  readonly scope?: {
    readonly unitId?: string;
    readonly storyId?: string;
  };
}

export interface ResolveGateUseCaseDeps {
  readonly globMatcher: GlobMatcherPort;
  readonly artifactExistenceChecker: ArtifactExistenceCheckerPort;
}

interface RequirementEvaluation {
  readonly gateName: string;
  readonly requirement: GateRequirement;
  readonly resolvedPath: string;
}

export class ResolveGateUseCase {
  private readonly globMatcher: GlobMatcherPort;
  private readonly artifactExistenceChecker: ArtifactExistenceCheckerPort;

  constructor(deps: ResolveGateUseCaseDeps) {
    this.globMatcher = deps.globMatcher;
    this.artifactExistenceChecker = deps.artifactExistenceChecker;
  }

  async execute(input: ResolveGateInput): Promise<ResolveGateResultDto> {
    const graph = GateGraph.build([...input.gates]);
    const matchedGates = input.gates.filter((gate) =>
      gate.blocks.some((pattern) => this.globMatcher.match(pattern, input.targetFilePath)),
    );

    if (matchedGates.length === 0) {
      return Object.freeze({
        matchedGates: Object.freeze([]),
        blockers: Object.freeze([]),
        warnings: Object.freeze([]),
      });
    }

    const evaluationOrder = new Map<string, GateDefinition>();
    for (const gate of matchedGates) {
      for (const ancestorName of graph.resolveAncestors(gate.name)) {
        const ancestor = graph.gates.get(ancestorName.value);
        if (ancestor && !evaluationOrder.has(ancestor.name.value)) {
          evaluationOrder.set(ancestor.name.value, ancestor);
        }
      }

      if (!evaluationOrder.has(gate.name.value)) {
        evaluationOrder.set(gate.name.value, gate);
      }
    }

    const evaluations = [...evaluationOrder.values()].flatMap((gate) =>
      gate.requires.map((requirement) => ({
        gateName: gate.name.value,
        requirement,
        resolvedPath: this.expandPlaceholders(requirement.path, input.scope),
      })),
    );
    const artifacts = evaluations.map((evaluation, index) =>
      Artifact.create({
        name: `${evaluation.gateName}-${index + 1}`,
        path: evaluation.resolvedPath,
        required: evaluation.requirement.required,
      }),
    );
    const statuses = await this.artifactExistenceChecker.checkAll(artifacts, input.scope ?? {});

    const blockers: ResolveGateFindingDto[] = [];
    const warnings: ResolveGateFindingDto[] = [];

    for (const evaluation of evaluations) {
      if (statuses.get(evaluation.resolvedPath) === true) {
        continue;
      }

      const finding = Object.freeze({
        gateName: evaluation.gateName,
        path: evaluation.resolvedPath,
        reason: evaluation.requirement.required
          ? '必須アーティファクトが不足しています'
          : '推奨アーティファクトが不足しています',
      });

      if (evaluation.requirement.required) {
        blockers.push(finding);
      } else {
        warnings.push(finding);
      }
    }

    return Object.freeze({
      matchedGates: Object.freeze(matchedGates.map((gate) => gate.name.value)),
      blockers: Object.freeze(blockers),
      warnings: Object.freeze(warnings),
    });
  }

  private expandPlaceholders(
    path: string,
    scope?: {
      readonly unitId?: string;
      readonly storyId?: string;
    },
  ): string {
    return path
      .replaceAll('{unit}', scope?.unitId ?? '{unit}')
      .replaceAll('{storyId}', scope?.storyId ?? '{storyId}');
  }
}
