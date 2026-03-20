/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { PhaseInfoDto } from '../dto/phase-info-dto.js';
import { EvidenceBundleAssembler } from '../services/evidence-bundle-assembler.js';
import type { PhaseInfoResolver } from '../services/phase-info-resolver.js';
import { PhaseStructure } from '../../domain/models/phase-structure.js';
import type { PhaseConfigProviderPort } from '../../domain/ports/phase-config-provider-port.js';
import { PhaseLevel } from '../../domain/values/phase-level.js';

export interface GetPhaseInfoInput {
  readonly unitId: string;
  readonly storyId?: string;
}

export interface GetPhaseInfoUseCaseDeps {
  readonly phaseConfigProvider: PhaseConfigProviderPort;
  readonly evidenceBundleAssembler: EvidenceBundleAssembler;
  readonly phaseInfoResolver: PhaseInfoResolver;
}

export class GetPhaseInfoUseCase {
  private readonly phaseConfigProvider: PhaseConfigProviderPort;
  private readonly evidenceBundleAssembler: EvidenceBundleAssembler;
  private readonly phaseInfoResolver: PhaseInfoResolver;

  constructor(deps: GetPhaseInfoUseCaseDeps) {
    this.phaseConfigProvider = deps.phaseConfigProvider;
    this.evidenceBundleAssembler = deps.evidenceBundleAssembler;
    this.phaseInfoResolver = deps.phaseInfoResolver;
  }

  async execute(input: GetPhaseInfoInput): Promise<PhaseInfoDto> {
    const policy = await this.phaseConfigProvider.getCustomizationPolicy();
    const phaseStructure = PhaseStructure.createDefault(policy);
    const graph = phaseStructure.buildDependencyGraph();
    const evidenceBundle = await this.evidenceBundleAssembler.assembleForLevel(
      PhaseLevel.create(3),
      graph.nodes,
      {
        unitId: input.unitId,
        storyId: input.storyId,
      },
    );
    const resolved = this.phaseInfoResolver.resolve(
      graph,
      evidenceBundle.artifactStatuses,
      evidenceBundle.planEvidences,
    );

    return Object.freeze({
      unitId: input.unitId,
      ...(input.storyId !== undefined ? { storyId: input.storyId } : {}),
      currentLevel: resolved.currentLevel,
      completedNodes: Object.freeze([...resolved.completedNodes]),
      nextNodes: Object.freeze([...resolved.nextNodes]),
      blockers: Object.freeze([...resolved.blockers]),
    });
  }
}
