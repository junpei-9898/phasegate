/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { PhaseGateResultDto } from '../dto/phase-gate-result-dto.js';
import type { ResolveGateResultDto } from '../dto/resolve-gate-result-dto.js';
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

  mapFromResolve(
    result: ResolveGateResultDto,
    context: {
      readonly targetLevel: 1 | 2 | 3;
    },
  ): PhaseGateResultDto {
    return Object.freeze({
      passed: result.blockers.length === 0,
      targetLevel: context.targetLevel,
      blockers: Object.freeze(
        result.blockers.map((blocker) => `${blocker.gateName}: ${blocker.reason} (${blocker.path})`),
      ),
      warnings: Object.freeze(
        result.warnings.map((warning) => `${warning.gateName}: ${warning.reason} (${warning.path})`),
      ),
      auditRecorded: false,
    });
  }
}
