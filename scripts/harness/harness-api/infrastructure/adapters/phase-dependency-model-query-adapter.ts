// phase-dependency-model-query-adapter.ts — PhaseDependencyModelQueryAdapter
// @stub: wave2-pending - phase-dependency-model の正式インターフェース確定後に差し替え

import type { PhaseGateQueryPort } from '../../domain/ports/phase-gate-query-port.js';
import type { PhaseGateStoryResult } from '../../domain/value-objects/check-ready-result.js';
import type { PhaseInfo } from '../../domain/value-objects/phase-info.js';

// Stub interface for the external phase-dependency-model module (wave2-pending)
export interface IPhaseDependencyModelStub {
  queryAllStories(): Promise<PhaseGateStoryResult[]>;
  queryUnit(unitId: string): Promise<PhaseInfo | null>;
}

export class PhaseDependencyModelQueryAdapter implements PhaseGateQueryPort {
  private readonly stub: IPhaseDependencyModelStub;

  constructor(stub?: IPhaseDependencyModelStub) {
    this.stub = stub ?? {
      async queryAllStories() { return []; },
      async queryUnit(_unitId: string) { return null; },
    };
  }

  async queryAllStories(): Promise<PhaseGateStoryResult[]> {
    return this.stub.queryAllStories();
  }

  async queryUnit(unitId: string): Promise<PhaseInfo | null> {
    return this.stub.queryUnit(unitId);
  }
}
