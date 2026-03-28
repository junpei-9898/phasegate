/**
 * @unit fuse-hooks-engine
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CheckCompletionGateUseCase } from './application/usecases/check-completion-gate-usecase.js';
import { EvaluateHookEventUseCase } from './application/usecases/evaluate-hook-event-usecase.js';
import { ExecuteFallbackHookUseCase } from './application/usecases/execute-fallback-hook-usecase.js';
import { LoadHookConfigUseCase } from './application/usecases/load-hook-config-usecase.js';
import { ValidateHookYamlUseCase } from './application/usecases/validate-hook-yaml-usecase.js';
import { FUSEMount } from './domain/entities/fuse-mount.js';
import { HookEvaluationService } from './domain/services/hook-evaluation-service.js';
import type { GuardMode } from './domain/types/guard-mode.js';
import { CompletionGateFileAdapter } from './infrastructure/adapters/completion-gate-file-adapter.js';
import { FallbackPreReadAdapter } from './infrastructure/adapters/fallback-pre-read-adapter.js';
import { FallbackPreWriteAdapter } from './infrastructure/adapters/fallback-pre-write-adapter.js';
import { FusePreReadHandlerAdapter } from './infrastructure/adapters/fuse-pre-read-handler-adapter.js';
import { FusePhaseGateCheckAdapter } from './infrastructure/adapters/fuse-phase-gate-check-adapter.js';
import { FusePreWriteHandlerAdapter } from './infrastructure/adapters/fuse-pre-write-handler-adapter.js';
import { DefaultHooksYamlGenerator } from './infrastructure/adapters/default-hooks-yaml-generator.js';
import { ShellWrapperAdapter } from './infrastructure/adapters/shell-wrapper-adapter.js';
import { YamlHookConfigReaderAdapter } from './infrastructure/adapters/yaml-hook-config-reader-adapter.js';
import { CompletionGateHandler } from './presentation/handlers/completion-gate-handler.js';
import { FuseDaemonHandler } from './presentation/handlers/fuse-daemon-handler.js';
import { HookConfigHandler } from './presentation/handlers/hook-config-handler.js';

export interface FuseHooksEngineOptions {
  guardMode?: GuardMode;
}

function isFuseNativeInstalled(): boolean {
  try {
    let dir = process.cwd();
    for (let i = 0; i < 10; i++) {
      if (existsSync(join(dir, 'node_modules', 'fuse-native'))) return true;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return false;
  } catch {
    return false;
  }
}

function resolveGuardMode(requested: GuardMode): GuardMode {
  if (requested === 'auto') {
    return isFuseNativeInstalled() ? 'fuse' : 'hooks';
  }
  return requested;
}

export function buildFuseHooksEngine(baseDir: string, options?: FuseHooksEngineOptions) {
  const requestedMode = options?.guardMode ?? 'hooks';
  const resolvedMode = resolveGuardMode(requestedMode);

  const hookEvaluationService = new HookEvaluationService();
  const hookConfigReaderAdapter = new YamlHookConfigReaderAdapter();
  const shellWrapperAdapter = new ShellWrapperAdapter();
  const completionGateAdapter = new CompletionGateFileAdapter(baseDir);

  const fuseMount = FUSEMount.create(baseDir);

  // Guard mode based wiring
  const phaseGateCheck = resolvedMode === 'fuse'
    ? new FusePhaseGateCheckAdapter({
        rootDir: baseDir,
        paths: {
          source: ['scripts/harness'],
          construction: 'docs/product/construction',
          inception: 'docs/inception',
        },
      })
    : null;
  const fuseWriteHandler = resolvedMode === 'fuse'
    ? new FusePreWriteHandlerAdapter({ phaseGateCheck: phaseGateCheck ?? undefined })
    : new FallbackPreWriteAdapter();
  const fuseReadHandler = resolvedMode === 'fuse'
    ? new FusePreReadHandlerAdapter()
    : new FallbackPreReadAdapter();

  const fallbackHandlerAdapter = new FallbackPreReadAdapter();

  if (resolvedMode === 'hooks') {
    fuseMount.enterFallback('L3');
  }

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

  const defaultHooksYamlGenerator = new DefaultHooksYamlGenerator();

  const fuseDaemonHandler = new FuseDaemonHandler({
    fuseMount,
    fuseWriteHandler: fuseWriteHandler as FusePreWriteHandlerAdapter,
    fuseReadHandler: fuseReadHandler as FusePreReadHandlerAdapter,
    guardMode: resolvedMode,
  });

  return {
    guardMode: resolvedMode,
    fuseAvailable: resolvedMode === 'fuse',
    fuseMount,
    loadHookConfigUseCase,
    validateHookYamlUseCase,
    evaluateHookEventUseCase,
    executeFallbackHookUseCase,
    checkCompletionGateUseCase,
    defaultHooksYamlGenerator,
    hookConfigHandler: new HookConfigHandler(loadHookConfigUseCase, validateHookYamlUseCase),
    completionGateHandler: new CompletionGateHandler(checkCompletionGateUseCase),
    fuseDaemonHandler,
  };
}
