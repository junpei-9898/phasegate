/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { PhaseDependencyGraphDto } from '../dto/phase-dependency-graph-dto.js';
import type { PhaseConfigProviderPort } from '../../domain/ports/phase-config-provider-port.js';
import { PhaseStructure } from '../../domain/models/phase-structure.js';

export interface BuildPhaseDependencyGraphInput {
  readonly includeArtifacts?: boolean;
}

export interface BuildPhaseDependencyGraphUseCaseDeps {
  readonly phaseConfigProvider: PhaseConfigProviderPort;
}

export class BuildPhaseDependencyGraphUseCase {
  private readonly phaseConfigProvider: PhaseConfigProviderPort;

  constructor(deps: BuildPhaseDependencyGraphUseCaseDeps) {
    this.phaseConfigProvider = deps.phaseConfigProvider;
  }

  async execute(input: BuildPhaseDependencyGraphInput): Promise<PhaseDependencyGraphDto> {
    const policy = await this.phaseConfigProvider.getCustomizationPolicy();
    const graph = PhaseStructure.createDefault(policy).buildDependencyGraph();

    return Object.freeze({
      nodes: Object.freeze(
        graph.nodes.map((node) =>
          Object.freeze({
            key: node.nodeKey(),
            level: node.level.value,
            skillName: node.skillName,
            ...(input.includeArtifacts
              ? {
                  artifacts: Object.freeze(node.artifacts.map((artifact) => artifact.path)),
                }
              : {}),
          }),
        ),
      ),
      edges: Object.freeze(
        graph.dependencies.map((dependency) =>
          Object.freeze({
            from: dependency.from.nodeKey(),
            to: dependency.to.nodeKey(),
            type: dependency.type,
          }),
        ),
      ),
    });
  }
}
