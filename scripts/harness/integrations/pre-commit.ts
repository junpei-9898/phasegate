/**
 * @unit harness-api
 * @layer presentation
 * @work-item-id WI-141
 * @work-item-id WI-109
 * @work-item-id WI-189
 * @work-item-id WI-305
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

import { execFileSync, execSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { toValidatorSystemConfig } from "../config-foundation/application/mappers/validator-system-config-mapper.js";
import { createConfigFoundationModule } from "../config-foundation/composition-root.js";
import { toWorldModelConfig, type WorldConfigDocument } from "../config-foundation/index.js";
import { createTraceabilityModelModule } from "../traceability-model/composition-root.js";
import type { ValidateMetadataCommandOutput } from "../traceability-model/presentation/cli/validate-metadata-command-handler.js";
import type { AggregatedValidationReport } from "../validator-system/application/dto/aggregated-validation-report.js";
import type { ValidationResultContract } from "../validator-system/application/dto/validation-result-contract.js";
import { createValidatorSystemModule } from "../validator-system/composition-root.js";
import { HumanValidationResultFormatter } from "../validator-system/presentation/formatters/human-validation-result-formatter.js";
import { createWorldModelModule } from "../world-model/index.js";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const DEFAULT_IMPLEMENTATION_EXTENSIONS = Object.freeze([".ts"]);
const MD_EXTENSION = ".md";
const WORK_ITEM_PATH_PATTERN = /(?:^|\/)WI-\d+(?:\/|$)/;
const WORK_ITEM_TRAILER_PATTERN = /^Work-Item:\s*WI-\d+\s*$/m;
const TEST_FILE_SUFFIXES = Object.freeze([".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"]);
const BYPASS_TRAILER_NAMES = Object.freeze(["Bypass-Reason", "Bypass-Evidence", "Bypass-Owner"]);
const OPTIONAL_BYPASS_TRAILER_NAMES = Object.freeze(["Bypass-Report"]);
const NON_BYPASSABLE_VALIDATOR_IDS = Object.freeze(["L2-002", "L2-003", "L2-014"]);

function isConfigNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.name === "ConfigNotFoundError";
}

async function loadValidatorSystemConfig(): Promise<object | undefined> {
  const configMod = createConfigFoundationModule();
  try {
    const resolvedConfig = await configMod.usecases.loadResolvedConfigUseCase.execute();
    return toValidatorSystemConfig(resolvedConfig.config);
  } catch (err) {
    if (isConfigNotFoundError(err)) return undefined;
    throw err;
  }
}

async function loadTraceabilityModelOptions(): Promise<
  { readonly pathRoots: { readonly designDocsRoot: string } } | undefined
> {
  const configMod = createConfigFoundationModule();
  try {
    const resolvedConfig = await configMod.usecases.loadResolvedConfigUseCase.execute();
    return { pathRoots: { designDocsRoot: resolvedConfig.config.paths.designDocs } };
  } catch (err) {
    if (isConfigNotFoundError(err)) return undefined;
    throw err;
  }
}

async function loadPreCommitImplementationExtensions(): Promise<readonly string[] | undefined> {
  const configMod = createConfigFoundationModule();
  try {
    const resolvedConfig = await configMod.usecases.loadResolvedConfigUseCase.execute();
    return resolvedConfig.config.preCommit?.implementationExtensions;
  } catch (err) {
    if (isConfigNotFoundError(err)) return undefined;
    throw err;
  }
}

async function loadWorldConfig(): Promise<WorldConfigDocument | undefined> {
  const configMod = createConfigFoundationModule();
  try {
    const resolvedConfig = await configMod.usecases.loadResolvedConfigUseCase.execute();
    return toWorldModelConfig(resolvedConfig.config);
  } catch (err) {
    if (isConfigNotFoundError(err)) return undefined;
    throw err;
  }
}

function isTestFile(path: string): boolean {
  return TEST_FILE_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

function isMetadataMarkdownFile(path: string): boolean {
  return path.startsWith("docs/inception/") || path.startsWith("docs/product/");
}

const HARNESS_ROOT_PREFIX = "scripts/harness/";
const TESTS_SEGMENT = "__tests__";
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
  const parts = filePath.slice(HARNESS_ROOT_PREFIX.length).split("/");
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
    const content = await readFile(filePath, "utf-8");
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
  readonly validateDesignChangeDeclaration?: (
    input: DesignChangeDeclarationCheckInput,
  ) => Promise<DesignChangeDeclarationCheckResult>;
}

export interface DesignChangeDeclarationCheckInput {
  readonly stagedFiles: readonly string[];
  readonly commitMessage: string;
}

export interface DesignChangeDeclarationCheckFinding {
  readonly code: string;
  readonly path: string;
  readonly declaredKey: string;
  readonly expectedWorkItemIds: readonly string[];
  readonly constraintIds: readonly string[];
}

export interface DesignChangeDeclarationCheckResult {
  readonly status: "skipped" | "passed" | "warning" | "failed";
  readonly checkedFragmentCount: number;
  readonly findings: readonly DesignChangeDeclarationCheckFinding[];
  readonly warningCodes: readonly string[];
}

export interface PreCommitResult {
  readonly exitCode: 0 | 1 | 2;
  readonly stdout: string;
  readonly blockerClasses: readonly BypassBlockerClass[];
}

export interface PreCommitOptions {
  /**
   * Optional commit message supplied by CI / commit-msg style callers.
   * Native pre-commit hooks run before Git creates the message, so this is
   * intentionally opt-in and preserves existing local pre-commit behavior.
   */
  readonly commitMessage?: string;
  readonly implementationExtensions?: readonly string[];
  readonly allowConditionalBypass?: boolean;
  readonly evidenceRoot?: string;
  /** Files observed by the commit-msg design declaration path, including deletions. */
  readonly designChangeFiles?: readonly string[];
}

export interface BypassBlockerClass {
  readonly code: string;
  readonly label: string;
  readonly bypassable: boolean;
}

export interface BypassTrailerValidationResult {
  readonly hasAnyBypassTrailer: boolean;
  readonly complete: boolean;
  readonly errors: readonly string[];
}

export interface BypassAuditOptions {
  readonly baseRef?: string;
  readonly headRef?: string;
  readonly commitMessages?: readonly string[];
  readonly changedFiles?: readonly string[];
  readonly evidenceRoot?: string;
}

function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

function getStagedDesignChangeFiles(): string[] {
  try {
    const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACDMR"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((filePath) => filePath.trim())
      .filter((filePath) => filePath.length > 0);
  } catch {
    return [];
  }
}

function buildReport(results: readonly ValidationResultContract[]): AggregatedValidationReport {
  const passed = results.filter((r) => r.passed && !r.skipped).length;
  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const allErrors = results.flatMap((r) => r.errors);
  const errorCount = allErrors.filter((e) => e.severity === "error").length;
  const warnCount = allErrors.filter((e) => e.severity === "warning").length;
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
  return Math.max(a, b) as 0 | 1 | 2;
}

function requiresWorkItemTrailer(stagedFiles: readonly string[]): boolean {
  return stagedFiles.some(
    (filePath) => filePath.startsWith("docs/inception/") && WORK_ITEM_PATH_PATTERN.test(filePath),
  );
}

function hasWorkItemTrailer(commitMessage: string): boolean {
  return WORK_ITEM_TRAILER_PATTERN.test(commitMessage);
}

function getWorkItemTrailerIds(commitMessage: string): readonly string[] {
  return Object.freeze(
    [...new Set([...commitMessage.matchAll(/^Work-Item:\s*(WI-\d+)\s*$/gm)].map((match) => match[1]))].sort(),
  );
}

function createDesignChangeDeclarationValidator(
  worldConfig: WorldConfigDocument | undefined,
  traceabilityMod: ReturnType<typeof createTraceabilityModelModule>,
  policy: ReturnType<typeof createValidatorSystemModule>["designChangeDeclarationPolicy"],
): NonNullable<PreCommitDeps["validateDesignChangeDeclaration"]> {
  return async ({ stagedFiles, commitMessage }) => {
    if (worldConfig?.enabled !== true) {
      return { status: "skipped", checkedFragmentCount: 0, findings: [], warningCodes: [] };
    }
    const changed = await traceabilityMod.designChangeReadFacade.observe(stagedFiles);
    if (changed.state === "unavailable") {
      return {
        status: "warning",
        checkedFragmentCount: 0,
        findings: [],
        warningCodes: changed.diagnostics.map((item) => item.code).sort(),
      };
    }
    const pinned = await createWorldModelModule({
      rootDir: process.cwd(),
      resolvedConfig: worldConfig,
    }).pinnedDesignEndpointFacade.read();
    if (pinned.state === "unavailable") {
      return {
        status: "warning",
        checkedFragmentCount: 0,
        findings: [],
        warningCodes: pinned.diagnosticCodes.map((code) => `constraint-${code}`).sort(),
      };
    }
    const evaluation = policy.evaluate({
      changedFragments: changed.fragments,
      pinnedEndpoints: pinned.endpoints,
      trailerWorkItemIds: getWorkItemTrailerIds(commitMessage),
    });
    return {
      status: evaluation.findings.length > 0 ? "failed" : "passed",
      checkedFragmentCount: evaluation.checkedFragmentCount,
      findings: evaluation.findings,
      warningCodes: [],
    };
  };
}

function extractTrailer(commitMessage: string, trailerName: string): string | undefined {
  const pattern = new RegExp(`^${trailerName}:\\s*(.+?)\\s*$`, "m");
  return pattern.exec(commitMessage)?.[1]?.trim();
}

function hasTrailer(commitMessage: string, trailerName: string): boolean {
  return extractTrailer(commitMessage, trailerName) !== undefined;
}

function isPathLikeEvidence(value: string): boolean {
  return value.startsWith("report:");
}

function evidencePath(value: string): string {
  return value.slice("report:".length).trim();
}

async function pathExists(path: string, root = process.cwd()): Promise<boolean> {
  try {
    const { resolve } = await import("node:path");
    await access(resolve(root, path));
    return true;
  } catch {
    return false;
  }
}

export async function validateBypassTrailers(
  commitMessage: string,
  evidenceRoot = process.cwd(),
): Promise<BypassTrailerValidationResult> {
  const allTrailerNames = [...BYPASS_TRAILER_NAMES, ...OPTIONAL_BYPASS_TRAILER_NAMES];
  const hasAnyBypassTrailer = allTrailerNames.some((name) => hasTrailer(commitMessage, name));
  if (!hasAnyBypassTrailer) {
    return { hasAnyBypassTrailer: false, complete: false, errors: [] };
  }

  const errors: string[] = [];
  for (const name of BYPASS_TRAILER_NAMES) {
    if (!hasTrailer(commitMessage, name)) {
      errors.push(`Missing required bypass trailer: ${name}`);
    }
  }

  const evidence = extractTrailer(commitMessage, "Bypass-Evidence");
  if (evidence !== undefined) {
    if (evidence.startsWith("command:")) {
      const command = evidence.slice("command:".length).trim();
      if (command.length === 0) {
        errors.push("Bypass-Evidence command must not be empty.");
      }
    } else if (isPathLikeEvidence(evidence)) {
      const reportPath = evidencePath(evidence);
      if (reportPath.length === 0) {
        errors.push("Bypass-Evidence report path must not be empty.");
      } else if (!(await pathExists(reportPath, evidenceRoot))) {
        errors.push(`Bypass-Evidence report does not exist: ${reportPath}`);
      }
    } else {
      errors.push("Bypass-Evidence must start with command: or report:.");
    }
  }

  const report = extractTrailer(commitMessage, "Bypass-Report");
  if (report !== undefined && !(await pathExists(report, evidenceRoot))) {
    errors.push(`Bypass-Report does not exist: ${report}`);
  }

  return { hasAnyBypassTrailer: true, complete: errors.length === 0, errors };
}

function classifyValidatorFailure(result: ValidationResultContract): BypassBlockerClass | undefined {
  if (result.passed || result.skipped) return undefined;
  const nonBypassable = NON_BYPASSABLE_VALIDATOR_IDS.includes(result.validatorId);
  return {
    code: result.validatorId,
    label: result.validatorId === "L2-003" ? "test-quality" : result.validatorId,
    bypassable: !nonBypassable,
  };
}

function metadataBlocker(): BypassBlockerClass {
  return { code: "metadata", label: "metadata", bypassable: false };
}

function hasNonBypassableBlocker(blockers: readonly BypassBlockerClass[]): boolean {
  return blockers.some((blocker) => !blocker.bypassable);
}

function normalizeImplementationExtensions(extensions: readonly string[] | undefined): readonly string[] {
  const rawExtensions =
    extensions === undefined || extensions.length === 0 ? DEFAULT_IMPLEMENTATION_EXTENSIONS : extensions;
  return rawExtensions.map((extension) => (extension.startsWith(".") ? extension : `.${extension}`));
}

function hasAnyExtension(filePath: string, extensions: readonly string[]): boolean {
  return extensions.some((extension) => filePath.endsWith(extension));
}

export async function runPreCommit(
  stagedFiles: readonly string[],
  deps: PreCommitDeps,
  options: PreCommitOptions = {},
): Promise<PreCommitResult> {
  const implementationExtensions = normalizeImplementationExtensions(options.implementationExtensions);
  const implementationFiles = stagedFiles.filter((f) => hasAnyExtension(f, implementationExtensions));
  const mdFiles = stagedFiles.filter((f) => f.endsWith(MD_EXTENSION) && isMetadataMarkdownFile(f));
  const testFiles = implementationFiles.filter((f) => isTestFile(f));
  const metadataFiles = [...mdFiles, ...testFiles];

  if (implementationFiles.length === 0 && mdFiles.length === 0) {
    return {
      exitCode: 0,
      stdout: `${DIM}[phasegate] No staged files to check. Skipping.${RESET}`,
      blockerClasses: [],
    };
  }

  const sections: string[] = [];
  sections.push(
    `${BOLD}[phasegate]${RESET} Pre-commit check ` +
      `(${implementationFiles.length} implementation file(s), ${mdFiles.length} .md file(s))`,
  );

  let exitCode: 0 | 1 | 2 = 0;
  const blockerClasses: BypassBlockerClass[] = [];

  if (implementationFiles.length > 0) {
    // staged TS file を Unit ごとにグルーピングし、Unit 単位で L2 phase gate
    // （L2-001 の `{unit}_unit.md` 等）を評価する。Unit を特定できないファイルは
    // 別グループ（unitName=''）として従来挙動で評価する。
    const filesByUnit = new Map<string, string[]>();
    for (const f of implementationFiles) {
      const unit = (await resolveUnitName(f)) ?? "";
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
        currentPhase: "",
      });
      runs.push(results);
    }

    const merged = mergePerUnitResults(runs);
    blockerClasses.push(
      ...merged.flatMap((result) => {
        const blocker = classifyValidatorFailure(result);
        return blocker === undefined ? [] : [blocker];
      }),
    );
    const report = buildReport(merged);
    sections.push("");
    sections.push(`${BOLD}== 実装ファイル (${implementationFiles.length} file(s)) ==${RESET}`);
    sections.push(new HumanValidationResultFormatter().format(report));
    if (!report.overallPassed) {
      exitCode = maxExitCode(exitCode, 1);
    }
  }

  if (metadataFiles.length > 0) {
    const metadataResult = await deps.validateMetadataCommandHandler.execute({
      filePaths: metadataFiles,
    });
    sections.push("");
    sections.push(`${BOLD}== 設計 / テスト メタデータ注釈 (${metadataFiles.length} file(s)) ==${RESET}`);
    sections.push(metadataResult.text);
    exitCode = maxExitCode(exitCode, metadataResult.exitCode);
    if (metadataResult.exitCode !== 0) {
      blockerClasses.push(metadataBlocker());
    }
  }

  if (options.commitMessage !== undefined && requiresWorkItemTrailer(stagedFiles)) {
    sections.push("");
    sections.push(`${BOLD}== Work-Item trailer ==${RESET}`);
    if (hasWorkItemTrailer(options.commitMessage)) {
      sections.push(`${GREEN}PASS${RESET} Work-Item trailer is present.`);
    } else {
      sections.push(
        `${RED}FAIL${RESET} Commit message must include \`Work-Item: WI-XXX\` when WI documents are staged.`,
      );
      exitCode = maxExitCode(exitCode, 1);
    }
  }

  if (options.commitMessage !== undefined && deps.validateDesignChangeDeclaration !== undefined) {
    const designResult = await deps.validateDesignChangeDeclaration({
      stagedFiles: options.designChangeFiles ?? stagedFiles,
      commitMessage: options.commitMessage,
    });
    if (designResult.status !== "skipped") {
      sections.push("");
      sections.push(`${BOLD}== Design change declaration ==${RESET}`);
      if (designResult.status === "failed") {
        for (const finding of designResult.findings) {
          sections.push(
            `${RED}FAIL${RESET} ${finding.code}: ${finding.path}#${finding.declaredKey} ` +
              `(expected ${finding.expectedWorkItemIds.join(", ") || "an explicit Work Item"}; ` +
              `constraints ${finding.constraintIds.join(", ")})`,
          );
        }
        sections.push(`${DIM}Local commit-msg is forgeable; L3-008 remains authoritative.${RESET}`);
        blockerClasses.push({
          code: "design-change-declaration",
          label: "design change declaration",
          bypassable: false,
        });
        exitCode = maxExitCode(exitCode, 1);
      } else if (designResult.status === "warning") {
        sections.push(
          `${DIM}WARN ${designResult.warningCodes.join(", ")}; local fast-path continues fail-open. ` +
            `L3-008 remains authoritative.${RESET}`,
        );
      } else {
        sections.push(
          `${GREEN}PASS${RESET} ${designResult.checkedFragmentCount} pinned fragment(s) have matching Work-Item declarations.`,
        );
      }
    }
  }

  if (options.commitMessage !== undefined) {
    const bypassValidation = await validateBypassTrailers(options.commitMessage, options.evidenceRoot);
    if (bypassValidation.hasAnyBypassTrailer) {
      sections.push("");
      sections.push(`${BOLD}== Bypass audit ==${RESET}`);
      if (!bypassValidation.complete) {
        for (const error of bypassValidation.errors) {
          sections.push(`${RED}FAIL${RESET} ${error}`);
        }
        exitCode = maxExitCode(exitCode, 1);
      } else if (hasNonBypassableBlocker(blockerClasses)) {
        const labels = blockerClasses.filter((blocker) => !blocker.bypassable).map((blocker) => blocker.label);
        sections.push(`${RED}FAIL${RESET} Bypass rejected for non-bypassable blocker(s): ${labels.join(", ")}`);
        exitCode = maxExitCode(exitCode, 1);
      } else if (exitCode !== 0 && options.allowConditionalBypass === true) {
        sections.push(`${GREEN}PASS${RESET} Conditional bypass evidence is complete.`);
        exitCode = 0;
      } else {
        sections.push(`${GREEN}PASS${RESET} Bypass trailers are complete.`);
      }
    }
  }

  sections.push("");
  if (exitCode === 0) {
    sections.push(`${GREEN}[phasegate]${RESET} All checks passed.`);
  } else {
    sections.push(`${RED}${BOLD}[phasegate] Commit blocked.${RESET}`);
  }

  return {
    exitCode,
    stdout: sections.join("\n"),
    blockerClasses,
  };
}

function getChangedFilesInRange(baseRef: string, headRef: string): string[] {
  try {
    const output = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACM", `${baseRef}..${headRef}`], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function getCommitMessagesInRange(baseRef: string, headRef: string): string[] {
  try {
    const output = execFileSync("git", ["log", "--format=%B%x1e", `${baseRef}..${headRef}`], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\x1e")
      .map((message) => message.trim())
      .filter((message) => message.length > 0);
  } catch {
    return [];
  }
}

function hasCompleteBypassTrailerSet(results: readonly BypassTrailerValidationResult[]): boolean {
  return results.some((result) => result.hasAnyBypassTrailer && result.complete);
}

function toBypassAuditStdout(stdout: string, changedFiles: readonly string[]): string {
  if (changedFiles.length > 0) return stdout;
  return stdout.replace("No staged files to check. Skipping.", "No changed files in range to check. Skipping.");
}

export async function runBypassAudit(deps: PreCommitDeps, options: BypassAuditOptions = {}): Promise<PreCommitResult> {
  const baseRef = options.baseRef ?? "origin/main";
  const headRef = options.headRef ?? "HEAD";
  const changedFiles = options.changedFiles ?? getChangedFilesInRange(baseRef, headRef);
  const commitMessages = options.commitMessages ?? getCommitMessagesInRange(baseRef, headRef);
  const syntheticCommitMessage = commitMessages.join("\n\n");

  const result = await runPreCommit(changedFiles, deps, {
    commitMessage: syntheticCommitMessage,
    allowConditionalBypass: true,
    evidenceRoot: options.evidenceRoot,
  });
  const bypassResults = await Promise.all(
    commitMessages.map((message) => validateBypassTrailers(message, options.evidenceRoot)),
  );

  const sections = [
    `${BOLD}[phasegate]${RESET} Bypass audit (${baseRef}..${headRef})`,
    toBypassAuditStdout(result.stdout, changedFiles),
  ];
  let exitCode = result.exitCode;
  if (result.exitCode !== 0 && !hasCompleteBypassTrailerSet(bypassResults)) {
    sections.push("");
    sections.push(`${RED}FAIL${RESET} Gate failure requires complete bypass trailers.`);
    exitCode = 1;
  }

  return {
    exitCode,
    stdout: sections.join("\n"),
    blockerClasses: result.blockerClasses,
  };
}

export async function runPreCommitCli(): Promise<void> {
  try {
    const stagedFiles = getStagedFiles();
    const validatorMod = createValidatorSystemModule(await loadValidatorSystemConfig());
    const traceabilityMod = createTraceabilityModelModule(process.cwd(), await loadTraceabilityModelOptions());

    const result = await runPreCommit(
      stagedFiles,
      {
        runL2ValidatorsUseCase: validatorMod.runL2ValidatorsUseCase,
        validateMetadataCommandHandler: traceabilityMod.validateMetadataCommandHandler,
      },
      {
        commitMessage: process.env.PHASEGATE_COMMIT_MESSAGE,
        implementationExtensions: await loadPreCommitImplementationExtensions(),
      },
    );

    process.stdout.write(`${result.stdout}\n`);
    process.exit(result.exitCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${RED}[phasegate] Unexpected error:${RESET} ${msg}\n`);
    process.exit(2);
  }
}

export async function runCommitMsgCli(commitMessagePath: string | undefined): Promise<void> {
  try {
    if (!commitMessagePath) {
      process.stderr.write(`${RED}[phasegate] commit-msg requires a commit message file path.${RESET}\n`);
      process.exit(2);
    }

    const stagedFiles = getStagedFiles();
    const commitMessage = await readFile(commitMessagePath, "utf-8");
    const validatorMod = createValidatorSystemModule(await loadValidatorSystemConfig());
    const traceabilityMod = createTraceabilityModelModule(process.cwd(), await loadTraceabilityModelOptions());
    const worldConfig = await loadWorldConfig();

    const result = await runPreCommit(
      stagedFiles,
      {
        runL2ValidatorsUseCase: validatorMod.runL2ValidatorsUseCase,
        validateMetadataCommandHandler: traceabilityMod.validateMetadataCommandHandler,
        validateDesignChangeDeclaration: createDesignChangeDeclarationValidator(
          worldConfig,
          traceabilityMod,
          validatorMod.designChangeDeclarationPolicy,
        ),
      },
      {
        commitMessage,
        designChangeFiles: getStagedDesignChangeFiles(),
        implementationExtensions: await loadPreCommitImplementationExtensions(),
        evidenceRoot: process.cwd(),
      },
    );

    process.stdout.write(`${result.stdout}\n`);
    process.exit(result.exitCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${RED}[phasegate] Unexpected error:${RESET} ${msg}\n`);
    process.exit(2);
  }
}

function parseCliFlag(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

export async function runBypassAuditCli(args: readonly string[] = []): Promise<void> {
  try {
    const validatorMod = createValidatorSystemModule(await loadValidatorSystemConfig());
    const traceabilityMod = createTraceabilityModelModule(process.cwd(), await loadTraceabilityModelOptions());
    const result = await runBypassAudit(
      {
        runL2ValidatorsUseCase: validatorMod.runL2ValidatorsUseCase,
        validateMetadataCommandHandler: traceabilityMod.validateMetadataCommandHandler,
      },
      {
        baseRef: parseCliFlag(args, "--base"),
        headRef: parseCliFlag(args, "--head"),
        evidenceRoot: process.cwd(),
      },
    );

    process.stdout.write(`${result.stdout}\n`);
    process.exit(result.exitCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${RED}[phasegate] Unexpected error:${RESET} ${msg}\n`);
    process.exit(2);
  }
}
