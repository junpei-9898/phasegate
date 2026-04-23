/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { BiomeExecutorPort } from '../../domain/ports/biome-executor-port.js';
import type { ClockPort } from '../../domain/ports/clock-port.js';
import type { LintRunner } from '../../domain/services/lint-runner.js';
import { LintReport } from '../../domain/value-objects/lint-report.js';
import type { ExecuteLintInput } from '../dto/execute-lint-input.js';
import type { ExecuteLintOutput } from '../dto/execute-lint-output.js';
import { toExecuteLintOutput } from '../mappers/execute-lint-output-mapper.js';
import type { AnalyzeImportGraphUseCase } from './analyze-import-graph-usecase.js';
import type { ResolveEnabledRulesUseCase } from './resolve-enabled-rules-usecase.js';

type ResolveEnabledRulesExecutor = Pick<ResolveEnabledRulesUseCase, 'execute'>;
type AnalyzeImportGraphExecutor = Pick<AnalyzeImportGraphUseCase, 'execute'>;
type LintRunnerExecutor = Pick<LintRunner, 'run'>;

export interface ExecuteLintUseCaseDeps {
  readonly resolveEnabledRulesUseCase: ResolveEnabledRulesExecutor;
  readonly analyzeImportGraphUseCase: AnalyzeImportGraphExecutor;
  readonly biomeExecutorPort: BiomeExecutorPort;
  readonly lintRunner: LintRunnerExecutor;
  readonly clockPort: ClockPort;
}

export class ExecuteLintUseCase {
  private readonly resolveEnabledRulesUseCase: ResolveEnabledRulesExecutor;
  private readonly analyzeImportGraphUseCase: AnalyzeImportGraphExecutor;
  private readonly biomeExecutorPort: BiomeExecutorPort;
  private readonly lintRunner: LintRunnerExecutor;
  private readonly clockPort: ClockPort;

  constructor(deps: ExecuteLintUseCaseDeps) {
    this.resolveEnabledRulesUseCase = deps.resolveEnabledRulesUseCase;
    this.analyzeImportGraphUseCase = deps.analyzeImportGraphUseCase;
    this.biomeExecutorPort = deps.biomeExecutorPort;
    this.lintRunner = deps.lintRunner;
    this.clockPort = deps.clockPort;
  }

  async execute(input: ExecuteLintInput = {}): Promise<Readonly<ExecuteLintOutput>> {
    const startedAt = this.clockPort.now();
    const resolvedRules = await this.resolveEnabledRulesUseCase.execute();
    const analyzed = await this.analyzeImportGraphUseCase.execute({
      targets: input.targets,
      architecture: resolvedRules.architectureSpec,
    });

    if (input.includeBiomeNative !== false) {
      await this.biomeExecutorPort.executeCheck(analyzed.files);
    }

    const completedAt = this.clockPort.now();
    const durationMs = completedAt - startedAt;
    const baseReport = this.lintRunner.run({
      rules: resolvedRules.enabledRules,
      snapshots: analyzed.snapshots,
      importGraph: analyzed.importGraph,
      durationMs,
      architecture: resolvedRules.architectureSpec,
    });
    const report = LintReport.create({
      violations: baseReport.violations,
      passedRules: baseReport.passedRules,
      skippedRules: Object.freeze([
        ...baseReport.skippedRules,
        ...resolvedRules.skippedRules,
      ]),
      durationMs: baseReport.durationMs,
      scannedFiles: baseReport.scannedFiles,
    });

    return toExecuteLintOutput(report, analyzed.files);
  }
}
