// @unit agent-integration
// @layer infrastructure

import type {
  FullModeRequirementQueryPort,
  FullModeRequirementQueryResult,
  FullModeTargetChange,
} from '../../domain/ports/full-mode-requirement-query-port.js';
import type { ClassifyChangeCategoryUseCase } from '../../../quick-mode/application/usecases/classify-change-category-usecase.js';

export interface QuickModeFullModeRequirementAdapterDeps {
  classifyUseCaseFactory: () => ClassifyChangeCategoryUseCase;
}

export class QuickModeFullModeRequirementAdapter implements FullModeRequirementQueryPort {
  private readonly classifyUseCaseFactory: () => ClassifyChangeCategoryUseCase;

  constructor(deps: QuickModeFullModeRequirementAdapterDeps) {
    this.classifyUseCaseFactory = deps.classifyUseCaseFactory;
  }

  async check(
    targetFilePaths: readonly string[],
    targetChanges?: readonly FullModeTargetChange[],
  ): Promise<FullModeRequirementQueryResult> {
    if (targetFilePaths.length === 0) {
      return { requiresFullMode: false };
    }

    try {
      const useCase = this.classifyUseCaseFactory();
      const contract = await useCase.execute({
        paths: [...targetFilePaths],
        targetChanges,
      });
      if (!contract.fullModeRequired) {
        return {
          requiresFullMode: false,
          dominantCategory: contract.dominantCategory ?? undefined,
        };
      }
      return {
        requiresFullMode: true,
        rejectionRule: contract.rejectionRule,
        rejectionReason: contract.rejectionReason,
        dominantCategory: contract.dominantCategory ?? undefined,
      };
    } catch {
      return { requiresFullMode: false };
    }
  }
}
