// nyquist-validation-impact-analysis-adapter.ts — NyquistValidationImpactAnalysisAdapter
// @stub: wave2-pending - nyquist-validation の正式インターフェース確定後に差し替え

import type { ImpactAnalysisPort, ImpactAnalysisResult } from '../../domain/ports/impact-analysis-port.js';

const STORY_ID_REGEX = /^H\d{2}-\d{2}$/;

// Stub interface for the external nyquist-validation module (wave2-pending)
export interface INyquistValidationStub {
  analyzeImpact(storyId: string): Promise<ImpactAnalysisResult | null>;
}

export class NyquistValidationImpactAnalysisAdapter implements ImpactAnalysisPort {
  private readonly stub: INyquistValidationStub;

  constructor(stub?: INyquistValidationStub) {
    this.stub = stub ?? {
      async analyzeImpact(_storyId: string) { return null; },
    };
  }

  async analyze(storyId: string): Promise<ImpactAnalysisResult | null> {
    if (!STORY_ID_REGEX.test(storyId)) {
      throw new Error(`HarnessApiDomainError: invalid storyId format '${storyId}'. Must match HXX-XX`);
    }
    return this.stub.analyzeImpact(storyId);
  }
}
