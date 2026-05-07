/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { ArtifactExistenceCheckerPort } from '../../domain/ports/artifact-existence-checker-port.js';
import type { PhaseConfigProviderPort } from '../../domain/ports/phase-config-provider-port.js';
import type { PlanDocumentReaderPort } from '../../domain/ports/plan-document-reader-port.js';
import type { PathRoots } from '../../domain/values/artifact.js';
import { PhaseLevel } from '../../domain/values/phase-level.js';
import type { PhaseNode } from '../../domain/values/phase-node.js';
import type { PlanEvidence } from '../../domain/values/plan-evidence.js';
import type { PlanningMode } from '../../domain/values/planning-mode.js';

export interface EvidenceBundleAssemblerDeps {
  readonly artifactExistenceChecker: ArtifactExistenceCheckerPort;
  readonly planDocumentReader: PlanDocumentReaderPort;
  readonly phaseConfigProvider: PhaseConfigProviderPort;
}

export interface EvidenceBundle {
  readonly artifactStatuses: ReadonlyMap<string, boolean>;
  readonly planEvidences: ReadonlyMap<string, PlanEvidence>;
  readonly planningMode: PlanningMode;
  readonly pathRoots: PathRoots;
}

export class EvidenceBundleAssembler {
  private readonly artifactExistenceChecker: ArtifactExistenceCheckerPort;
  private readonly planDocumentReader: PlanDocumentReaderPort;
  private readonly phaseConfigProvider: PhaseConfigProviderPort;

  constructor(deps: EvidenceBundleAssemblerDeps) {
    this.artifactExistenceChecker = deps.artifactExistenceChecker;
    this.planDocumentReader = deps.planDocumentReader;
    this.phaseConfigProvider = deps.phaseConfigProvider;
  }

  async assembleForLevel(
    _level: PhaseLevel,
    nodes: readonly PhaseNode[],
    scope: { unitId?: string; storyId?: string },
  ): Promise<EvidenceBundle> {
    const planningMode = await this.phaseConfigProvider.getPlanningMode(scope);
    const pathRoots = await this.phaseConfigProvider.getPathRoots();
    const artifacts = nodes.flatMap((node) => node.artifacts);
    const resolvedStatuses = await this.artifactExistenceChecker.checkAll(
      artifacts,
      scope,
      pathRoots,
    );
    const artifactStatuses = new Map<string, boolean>();

    for (const artifact of artifacts) {
      try {
        artifactStatuses.set(
          artifact.path,
          resolvedStatuses.get(artifact.resolve(scope, pathRoots)) ?? false,
        );
      } catch {
        artifactStatuses.set(artifact.path, false);
      }
    }

    const planEvidences = new Map<string, PlanEvidence>();
    for (const node of nodes) {
      if (node.planArtifacts().length === 0) {
        continue;
      }

      const actual = await this.planDocumentReader.readEvidence(node, scope, planningMode);
      planEvidences.set(node.nodeKey(), actual);
    }

    return {
      artifactStatuses,
      planEvidences,
      planningMode,
      pathRoots,
    };
  }
}
