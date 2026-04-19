/**
 * @unit harness-api
 * @layer presentation
 *
 * Pre-commit CLI entry.
 * Runs L2 validators against staged TypeScript files AND design-document
 * metadata checks against staged Markdown files. Invoked from `.husky/pre-commit`
 * or `npx phasegate pre-commit`.
 *
 * Exit codes:
 *   0 = pass (or nothing to check)
 *   1 = validation failure (commit blocked)
 *   2 = runtime error
 */

import { execSync } from 'node:child_process';
import { createValidatorSystemModule } from '../validator-system/composition-root.js';
import { HumanValidationResultFormatter } from '../validator-system/presentation/formatters/human-validation-result-formatter.js';
import type { AggregatedValidationReport } from '../validator-system/application/dto/aggregated-validation-report.js';
import type { ValidationResultContract } from '../validator-system/application/dto/validation-result-contract.js';
import { createTraceabilityModelModule } from '../traceability-model/composition-root.js';
import type { ValidateMetadataCommandOutput } from '../traceability-model/presentation/cli/validate-metadata-command-handler.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const TS_EXTENSION = '.ts';
const MD_EXTENSION = '.md';

interface RunL2Input {
  readonly targetPaths: readonly string[];
  readonly unitName: string;
  readonly currentPhase: string;
}

interface RunL2UseCaseLike {
  execute(input: RunL2Input): Promise<readonly ValidationResultContract[]>;
}

interface ValidateMetadataInput {
  readonly filePaths: readonly string[];
  readonly json?: boolean;
}

interface ValidateMetadataHandlerLike {
  execute(input: ValidateMetadataInput): Promise<ValidateMetadataCommandOutput>;
}

export interface PreCommitDeps {
  readonly runL2ValidatorsUseCase: RunL2UseCaseLike;
  readonly validateMetadataCommandHandler: ValidateMetadataHandlerLike;
}

export interface PreCommitResult {
  readonly exitCode: 0 | 1 | 2;
  readonly stdout: string;
}

function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

function buildReport(
  results: readonly ValidationResultContract[],
): AggregatedValidationReport {
  const passed = results.filter((r) => r.passed && !r.skipped).length;
  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const allErrors = results.flatMap((r) => r.errors);
  const errorCount = allErrors.filter((e) => e.severity === 'error').length;
  const warnCount = allErrors.filter((e) => e.severity === 'warning').length;
  return {
    overallPassed: failed === 0,
    totalValidators: results.length,
    passedValidators: passed,
    failedValidators: failed,
    skippedValidators: skipped,
    allErrors,
    summary: {
      totalErrors: errorCount,
      totalWarnings: warnCount,
      errorsByLayer: { L2: errorCount, L3: 0, L4: 0 },
    },
    results,
  };
}

function maxExitCode(a: 0 | 1 | 2, b: 0 | 1 | 2): 0 | 1 | 2 {
  return (Math.max(a, b) as 0 | 1 | 2);
}

export async function runPreCommit(
  stagedFiles: readonly string[],
  deps: PreCommitDeps,
): Promise<PreCommitResult> {
  const tsFiles = stagedFiles.filter((f) => f.endsWith(TS_EXTENSION));
  const mdFiles = stagedFiles.filter((f) => f.endsWith(MD_EXTENSION));

  if (tsFiles.length === 0 && mdFiles.length === 0) {
    return {
      exitCode: 0,
      stdout: `${DIM}[phasegate] No staged files to check. Skipping.${RESET}`,
    };
  }

  const sections: string[] = [];
  sections.push(
    `${BOLD}[phasegate]${RESET} Pre-commit check ` +
      `(${tsFiles.length} .ts file(s), ${mdFiles.length} .md file(s))`,
  );

  let exitCode: 0 | 1 | 2 = 0;

  if (tsFiles.length > 0) {
    const results = await deps.runL2ValidatorsUseCase.execute({
      targetPaths: tsFiles,
      unitName: '',
      currentPhase: '',
    });
    const report = buildReport(results);
    sections.push('');
    sections.push(`${BOLD}== TypeScript 実装 (${tsFiles.length} file(s)) ==${RESET}`);
    sections.push(new HumanValidationResultFormatter().format(report));
    if (!report.overallPassed) {
      exitCode = maxExitCode(exitCode, 1);
    }
  }

  if (mdFiles.length > 0) {
    const mdResult = await deps.validateMetadataCommandHandler.execute({
      filePaths: mdFiles,
    });
    sections.push('');
    sections.push(`${BOLD}== 設計文書 (${mdFiles.length} file(s)) ==${RESET}`);
    sections.push(mdResult.text);
    exitCode = maxExitCode(exitCode, mdResult.exitCode);
  }

  sections.push('');
  if (exitCode === 0) {
    sections.push(`${GREEN}[phasegate]${RESET} All checks passed.`);
  } else {
    sections.push(`${RED}${BOLD}[phasegate] Commit blocked.${RESET}`);
  }

  return {
    exitCode,
    stdout: sections.join('\n'),
  };
}

export async function runPreCommitCli(): Promise<void> {
  try {
    const stagedFiles = getStagedFiles();
    const validatorMod = createValidatorSystemModule();
    const traceabilityMod = createTraceabilityModelModule(process.cwd());

    const result = await runPreCommit(stagedFiles, {
      runL2ValidatorsUseCase: validatorMod.runL2ValidatorsUseCase,
      validateMetadataCommandHandler: traceabilityMod.validateMetadataCommandHandler,
    });

    process.stdout.write(`${result.stdout}\n`);
    process.exit(result.exitCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${RED}[phasegate] Unexpected error:${RESET} ${msg}\n`);
    process.exit(2);
  }
}
