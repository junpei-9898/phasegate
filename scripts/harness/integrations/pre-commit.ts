/**
 * @unit harness-api
 * @layer presentation
 *
 * Pre-commit CLI entry.
 * Runs L2 validators (phase-gate / metadata / test-quality) against staged
 * TypeScript files. Invoked from `.husky/pre-commit` or `npx phasegate pre-commit`.
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

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

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

function buildReport(results: readonly ValidationResultContract[]): AggregatedValidationReport {
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

async function main(): Promise<void> {
  const stagedFiles = getStagedFiles();
  const tsFiles = stagedFiles.filter((f) => f.endsWith('.ts'));

  if (tsFiles.length === 0) {
    process.stdout.write(`${DIM}[phasegate] No staged TypeScript files. Skipping.${RESET}\n`);
    process.exit(0);
  }

  process.stdout.write(`${BOLD}[phasegate]${RESET} Pre-commit check (${tsFiles.length} file(s))\n`);

  const mod = createValidatorSystemModule();
  const results = await mod.runL2ValidatorsUseCase.execute({
    targetPaths: tsFiles,
    unitName: '',
    currentPhase: '',
  });

  const report = buildReport(results);
  process.stdout.write(`${new HumanValidationResultFormatter().format(report)}\n`);

  if (!report.overallPassed) {
    process.stdout.write(`\n${RED}${BOLD}[phasegate] Commit blocked.${RESET}\n`);
    process.exit(1);
  }
  process.stdout.write(`\n${GREEN}[phasegate]${RESET} All checks passed.\n`);
  process.exit(0);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${RED}[phasegate] Unexpected error:${RESET} ${msg}\n`);
  process.exit(2);
});
