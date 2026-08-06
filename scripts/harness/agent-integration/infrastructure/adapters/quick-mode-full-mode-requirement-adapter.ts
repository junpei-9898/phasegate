// @unit agent-integration
// @layer infrastructure
// @work-item-id WI-373

import type {
  FullModeRequirementQueryPort,
  FullModeRequirementQueryResult,
  FullModeTargetChange,
} from '../../domain/ports/full-mode-requirement-query-port.js';
import type { ClassifyChangeCategoryUseCase } from '../../../quick-mode/application/usecases/classify-change-category-usecase.js';
import { QuickModeConfigError } from '../../../quick-mode/domain/errors/quick-mode-config-error.js';

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
    } catch (error) {
      // WI-373: quickMode 設定そのものが不正な場合は fail-closed。
      // allowedCategories / categoryOverrides の enum 検証が入ったことで
      // config の typo が例外になるため、ここで一律 fail-open のままだと
      // 「設定を壊すと全書き込みが素通りする」という最悪の穴になる。
      // config 不在・IO エラー等その他の例外は WI-333 の fail-open を維持する。
      if (error instanceof QuickModeConfigError) {
        return {
          requiresFullMode: true,
          rejectionRule: 'MIXED_CHANGES',
          rejectionReason: `quickMode 設定が不正なため Quick Mode 判定を実行できません: ${error.message}`,
        };
      }
      return { requiresFullMode: false };
    }
  }
}
