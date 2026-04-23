/**
 * @layer barrel
 * @unit agent-integration
 *
 * agent-integration ユニットの公開バレルエクスポート
 */

// Domain - Entities
export { ReentryGuard, ReentryGuardAlreadyActiveError } from './domain/entities/reentry-guard.js';

// Domain - Value Objects
export {
  HookEvent,
  PreToolUseEvent,
  PostToolUseEvent,
  StopEvent,
  UnsupportedHookTypeError as HookEventUnsupportedTypeError,
} from './domain/value-objects/hook-event.js';
export { ProtectedFileList, ProtectedFileListEmptyError } from './domain/value-objects/protected-file-list.js';
export { HookTranslationResult, HookTranslationResultInvariantError } from './domain/value-objects/hook-translation-result.js';
export { FallbackCapabilitySpec, FallbackCapabilityViolationError } from './domain/value-objects/fallback-capability-spec.js';

// Domain - Services
export { HookToCliTranslator, AsyncHookToCliTranslator } from './domain/services/hook-to-cli-translator.js';
export { FallbackVerificationService, AsyncFallbackVerificationService } from './domain/services/fallback-verification-service.js';

// Application - UseCases
export { VerifyFallbackCapabilityUseCase } from './application/usecases/verify-fallback-capability-usecase.js';
export { HandlePreToolUseUseCase } from './application/usecases/handle-pre-tool-use-usecase.js';
export { HandlePostToolUseUseCase } from './application/usecases/handle-post-tool-use-usecase.js';
export { HandleStopUseCase } from './application/usecases/handle-stop-usecase.js';

// Infrastructure - Adapters
export { EnvFileReentryGuardStateAdapter } from './infrastructure/adapters/env-file-reentry-guard-state-adapter.js';
export { HarnessApiCliCommandRegistryAdapter } from './infrastructure/adapters/harness-api-cli-command-registry-adapter.js';
export { HarnessConfigConfigQueryAdapter } from './infrastructure/adapters/harness-config-config-query-adapter.js';
export { ChildProcessCliExecutorAdapter } from './infrastructure/adapters/child-process-cli-executor-adapter.js';

// Application - Ports
export { TimeoutError } from './application/ports/cli-executor-port.js';
export type { CliExecutorPort, CliExecutionResult } from './application/ports/cli-executor-port.js';
