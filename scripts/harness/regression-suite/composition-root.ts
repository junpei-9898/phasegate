/**
 * @layer infrastructure
 * @unit regression-suite
 *
 * Composition Root - wires all dependencies together
 */

import * as path from 'node:path';

// Infrastructure Adapters
import { StaticSuiteRegistryAdapter } from './infrastructure/adapters/static-suite-registry-adapter.js';
import { VitestTestRunnerAdapter } from './infrastructure/adapters/vitest-test-runner-adapter.js';
import { HarnessConfigQueryAdapter } from './infrastructure/adapters/harness-config-query-adapter.js';
import { JsonCiGateResultWriterAdapter } from './infrastructure/adapters/json-ci-gate-result-writer-adapter.js';
import { BiomeAstImportAnalyzerAdapter } from './infrastructure/adapters/biome-ast-import-analyzer-adapter.js';
import { FileSystemV0SpecReaderAdapter } from './infrastructure/adapters/file-system-v0-spec-reader-adapter.js';
import { MarkdownMigrationMappingRepositoryAdapter } from './infrastructure/adapters/markdown-migration-mapping-repository-adapter.js';

// Application Use Cases
import { RunKRequirementsRegressionUseCase } from './application/usecases/run-k-requirements-regression-usecase.js';
import { RunGngGateRegressionUseCase } from './application/usecases/run-gng-gate-regression-usecase.js';
import { RunAgentIndependenceGuardUseCase } from './application/usecases/run-agent-independence-guard-usecase.js';
import { RunK14K15RegressionUseCase } from './application/usecases/run-k14-k15-regression-usecase.js';
import { ConfigureCiGateUseCase } from './application/usecases/configure-ci-gate-usecase.js';
import { AnalyzeV0MigrationUseCase } from './application/usecases/analyze-v0-migration-usecase.js';
import { MigrateV0TestsUseCase } from './application/usecases/migrate-v0-tests-usecase.js';

export interface RegressionSuiteCompositionRoot {
  runKRequirementsRegressionUseCase: RunKRequirementsRegressionUseCase;
  runGngGateRegressionUseCase: RunGngGateRegressionUseCase;
  runAgentIndependenceGuardUseCase: RunAgentIndependenceGuardUseCase;
  runK14K15RegressionUseCase: RunK14K15RegressionUseCase;
  configureCiGateUseCase: ConfigureCiGateUseCase;
  analyzeV0MigrationUseCase: AnalyzeV0MigrationUseCase;
  migrateV0TestsUseCase: MigrateV0TestsUseCase;
}

export function buildRegressionSuite(baseDir: string): RegressionSuiteCompositionRoot {
  // Infrastructure adapters
  const suiteRegistryPort = new StaticSuiteRegistryAdapter();
  const testRunnerPort = new VitestTestRunnerAdapter();
  const configQueryPort = new HarnessConfigQueryAdapter();
  const ciGateResultWriterPort = new JsonCiGateResultWriterAdapter(baseDir);
  const importAnalyzerPort = new BiomeAstImportAnalyzerAdapter();
  const v0SpecReaderPort = new FileSystemV0SpecReaderAdapter(baseDir);
  const migrationMappingRepositoryPort = new MarkdownMigrationMappingRepositoryAdapter(
    path.join(baseDir, 'migration-mappings.md'),
  );

  // Use cases
  const runKRequirementsRegressionUseCase = new RunKRequirementsRegressionUseCase(
    suiteRegistryPort,
    testRunnerPort,
    configQueryPort,
    ciGateResultWriterPort,
  );

  const runGngGateRegressionUseCase = new RunGngGateRegressionUseCase(
    suiteRegistryPort,
    testRunnerPort,
    configQueryPort,
    ciGateResultWriterPort,
  );

  const runAgentIndependenceGuardUseCase = new RunAgentIndependenceGuardUseCase(
    suiteRegistryPort,
    importAnalyzerPort,
    ciGateResultWriterPort,
  );

  const runK14K15RegressionUseCase = new RunK14K15RegressionUseCase(
    suiteRegistryPort,
    testRunnerPort,
    configQueryPort,
    ciGateResultWriterPort,
  );

  const configureCiGateUseCase = new ConfigureCiGateUseCase(configQueryPort);

  const analyzeV0MigrationUseCase = new AnalyzeV0MigrationUseCase(
    v0SpecReaderPort,
    migrationMappingRepositoryPort,
  );

  const migrateV0TestsUseCase = new MigrateV0TestsUseCase(
    v0SpecReaderPort,
    migrationMappingRepositoryPort,
  );

  return {
    runKRequirementsRegressionUseCase,
    runGngGateRegressionUseCase,
    runAgentIndependenceGuardUseCase,
    runK14K15RegressionUseCase,
    configureCiGateUseCase,
    analyzeV0MigrationUseCase,
    migrateV0TestsUseCase,
  };
}
