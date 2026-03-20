/**
 * @unit fuse-hooks-engine
 */

import { CheckCompletionGateUseCase } from './application/usecases/check-completion-gate-usecase.js';
import { EvaluateHookEventUseCase } from './application/usecases/evaluate-hook-event-usecase.js';
import { ExecuteFallbackHookUseCase } from './application/usecases/execute-fallback-hook-usecase.js';
import { LoadHookConfigUseCase } from './application/usecases/load-hook-config-usecase.js';
import { ValidateHookYamlUseCase } from './application/usecases/validate-hook-yaml-usecase.js';
import { HookEvaluationService } from './domain/services/hook-evaluation-service.js';
import { CompletionGateFileAdapter } from './infrastructure/adapters/completion-gate-file-adapter.js';
import { FallbackPreReadAdapter } from './infrastructure/adapters/fallback-pre-read-adapter.js';
import { ShellWrapperAdapter } from './infrastructure/adapters/shell-wrapper-adapter.js';
import { YamlHookConfigReaderAdapter } from './infrastructure/adapters/yaml-hook-config-reader-adapter.js';
import { CompletionGateHandler } from './presentation/handlers/completion-gate-handler.js';
import { HookConfigHandler } from './presentation/handlers/hook-config-handler.js';

export function buildFuseHooksEngine(baseDir: string) {
  const hookEvaluationService = new HookEvaluationService();
  const hookConfigReaderAdapter = new YamlHookConfigReaderAdapter();
  const shellWrapperAdapter = new ShellWrapperAdapter();
  const fallbackHandlerAdapter = new FallbackPreReadAdapter();
  const completionGateAdapter = new CompletionGateFileAdapter(baseDir);

  const loadHookConfigUseCase = new LoadHookConfigUseCase(
    hookConfigReaderAdapter,
    hookEvaluationService,
  );
  const validateHookYamlUseCase = new ValidateHookYamlUseCase(hookConfigReaderAdapter);
  const evaluateHookEventUseCase = new EvaluateHookEventUseCase(
    fallbackHandlerAdapter,
    shellWrapperAdapter,
    hookEvaluationService,
  );
  const executeFallbackHookUseCase = new ExecuteFallbackHookUseCase(fallbackHandlerAdapter);
  const checkCompletionGateUseCase = new CheckCompletionGateUseCase(completionGateAdapter);

  return {
    loadHookConfigUseCase,
    validateHookYamlUseCase,
    evaluateHookEventUseCase,
    executeFallbackHookUseCase,
    checkCompletionGateUseCase,
    hookConfigHandler: new HookConfigHandler(loadHookConfigUseCase, validateHookYamlUseCase),
    completionGateHandler: new CompletionGateHandler(checkCompletionGateUseCase),
  };
}
