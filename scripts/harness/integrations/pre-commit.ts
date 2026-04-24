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
import { readFile } from 'node:fs/promises';
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
const TEST_FILE_SUFFIXES = Object.freeze([
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
]);

function isTestFile(path: string): boolean {
  return TEST_FILE_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

const HARNESS_ROOT_PREFIX = 'scripts/harness/';
const TESTS_SEGMENT = '__tests__';
const UNIT_ANNOTATION_PATTERN = /^\s*(?:\/\/|\*)\s*@unit\s+(\S+)/m;

/**
 * staged TS file path から所属 Unit 名を導出する。
 *   scripts/harness/{unit}/...                      → unit
 *   scripts/harness/__tests__/{unit|integration}/{unit}/...
 *                                                    → unit
 * 上記パターンに合致しないパス（例: scripts/harness/integrations/pre-commit.ts）は
 * undefined を返し、呼び出し側が file 内 `@unit` コメントにフォールバックする。
 */
function deriveUnitNameFromPath(filePath: string): string | undefined {
  if (!filePath.startsWith(HARNESS_ROOT_PREFIX)) return undefined;
  const parts = filePath.slice(HARNESS_ROOT_PREFIX.length).split('/');
  if (parts.length < 2) return undefined;
  if (parts[0] === TESTS_SEGMENT) {
    return parts.length >= 3 ? parts[2] : undefined;
  }
  return parts[0];
}

/**
 * ファイル本体から `// @unit <name>` / `* @unit <name>` を抽出する。
 * 読み込み失敗や annotation 不在時は undefined。
 */
async function deriveUnitNameFromFile(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const match = UNIT_ANNOTATION_PATTERN.exec(content);
    return match?.[1];
  } catch {
    return undefined;
  }
}

/**
 * path-based 推定と file-based 推定を組み合わせて Unit 名を解決する。
 * `@unit` アノテーションが存在する場合はそれを正として採用し、
 * 無い場合のみ path-based 推定にフォールバックする（cross-cutting dir 対応）。
 */
async function resolveUnitName(filePath: string): Promise<string | undefined> {
  const fileUnit = await deriveUnitNameFromFile(filePath);
  if (fileUnit) return fileUnit;
  return deriveUnitNameFromPath(filePath);
}

/**
 * 複数 Unit の L2 validator 実行結果を、ValidatorId 単位で集約する。
 * 同じ ValidatorId に対して、どの Unit でも 1 件でも fail / skip があれば
 * fail / skip を優先（厳しい側を採用）。
 */
function mergePerUnitResults(
  runs: readonly (readonly ValidationResultContract[])[],
): readonly ValidationResultContract[] {
  const byId = new Map<string, ValidationResultContract>();
  for (const run of runs) {
    for (const result of run) {
      const existing = byId.get(result.validatorId);
      if (!existing) {
        byId.set(result.validatorId, result);
        continue;
      }
      const existingFailed = !existing.passed && !existing.skipped;
      const incomingFailed = !result.passed && !result.skipped;
      if (incomingFailed && !existingFailed) {
        byId.set(result.validatorId, result);
      }
    }
  }
  return [...byId.values()];
}

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
  const testFiles = tsFiles.filter((f) => isTestFile(f));
  const metadataFiles = [...mdFiles, ...testFiles];

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
    // staged TS file を Unit ごとにグルーピングし、Unit 単位で L2 phase gate
    // （L2-001 の `{unit}_unit.md` 等）を評価する。Unit を特定できないファイルは
    // 別グループ（unitName=''）として従来挙動で評価する。
    const filesByUnit = new Map<string, string[]>();
    for (const f of tsFiles) {
      const unit = (await resolveUnitName(f)) ?? '';
      const bucket = filesByUnit.get(unit);
      if (bucket) {
        bucket.push(f);
      } else {
        filesByUnit.set(unit, [f]);
      }
    }

    const runs: (readonly ValidationResultContract[])[] = [];
    for (const [unitName, unitFiles] of filesByUnit) {
      const results = await deps.runL2ValidatorsUseCase.execute({
        targetPaths: unitFiles,
        unitName,
        currentPhase: '',
      });
      runs.push(results);
    }

    const merged = mergePerUnitResults(runs);
    const report = buildReport(merged);
    sections.push('');
    sections.push(`${BOLD}== TypeScript 実装 (${tsFiles.length} file(s)) ==${RESET}`);
    sections.push(new HumanValidationResultFormatter().format(report));
    if (!report.overallPassed) {
      exitCode = maxExitCode(exitCode, 1);
    }
  }

  if (metadataFiles.length > 0) {
    const metadataResult = await deps.validateMetadataCommandHandler.execute({
      filePaths: metadataFiles,
    });
    sections.push('');
    sections.push(
      `${BOLD}== 設計 / テスト メタデータ注釈 (${metadataFiles.length} file(s)) ==${RESET}`,
    );
    sections.push(metadataResult.text);
    exitCode = maxExitCode(exitCode, metadataResult.exitCode);
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
