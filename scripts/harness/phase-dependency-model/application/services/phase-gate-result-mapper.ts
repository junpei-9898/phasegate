/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { PhaseGateResultDto } from '../dto/phase-gate-result-dto.js';
import type { PhaseGateResult } from '../../domain/values/phase-gate-result.js';

export class PhaseGateResultMapper {
  map(
    result: PhaseGateResult,
    context: {
      readonly targetLevel: 1 | 2 | 3;
      readonly auditRecorded: boolean;
    },
  ): PhaseGateResultDto {
    return Object.freeze({
      passed: result.passed,
      targetLevel: context.targetLevel,
      blockers: Object.freeze([...result.blockers]),
      warnings: Object.freeze([...result.warnings]),
      auditRecorded: context.auditRecorded,
    });
  }
}
