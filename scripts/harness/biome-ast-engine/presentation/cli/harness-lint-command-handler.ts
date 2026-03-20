/**
 * @layer presentation
 * @unit biome-ast-engine
 */

import type { ExecuteLintUseCase } from '../../application/usecases/execute-lint-usecase.js';
import type { VerifyEslintRemovalUseCase } from '../../application/usecases/verify-eslint-removal-usecase.js';
import type { BuildHarnessErrorPayloadUseCase } from '../../application/usecases/build-harness-error-payload-usecase.js';
import type { ExecuteLintOutput } from '../../application/dto/execute-lint-output.js';
import type { BuildHarnessErrorPayloadOutput } from '../../application/dto/build-harness-error-payload-output.js';
import type { VerifyEslintRemovalOutput } from '../../application/dto/verify-eslint-removal-output.js';
import { parseLintCommand } from './lint-command-parser.js';

export interface HarnessLintCommandResult {
  readonly exitCode: 0 | 1 | 2;
  readonly text: string;
}

export interface HarnessLintCommandHandlerDeps {
  readonly executeLintUseCase: Pick<ExecuteLintUseCase, 'execute'>;
  readonly verifyEslintRemovalUseCase: Pick<VerifyEslintRemovalUseCase, 'execute'>;
  readonly buildHarnessErrorPayloadUseCase: Pick<BuildHarnessErrorPayloadUseCase, 'execute'>;
}

export class HarnessLintCommandHandler {
  private readonly executeLintUseCase: Pick<ExecuteLintUseCase, 'execute'>;
  private readonly verifyEslintRemovalUseCase: Pick<VerifyEslintRemovalUseCase, 'execute'>;
  private readonly buildHarnessErrorPayloadUseCase: Pick<BuildHarnessErrorPayloadUseCase, 'execute'>;

  constructor(deps: HarnessLintCommandHandlerDeps) {
    this.executeLintUseCase = deps.executeLintUseCase;
    this.verifyEslintRemovalUseCase = deps.verifyEslintRemovalUseCase;
    this.buildHarnessErrorPayloadUseCase = deps.buildHarnessErrorPayloadUseCase;
  }

  async execute(argv: readonly string[]): Promise<Readonly<HarnessLintCommandResult>> {
    const parsed = parseLintCommand(argv);
    if (!parsed.valid) {
      return Object.freeze({
        exitCode: 2,
        text: `Usage error: ${parsed.errorMessage}`,
      });
    }

    try {
      const lintOutput = await this.executeLintUseCase.execute({
        targets: parsed.targets.length > 0 ? parsed.targets : undefined,
      });

      let eslintOutput: Readonly<VerifyEslintRemovalOutput> | undefined;
      if (!parsed.skipEslintRemovalCheck) {
        eslintOutput = await this.verifyEslintRemovalUseCase.execute({});
      }

      const errorPayload = await this.buildHarnessErrorPayloadUseCase.execute({
        violations: lintOutput.report.violations,
      });

      const hasViolations = errorPayload.errors.length > 0;
      const hasLegacy = eslintOutput?.hasLegacyArtifacts === true;
      const exitCode: 0 | 1 = hasViolations || hasLegacy ? 1 : 0;

      const text = parsed.json
        ? this.formatJson(lintOutput, errorPayload, eslintOutput)
        : this.formatText(lintOutput, errorPayload, eslintOutput);

      return Object.freeze({ exitCode, text });
    } catch {
      return Object.freeze({
        exitCode: 2,
        text: 'Error: lint execution failed unexpectedly',
      });
    }
  }

  private formatJson(
    lintOutput: Readonly<ExecuteLintOutput>,
    errorPayload: Readonly<BuildHarnessErrorPayloadOutput>,
    eslintOutput?: Readonly<VerifyEslintRemovalOutput>,
  ): string {
    return JSON.stringify(
      {
        status: errorPayload.errors.length === 0 ? 'success' : 'failure',
        errors: errorPayload.errors,
        summary: {
          scannedFiles: lintOutput.checkedFiles.length,
          violationCount: errorPayload.errors.length,
        },
        ...(eslintOutput ? { eslintRemoval: eslintOutput } : {}),
      },
      null,
      2,
    );
  }

  private formatText(
    lintOutput: Readonly<ExecuteLintOutput>,
    errorPayload: Readonly<BuildHarnessErrorPayloadOutput>,
    eslintOutput?: Readonly<VerifyEslintRemovalOutput>,
  ): string {
    const lines: string[] = [];
    lines.push(`Scanned ${lintOutput.checkedFiles.length} files`);

    if (errorPayload.errors.length === 0) {
      lines.push('No violations found');
    } else {
      lines.push(`${errorPayload.errors.length} violation(s):`);
      const shown = errorPayload.errors.slice(0, 3);
      for (const e of shown) {
        lines.push(`  [${e.severity}] ${e.code}: ${e.message}`);
      }
      if (errorPayload.errors.length > 3) {
        lines.push(`  ... and ${errorPayload.errors.length - 3} more`);
      }
    }

    if (eslintOutput?.hasLegacyArtifacts) {
      lines.push('ESLint legacy artifacts detected:');
      for (const f of eslintOutput.configFiles) {
        lines.push(`  config: ${f}`);
      }
      for (const d of eslintOutput.packageDependencies) {
        lines.push(`  dependency: ${d}`);
      }
    }

    return lines.join('\n');
  }
}
