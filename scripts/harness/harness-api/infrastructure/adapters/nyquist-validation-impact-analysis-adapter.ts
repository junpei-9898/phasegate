// @layer infrastructure
// nyquist-validation-impact-analysis-adapter.ts — NyquistValidationImpactAnalysisAdapter
// Wave 2完了後にリアル実装へ差し替え（旧: @stub: wave2-pending）

import type { ImpactAnalysisPort, ImpactAnalysisResult } from '../../domain/ports/impact-analysis-port.js';

const STORY_ID_REGEX = /^H\d{2}-\d{2}$/;

// Override interface preserved for testing
export interface INyquistValidationStub {
  analyzeImpact(storyId: string): Promise<ImpactAnalysisResult | null>;
}

export class NyquistValidationImpactAnalysisAdapter implements ImpactAnalysisPort {
  private readonly stub: INyquistValidationStub;

  constructor(stub?: INyquistValidationStub) {
    this.stub = stub ?? NyquistValidationImpactAnalysisAdapter.createRealImpl();
  }

  private static createRealImpl(): INyquistValidationStub {
    const rootDir = process.cwd();
    const matrixFilePath = '.harness/requirement-test-matrix.json';
    return {
      async analyzeImpact(storyId: string): Promise<ImpactAnalysisResult | null> {
        try {
          const { createTraceabilityModelModule } = await import('../../../traceability-model/composition-root.js');
          const traceModule = createTraceabilityModelModule(rootDir);
          const storyIds = await traceModule.storyCatalog.getAllStoryIds();

          const { createNyquistValidationModule } = await import('../../../nyquist-validation/composition-root.js');
          const nyquistModule = createNyquistValidationModule({
            getStoryIds: async () => storyIds.map((s) => s.value),
          });

          const output = await nyquistModule.analyzeImpactUseCase.execute({
            storyId,
            matrixFilePath,
          });

          if (!output.found) return null;

          const affectedFiles = output.directTests.map((t) => t.filePath);
          return {
            storyId: output.storyId,
            affectedTestCases: affectedFiles,
            affectedFiles,
          };
        } catch {
          return null;
        }
      },
    };
  }

  async analyze(storyId: string): Promise<ImpactAnalysisResult | null> {
    if (!STORY_ID_REGEX.test(storyId)) {
      throw new Error(`HarnessApiDomainError: invalid storyId format '${storyId}'. Must match HXX-XX`);
    }
    return this.stub.analyzeImpact(storyId);
  }
}
