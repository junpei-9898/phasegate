// @unit agent-integration
// @layer infrastructure

import type { PhaseGateQueryPort } from '../../domain/ports/phase-gate-query-port.js';
import type { WriteTargetScope } from '../../domain/value-objects/write-target-scope.js';
import { PhaseGateQueryResult } from '../../domain/value-objects/phase-gate-query-result.js';

export class PhaseGateQueryAdapter implements PhaseGateQueryPort {
  async checkGate(scope: WriteTargetScope, targetFilePath?: string): Promise<PhaseGateQueryResult> {
    try {
      const { createPhaseDependencyModelModule } = await import('../../../phase-dependency-model/composition-root.js');
      const mod = createPhaseDependencyModelModule({ rootDir: process.cwd() });
      const result = await mod.checkPhaseGateCommandHandler.execute({
        targetLevel: scope.level,
        unitId: scope.unitId,
        storyId: scope.storyId,
        targetFilePath,
      });

      if (result.exitCode === 0) {
        return PhaseGateQueryResult.create(true, [], []);
      }

      if (result.exitCode === 1) {
        return PhaseGateQueryResult.create(false, [result.text], []);
      }

      return PhaseGateQueryResult.create(true, [], ['phase gate check returned error']);
    } catch {
      return PhaseGateQueryResult.create(true, [], ['phase-dependency-model not available']);
    }
  }
}
