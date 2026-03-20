/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { PhaseGateResultDto } from '../dto/phase-gate-result-dto.js';
import { EvidenceBundleAssembler } from '../services/evidence-bundle-assembler.js';
import { PhaseGateResultMapper } from '../services/phase-gate-result-mapper.js';
import { PhaseStructure } from '../../domain/models/phase-structure.js';
import type { PhaseAuditLoggerPort } from '../../domain/ports/phase-audit-logger-port.js';
import type { PhaseConfigProviderPort } from '../../domain/ports/phase-config-provider-port.js';
import { PhaseLevel } from '../../domain/values/phase-level.js';

export interface CheckPhaseGateInput {
  readonly targetLevel: 1 | 2 | 3;
  readonly unitId?: string;
  readonly storyId?: string;
}

export interface CheckPhaseGateUseCaseDeps {
  readonly phaseConfigProvider: PhaseConfigProviderPort;
  readonly evidenceBundleAssembler: EvidenceBundleAssembler;
  readonly auditLogger: PhaseAuditLoggerPort;
}

export class CheckPhaseGateUseCase {
  private readonly phaseConfigProvider: PhaseConfigProviderPort;
  private readonly evidenceBundleAssembler: EvidenceBundleAssembler;
  private readonly auditLogger: PhaseAuditLoggerPort;
  private readonly phaseGateResultMapper: PhaseGateResultMapper;

  constructor(deps: CheckPhaseGateUseCaseDeps) {
    this.phaseConfigProvider = deps.phaseConfigProvider;
    this.evidenceBundleAssembler = deps.evidenceBundleAssembler;
    this.auditLogger = deps.auditLogger;
    this.phaseGateResultMapper = new PhaseGateResultMapper();
  }

  async execute(input: CheckPhaseGateInput): Promise<PhaseGateResultDto> {
    const policy = await this.phaseConfigProvider.getCustomizationPolicy();
    const phaseStructure = PhaseStructure.createDefault(policy);
    const targetLevel = PhaseLevel.create(input.targetLevel);

    phaseStructure.getPhaseNodes(targetLevel);

    const evidenceNodes = [1, 2, 3]
      .filter((value) => value < input.targetLevel)
      .flatMap((value) => phaseStructure.getPhaseNodes(PhaseLevel.create(value)));
    const evidenceBundle = await this.evidenceBundleAssembler.assembleForLevel(targetLevel, evidenceNodes, {
      unitId: input.unitId,
      storyId: input.storyId,
    });
    const result = phaseStructure.checkPhaseGate(targetLevel, evidenceBundle);
    let auditRecorded = false;

    if (result.auditPayload) {
      await this.auditLogger.record({
        scope: {
          unitId: input.unitId,
          storyId: input.storyId,
        },
        targetLevel: input.targetLevel,
        appliedRules: Object.freeze([...(result.auditPayload.appliedRules as readonly string[])]),
        generatedAt: String(result.auditPayload.generatedAt),
        requestedOverride: Boolean(result.auditPayload.requestedOverride),
      });
      auditRecorded = true;
    }

    return this.phaseGateResultMapper.map(result, {
      targetLevel: input.targetLevel,
      auditRecorded,
    });
  }
}
