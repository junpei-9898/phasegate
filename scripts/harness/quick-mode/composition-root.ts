/**
 * @layer application
 * @unit quick-mode
 *
 * quick-mode ユニットの Composition Root
 */

import { GitDiffChangedFilesAdapter } from './infrastructure/adapters/git-diff-changed-files-adapter.js';
import { HarnessConfigQuickModeConfigAdapter } from './infrastructure/adapters/harness-config-quick-mode-config-adapter.js';
import { ValidatorSystemValidatorIdRegistryAdapter } from './infrastructure/adapters/validator-system-validator-id-registry-adapter.js';
import { QuickModeJudgmentEngine } from './domain/services/quick-mode-judgment-engine.js';
import { ValidatorRelaxationService } from './domain/services/validator-relaxation-service.js';
import { QuickModeDecisionContractMapper } from './application/mappers/quick-mode-decision-contract-mapper.js';
import { JudgeQuickModeEligibilityUseCase } from './application/usecases/judge-quick-mode-eligibility-usecase.js';
import { BuildRelaxationProfileUseCase } from './application/usecases/build-relaxation-profile-usecase.js';
import { ExecuteQuickCiCheckUseCase } from './application/usecases/execute-quick-ci-check-usecase.js';
import { ClassifyChangeCategoryUseCase } from './application/usecases/classify-change-category-usecase.js';
import { CiCheckQuickModeHandler } from './presentation/handlers/ci-check-quick-mode-handler.js';
import { CheckChangeCategoryHandler } from './presentation/handlers/check-change-category-handler.js';

export interface QuickModeCompositionRoot {
  handler: CiCheckQuickModeHandler;
  checkChangeCategoryHandler: CheckChangeCategoryHandler;
  executeUseCase: ExecuteQuickCiCheckUseCase;
  judgeUseCase: JudgeQuickModeEligibilityUseCase;
  buildUseCase: BuildRelaxationProfileUseCase;
  classifyUseCase: ClassifyChangeCategoryUseCase;
}

export function createQuickModeCompositionRoot(): QuickModeCompositionRoot {
  // Infrastructure
  const gitDiffAdapter = new GitDiffChangedFilesAdapter();
  const harnessConfigAdapter = new HarnessConfigQuickModeConfigAdapter();
  const validatorIdRegistryAdapter = new ValidatorSystemValidatorIdRegistryAdapter();

  // Domain Services
  const judgmentEngine = new QuickModeJudgmentEngine();
  const relaxationService = new ValidatorRelaxationService();

  // Application - wrap infra adapters to match application port interface
  const changedFilesPort = {
    getChangedFiles: () => Promise.resolve(gitDiffAdapter.getChangedFiles()),
  };
  const quickModeConfigPort = {
    getConfig: () => harnessConfigAdapter.getQuickModeConfig(),
  };
  const validatorIdRegistryPort = {
    getAllIds: () => validatorIdRegistryAdapter.getAllIds(),
  };

  // UseCases
  const judgeUseCase = new JudgeQuickModeEligibilityUseCase({
    changedFilesPort,
    quickModeConfigPort,
    judgmentEngine,
  });

  const buildUseCase = new BuildRelaxationProfileUseCase({
    quickModeConfigPort,
    validatorIdRegistryPort,
    relaxationService,
  });

  const executeUseCase = new ExecuteQuickCiCheckUseCase({
    judgeUseCase,
    buildUseCase,
  });

  const classifyUseCase = new ClassifyChangeCategoryUseCase({
    quickModeConfigPort,
    judgmentEngine,
  });

  // Presentation
  const handler = new CiCheckQuickModeHandler({ useCase: executeUseCase });
  const checkChangeCategoryHandler = new CheckChangeCategoryHandler({ useCase: classifyUseCase });

  return {
    handler,
    checkChangeCategoryHandler,
    executeUseCase,
    judgeUseCase,
    buildUseCase,
    classifyUseCase,
  };
}
