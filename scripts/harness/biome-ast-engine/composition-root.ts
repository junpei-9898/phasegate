/**
 * @layer composition
 * @unit biome-ast-engine
 *
 * biome-ast-engine ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラーを返す。
 */

// Infrastructure adapters
import { SystemClockAdapter } from './infrastructure/adapters/system-clock-adapter.js';
import { HarnessConfigProviderAdapter, type L1ConfigInput } from './infrastructure/adapters/harness-config-provider-adapter.js';
import { HarnessErrorFormatterAdapter } from './infrastructure/adapters/harness-error-formatter-adapter.js';
import { NodeWorkspaceFileAdapter } from './infrastructure/adapters/node-workspace-file-adapter.js';
import { TypeScriptSourceModuleAnalyzerAdapter } from './infrastructure/adapters/typescript-source-module-analyzer-adapter.js';
import { BiomeCliExecutorAdapter } from './infrastructure/adapters/biome-cli-executor-adapter.js';
import { WorkspaceInventoryAdapter } from './infrastructure/adapters/workspace-inventory-adapter.js';

// Domain services
import { RuleDefinitionRegistry } from './domain/services/rule-definition-registry.js';
import { ImportGraphBuilder } from './domain/services/import-graph-builder.js';
import { LintRunner } from './domain/services/lint-runner.js';

// Usecases
import { ResolveEnabledRulesUseCase } from './application/usecases/resolve-enabled-rules-usecase.js';
import { AnalyzeImportGraphUseCase } from './application/usecases/analyze-import-graph-usecase.js';
import { ExecuteLintUseCase } from './application/usecases/execute-lint-usecase.js';
import { VerifyEslintRemovalUseCase } from './application/usecases/verify-eslint-removal-usecase.js';
import { BuildHarnessErrorPayloadUseCase } from './application/usecases/build-harness-error-payload-usecase.js';

// Presentation
import { HarnessLintCommandHandler } from './presentation/cli/harness-lint-command-handler.js';

export interface BiomeAstEngineModuleOptions {
  readonly l1Config?: L1ConfigInput;
}

export function createBiomeAstEngineModule(
  rootDir: string,
  options?: BiomeAstEngineModuleOptions,
) {
  // Infrastructure
  const clockPort = new SystemClockAdapter();
  const ruleConfigProviderPort = new HarnessConfigProviderAdapter(options?.l1Config);
  const violationFormatterPort = new HarnessErrorFormatterAdapter();
  const workspaceFilePort = new NodeWorkspaceFileAdapter({ rootDir });
  const sourceModuleAnalyzerPort = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });
  const biomeExecutorPort = new BiomeCliExecutorAdapter({ cwd: rootDir });
  const workspaceInventoryPort = new WorkspaceInventoryAdapter({ rootDir });

  // Domain services
  const ruleDefinitionRegistry = new RuleDefinitionRegistry();
  const importGraphBuilder = new ImportGraphBuilder();
  const lintRunner = new LintRunner(ruleDefinitionRegistry);

  // Usecases
  const resolveEnabledRulesUseCase = new ResolveEnabledRulesUseCase({
    ruleConfigProviderPort,
    ruleDefinitionRegistry,
  });

  const analyzeImportGraphUseCase = new AnalyzeImportGraphUseCase({
    workspaceFilePort,
    sourceModuleAnalyzerPort,
    importGraphBuilder,
  });

  const executeLintUseCase = new ExecuteLintUseCase({
    resolveEnabledRulesUseCase,
    analyzeImportGraphUseCase,
    biomeExecutorPort,
    lintRunner,
    clockPort,
  });

  const verifyEslintRemovalUseCase = new VerifyEslintRemovalUseCase({
    workspaceInventoryPort,
  });

  const buildHarnessErrorPayloadUseCase = new BuildHarnessErrorPayloadUseCase({
    violationFormatterPort,
  });

  // Presentation handler
  const harnessLintCommandHandler = new HarnessLintCommandHandler({
    executeLintUseCase,
    verifyEslintRemovalUseCase,
    buildHarnessErrorPayloadUseCase,
  });

  return { harnessLintCommandHandler } as const;
}
