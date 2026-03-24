// phase-dependency-model-query-adapter.ts — PhaseDependencyModelQueryAdapter
// Wave 2完了後にリアル実装へ差し替え（旧: @stub: wave2-pending）

import type { PhaseGateQueryPort } from '../../domain/ports/phase-gate-query-port.js';
import type { PhaseGateStoryResult } from '../../domain/value-objects/check-ready-result.js';
import { PhaseInfo } from '../../domain/value-objects/phase-info.js';

// Override interface preserved for testing
export interface IPhaseDependencyModelStub {
  queryAllStories(): Promise<PhaseGateStoryResult[]>;
  queryUnit(unitId: string): Promise<PhaseInfo | null>;
}

export class PhaseDependencyModelQueryAdapter implements PhaseGateQueryPort {
  private readonly stub: IPhaseDependencyModelStub;

  constructor(stub?: IPhaseDependencyModelStub) {
    this.stub = stub ?? PhaseDependencyModelQueryAdapter.createRealImpl();
  }

  private static createRealImpl(): IPhaseDependencyModelStub {
    const rootDir = process.cwd();
    return {
      async queryAllStories(): Promise<PhaseGateStoryResult[]> {
        try {
          const { createTraceabilityModelModule } = await import('../../../traceability-model/composition-root.js');
          const traceModule = createTraceabilityModelModule(rootDir);
          const storyIds = await traceModule.storyCatalog.getAllStoryIds();

          const { createPhaseDependencyModelModule } = await import('../../../phase-dependency-model/composition-root.js');
          const phaseModule = createPhaseDependencyModelModule({ rootDir });

          const results: PhaseGateStoryResult[] = [];
          for (const sid of storyIds) {
            try {
              const output = await phaseModule.checkPhaseGateCommandHandler.execute({
                targetLevel: 1,
                storyId: sid.value,
              });
              const result = output.result;
              results.push({
                storyId: sid.value,
                passed: result?.passed ?? false,
                missingPhases: result ? [...result.blockers] : [],
              });
            } catch {
              results.push({ storyId: sid.value, passed: false, missingPhases: [] });
            }
          }
          return results;
        } catch {
          return [];
        }
      },

      async queryUnit(unitId: string): Promise<PhaseInfo | null> {
        try {
          const { createPhaseDependencyModelModule } = await import('../../../phase-dependency-model/composition-root.js');
          const phaseModule = createPhaseDependencyModelModule({ rootDir });
          const output = await phaseModule.checkPhaseGateCommandHandler.execute({
            targetLevel: 1,
            unitId,
          });
          const result = output.result;
          if (!result) return null;
          return PhaseInfo.create({
            unitId,
            currentLevel: result.targetLevel,
            currentPhase: `PHASE-${result.targetLevel}`,
            completedGates: result.passed ? [`level-${result.targetLevel}`] : [],
          });
        } catch {
          return null;
        }
      },
    };
  }

  async queryAllStories(): Promise<PhaseGateStoryResult[]> {
    return this.stub.queryAllStories();
  }

  async queryUnit(unitId: string): Promise<PhaseInfo | null> {
    return this.stub.queryUnit(unitId);
  }
}
