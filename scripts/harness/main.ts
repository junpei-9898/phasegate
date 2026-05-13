/**
 * @unit harness-api
 * @layer presentation
 * @work-item-id WI-090 / WI-091
 * @work-item-id WI-113 / WI-142
 * @work-item-id WI-171 / WI-172 / WI-173
 * @work-item-id WI-175
 *
 * Phasegate CLI エントリポイント。
 * 各Unitの Composition Root からハンドラーを取得し、コマンドに応じてディスパッチする。
 *
 * 起動時に config-foundation で設定を解決し、他Unit に注入する（Cross-unit wiring）。
 */

import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  readdir as fsReaddir,
  readlink as fsReadlink,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createAdrFoundationModule } from "./adr-foundation/composition-root.js";
import { createBiomeAstEngineModule } from "./biome-ast-engine/composition-root.js";
import { buildCiGovernance } from "./ci-governance/composition-root.js";
import { toPhaseConfigSection } from "./config-foundation/application/mappers/phase-config-section-mapper.js";
import { toValidatorSystemConfig } from "./config-foundation/application/mappers/validator-system-config-mapper.js";
import { createConfigFoundationModule } from "./config-foundation/composition-root.js";
import { ConfigValidationError } from "./config-foundation/domain/errors/config-validation-error.js";
import type { HarnessConfigV2 } from "./config-foundation/domain/harness-config.js";
import {
  ConfigNotFoundError,
  ConfigPersistenceError,
} from "./config-foundation/infrastructure/repositories/file-system-config-repository.js";
import { createHarnessApiModule } from "./harness-api/composition-root.js";
import { createHarnessErrorModule } from "./harness-error/composition-root.js";
import { createInstallationModule } from "./installation/composition-root.js";
import { SkillDeployerManifestBuilder, type DeployManifestRecord } from "./installation/application/wrappers/skill-deployer-manifest-builder.js";
import { NodeCryptoHashAdapter } from "./installation/infrastructure/adapters/node-crypto-hash-adapter.js";
import { CheckStoryReflectionUseCase } from "./phase-dependency-model/application/usecases/check-story-reflection-usecase.js";
import { createPhaseDependencyModelModule } from "./phase-dependency-model/composition-root.js";
import { StoryReflectionChecker } from "./phase-dependency-model/domain/services/story-reflection-checker.js";
import { StoryReflectionResult } from "./phase-dependency-model/domain/values/story-reflection-result.js";
import {
  HarnessConfigPhaseConfigProvider,
  type PhaseConfigSection as PhaseDepConfigSection,
} from "./phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.js";
import { FileSystemStoryReflectionAdapter } from "./phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js";
import { StoryReflectionStatusPresenter } from "./phase-dependency-model/presentation/cli/story-reflection-status-presenter.js";
import { buildPhase2Extensions } from "./phase2-extensions/composition-root.js";
import { createQuickModeCompositionRoot } from "./quick-mode/composition-root.js";
import { buildRegressionSuite } from "./regression-suite/composition-root.js";
import type { SkillSet } from "./setup/skill-deployer.js";
import {
  deployAgentSkillLinks,
  deployCodexHooks,
  deployCiWorkflows,
  deployDesignDocs,
  deployHookScripts,
  deployHuskyCommitMsgHook,
  deployHuskyHook,
  deployHuskyPrePushHook,
  deploySkills,
  getCategoryForSkill,
  getHarnessVersion,
  initHarnessConfig,
} from "./setup/skill-deployer.js";
import { createSkillQualityHandlers } from "./skill-quality/composition-root.js";
import { createTraceabilityModelModule } from "./traceability-model/composition-root.js";
import { createValidatorSystemModule } from "./validator-system/composition-root.js";

/**
 * main.ts (scripts/harness/main.ts) から2階層上がパッケージルート。
 * process.argv[1] は tsx 実行時にスクリプトの絶対パスになる。
 */
function getHarnessRoot(): string {
  return resolve(dirname(process.argv[1]), "../..");
}

function getProjectRoot(): string {
  return process.cwd();
}

function toTraceabilityModelOptions(resolvedConfig: HarnessConfigV2 | undefined) {
  return resolvedConfig
    ? { pathRoots: { designDocsRoot: resolvedConfig.paths.designDocs } }
    : undefined;
}

interface PackageJsonDocument {
  readonly [key: string]: unknown;
  readonly dependencies?: unknown;
  readonly devDependencies?: unknown;
}

interface PackageDependencyResult {
  readonly created: boolean;
  readonly updated: boolean;
  readonly alreadyPresent: boolean;
  readonly skipped: boolean;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function ensurePhasegatePackageDependency(rootDir: string, version: string): Promise<PackageDependencyResult> {
  const packageJsonPath = join(rootDir, "package.json");
  let pkg: PackageJsonDocument = {};
  let created = false;

  try {
    const raw = await fsReadFile(packageJsonPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isJsonRecord(parsed)) {
      return { created: false, updated: false, alreadyPresent: false, skipped: true };
    }
    pkg = parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      return { created: false, updated: false, alreadyPresent: false, skipped: true };
    }
    created = true;
  }

  if (
    (isJsonRecord(pkg.devDependencies) && pkg.devDependencies.phasegate !== undefined) ||
    (isJsonRecord(pkg.dependencies) && pkg.dependencies.phasegate !== undefined)
  ) {
    return { created: false, updated: false, alreadyPresent: true, skipped: false };
  }

  pkg = {
    ...pkg,
    devDependencies: {
      ...(isJsonRecord(pkg.devDependencies) ? pkg.devDependencies : {}),
      phasegate: `^${version}`,
    },
  };
  await fsWriteFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  return { created, updated: !created, alreadyPresent: false, skipped: false };
}

function printUsage(): void {
  const usage = `
Usage: phasegate <command> [options]

Setup:
  init                         Initialize project: deploy skills + design docs + phasegate.config.json
                               (--name <project-name>, --preset <full|standard|minimal|custom>,
                                --skills <core|all>, --agent <claude|codex|both>, --workflow <standard|strict>,
                                --with-husky, --with-ci, --yes)
  update-skills                Alias for reconcile (kept for compatibility)
  doctor                       Diagnose silent installation failures (--json, --strict, --report-out <path>)
  scaffold-wi <unit> <type>    Create docs/inception/{unit}/WI-XXX/description.md
  emit-agent-rules             Print AGENTS.md / CLAUDE.md WI workflow rules block
  install                      Install phasegate managed files (--dry-run|--apply, --force)
  uninstall                    Uninstall phasegate managed files (--dry-run|--apply, --force)
  reconcile                    Reconcile phasegate managed files (--dry-run|--apply, --force)
  setup:agent                  Diagnose repo setup and produce/apply an agent-readable setup plan
  config:plan                  Produce an agent-readable configuration change plan

Commands:
  enable-feature <name>        Enable a harness feature
  disable-feature <name>       Disable a harness feature
  list-features                List available features
  migrate                      Migrate phasegate.config.json (--schema v3, --config <path>)
  work-items:status            Report or apply derived WI frontmatter status (--dry-run|--apply, --id, --fail-on-stale, --json)

  render-errors                Render harness errors (--format human|agent|ci)
  validate-fix                 Validate fix examples (--code <code>)
  list-errors                  List error definitions (--format human|json, --layer L0-L4)

  validate-metadata <files..>  Validate implementation metadata
  check-phase-gate             Check phase gate (--level 1|2|3)

  list-adrs                    List ADRs (--status Proposed|Accepted|...)
  validate-adr                 Validate ADRs (--all or <adrRef>)

  lint                         Run lint checks (--json, --target <path>)

  validate                     Run validators (--layer L2|L3|L4|all; L0 prints runtime hook info, --unit, --format human|agent|ci)
  ci-check                     CI check (--quick for quick mode, --fail-on-reject, --dry-run, --files)

  phasegate:check-ready         Check ready status (--json)
  phasegate:check-phase         Check phase gate (--unit <unitId>, --json)
  phasegate:ci-check            Full CI check (--json)
  phasegate:detect-drift         Detect design/code drift (--json)
  phasegate:status              Phasegate overall status (--json)
  phasegate:lint                Lint via harness-api (--target <path>, --json)
  phasegate:complete-check       Complete L2-L4 check (--json)
  phasegate:impact-analysis      Impact analysis for story (<storyId>, --json)
  phasegate:generate-matrix      Generate requirement-test matrix (--requirements, --tests, --out, --json)

  ci:generate-template         Generate CI template (--preset <id>, default: standard; --type <aidlc-gate|consistency-check|pre-commit|agent-context-refresh>, --render, --json)
  ci:migrate-agents-md         Migrate AGENTS.md (--dry-run, --validate-only, --json)
  ci:auto-refresh-agent-context Refresh AGENTS.md / CLAUDE.md (--dry-run, --apply, --json)
  refresh-claude-md            Refresh CLAUDE.md standard sections (--dry-run, --apply, --json)
  p2:check-agent-context       Check AGENTS.md / CLAUDE.md freshness (--threshold-days <n>, --json)
  setup:agent                  Plan agent-driven setup (--intent <minimal|recommended|strict|ci-only|agent-hooks|retrofit>, --agent <claude|codex|both>, --dry-run|--apply, --json)
  config:plan                  Plan safe config changes (--intent <l4-strict|codex-hooks|ci-fail-on-warning|baseline-reset|quick-mode-strict>, --dry-run, --json)
  ci:check-repetition          Check error repetition (--code <errorCode>, --reset, --json)
  baseline                     Create retrofit baseline snapshot (--dry-run, --force, --paths <glob,glob,...>, --json)
  scaffold-design              Scaffold a design doc (--unit <id>, --phase <logical|domain|uiux|unit-test|it-test>, --force, --json)

  skill:execute-tdd-cycle      Execute TDD cycle (--unit, --story, --desc, --phase RED|GREEN|REFACTOR, --passed)
  skill:check-coverage         Check coverage (--story <storyId>, --json)
  skill:collect-lessons        Collect lessons (--story <storyId>, --sources <paths>, --write-artifact)
  skill:apply-cascade-update   Apply cascade update (--story <storyId>, --dry-run)
  skill:validate-structure     Validate skill structure (--file <path>, --json)

  regression:run-k-requirements  Run K-requirements regression suite
  regression:run-gng-gate        Run GnG gate regression suite
  regression:run-agent-guard     Run agent independence guard
  regression:run-k14-k15         Run K14/K15 regression suite
  regression:configure-ci-gate   Configure CI gate (--suites <ids>, --threshold <n>)
  regression:analyze-migration   Analyze V0 test migration (--dry-run)
  regression:migrate-v0-tests    Execute V0 test migration (--confirm)

  p2:check-freshness             Check doc freshness (--pattern <glob>, --dry-run, --format text|json)
  p2:validate-pointers           Validate doc pointers (--include-urls, --format text|json)
  p2:generate-e2e-template       Generate E2E test template (--phase <phase>, --output <path>)
  p2:check-initial-creation      Detect long-lived initial_creation:true docs (--pattern <glob>, --format text|json)
  hook <pre-tool-use|post-tool-use|stop|session-start|user-prompt-submit>  Run agent hook (reads JSON from stdin; writes JSON to stdout for session-start/user-prompt-submit)
  pre-commit                              Run L2 pre-commit validators on staged files
  commit-msg <message-file>               Validate commit message trailers against staged files
  bypass:audit --base <ref> [--head <ref>] Audit bypass evidence for a push/CI commit range
  delegate-sonnet [...args]               Delegate task to Sonnet 4.6 (forwards args to scripts/delegate-sonnet.sh)

Skills:
  skills list                  List all available skills
  skills info <name>           Show skill details (SKILL.md)

Options:
  --help                       Show this help message
  --version                    Show version number
  --json                       Output in JSON format
`.trim();

  console.log(usage);
}

function parseFlag(args: readonly string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
}

type WorkflowMode = "standard" | "strict";
type ScaffoldWorkItemType = "story" | "issue" | "chore";

function parseWorkflowMode(value: string | undefined): WorkflowMode {
  return value === "strict" ? "strict" : "standard";
}

function parseScaffoldWorkItemType(value: string | undefined): ScaffoldWorkItemType | null {
  if (value === "story" || value === "issue" || value === "chore") return value;
  return null;
}

function emitAgentRulesBlock(): string {
  return [
    "## PhaseGate WI Workflow (auto-generated; do not edit by hand)",
    "- All plans/designs/implementations require a WI directory first.",
    "- Path: `docs/inception/{unit}/WI-XXX/description.md` with required frontmatter.",
    "- Use `phasegate scaffold-wi <unit> <type>` to create one.",
    "- Plans written under `docs/inception/codding_plan/` are legacy; new plans go in WI dirs.",
  ].join("\n");
}

async function listFilesRecursive(root: string): Promise<string[]> {
  try {
    const entries = await fsReaddir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const path = join(root, entry.name);
      if (entry.isFile()) {
        files.push(path);
      } else if (entry.isDirectory()) {
        files.push(...(await listFilesRecursive(path)));
      }
    }
    return files;
  } catch {
    return [];
  }
}

async function nextWorkItemId(rootDir: string): Promise<string> {
  const files = await listFilesRecursive(join(rootDir, "docs", "inception"));
  let max = 0;
  for (const file of files) {
    const match = file.match(/\/WI-(\d{3})\/description\.md$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `WI-${String(max + 1).padStart(3, "0")}`;
}

async function countLegacyPlansWithoutWorkItems(rootDir: string): Promise<number> {
  const files = await listFilesRecursive(join(rootDir, "docs", "inception"));
  const hasWorkItem = files.some((file) => /\/WI-\d{3}\/description\.md$/.test(file));
  if (hasWorkItem) return 0;
  return files.filter((file) => file.includes("/codding_plan/") || file.endsWith("_plan.md")).length;
}

async function scaffoldInceptionRoots(rootDir: string, unit: string | null = null): Promise<void> {
  await fsMkdir(join(rootDir, "docs", "inception", "_shared"), { recursive: true });
  await fsMkdir(join(rootDir, "docs", "inception", "_cross"), { recursive: true });
  if (unit && unit !== "_cross" && unit !== "_shared") {
    await fsMkdir(join(rootDir, "docs", "inception", unit), { recursive: true });
    await fsWriteFile(join(rootDir, "docs", "inception", unit, ".gitkeep"), "", "utf8").catch(() => undefined);
  }
}

async function scaffoldWorkItem(rootDir: string, unit: string, type: ScaffoldWorkItemType): Promise<string> {
  const id = await nextWorkItemId(rootDir);
  await scaffoldInceptionRoots(rootDir, unit);
  const targetBase = unit === "_cross" ? join(rootDir, "docs", "inception", "_cross") : join(rootDir, "docs", "inception", unit);
  const targetDir = join(targetBase, id);
  await fsMkdir(targetDir, { recursive: true });
  const descriptionPath = join(targetDir, "description.md");
  const titleScope = unit === "_cross" ? "Cross-cutting" : unit;
  const content = [
    "---",
    `id: ${id}`,
    `type: ${type}`,
    "severity: normal",
    "status: drafted",
    "---",
    "",
    `# ${id}: ${titleScope} work item`,
    "",
    "## Context",
    "",
    "TBD",
    "",
    "## Acceptance Criteria",
    "",
    "- [ ] TBD",
    "",
  ].join("\n");
  await fsWriteFile(descriptionPath, content, "utf8");
  return descriptionPath;
}

async function createFileManifestRecord(
  rootDir: string,
  relativePath: string,
  mode: "created" | "merged" = "created",
): Promise<DeployManifestRecord | null> {
  try {
    const contentForHash = await fsReadFile(join(rootDir, relativePath), "utf8");
    return { path: relativePath, mode, contentForHash };
  } catch {
    return null;
  }
}

async function createSymlinkManifestRecord(rootDir: string, relativePath: string): Promise<DeployManifestRecord | null> {
  try {
    const target = await fsReadlink(join(rootDir, relativePath));
    return { path: relativePath, mode: "symlink", contentForHash: target };
  } catch {
    return null;
  }
}

async function saveInstallationManifest(
  rootDir: string,
  version: string,
  records: readonly (DeployManifestRecord | null | Promise<DeployManifestRecord | null>)[],
): Promise<void> {
  const filteredRecords = (await Promise.all(records)).filter((record) => record !== null);
  if (filteredRecords.length === 0) return;
  const mod = createInstallationModule();
  const builder = new SkillDeployerManifestBuilder(new NodeCryptoHashAdapter());
  await mod.manifestRepository.save(rootDir, builder.build(version, filteredRecords));
}

/**
 * WI-094 / ADR-017: CLI で boolean フラグを tri-state に解釈する。
 * - `--<flag>` 指定 → true
 * - `--no-<flag>` 指定 → false
 * - 両方未指定 → undefined (config 値にフォールバック)
 * 両方同時指定された場合は後置を優先する。
 */
function parseTriStateFlag(args: readonly string[], positiveFlag: string, negativeFlag: string): boolean | undefined {
  const positiveIdx = args.lastIndexOf(positiveFlag);
  const negativeIdx = args.lastIndexOf(negativeFlag);
  if (positiveIdx === -1 && negativeIdx === -1) return undefined;
  return positiveIdx > negativeIdx;
}

function parseValidateFormat(args: readonly string[]): "human" | "agent" | "ci" | undefined {
  const raw = parseFlag(args, "--format");
  if (raw === undefined) return undefined;
  if (raw === "human" || raw === "agent" || raw === "ci") return raw;
  throw new Error(`Invalid --format value for validate: '${raw}'. Supported values: human, agent, ci.`);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function findClosestFlag(input: string, known: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const flag of known) {
    const dist = levenshtein(input, flag);
    if (dist < bestDist) {
      bestDist = dist;
      best = flag;
    }
  }
  return bestDist <= 4 ? best : undefined;
}

function validateKnownFlags(args: readonly string[], known: readonly string[]): string | null {
  const knownSet = new Set(known);
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      i++;
      continue;
    }
    const flagName = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (knownSet.has(flagName)) {
      i++;
      continue;
    }
    const suggestion = findClosestFlag(flagName, known);
    return suggestion
      ? `Error: unknown flag '${flagName}'. Did you mean '${suggestion}'?`
      : `Error: unknown flag '${flagName}'. Known flags: ${known.join(", ")}`;
  }
  return null;
}

const SUBCOMMAND_HELP: Record<string, string> = {
  init: `Usage: phasegate init [options]

Initialize phasegate in the current project: deploy skills + design docs + phasegate.config.json.

Options:
  --name <project-name>           Project name (default: "my-project")
  --preset <full|standard|minimal|custom>   Phase dependency preset (default: "standard")
  --skills <core|all>             Skill set to deploy (default: "all")
  --agent <claude|codex|both>     Agent integration target (default: "claude")
  --workflow <standard|strict>    Workflow enforcement defaults (default: "standard")
  --with-husky                    Install Husky pre-commit hooks
  --with-ci                       Install GitHub Actions workflows
  --yes                           Skip confirmation prompts
  --help, -h                      Show this help`,
  "update-skills": `Usage: phasegate update-skills [options]

Compatibility alias for phasegate reconcile. WARNING: this command no longer redeploys skills directly.
It updates PhaseGate-managed files from the installed manifest.

Options:
  --dry-run                       Preview target actions without writing (default)
  --apply                         Write reconcile results and manifest
  --force                         Force ai-assisted/manual targets after backing up existing files
  --json                          Output machine-readable JSON
  --help, -h                      Show this help`,
  install: `Usage: phasegate install [options]

Install phasegate managed files with structured merge.

Options:
  --dry-run                       Preview target actions without writing (default)
  --apply                         Write merge results and manifest
  --force                         Force ai-assisted/manual targets after backing up existing files
  --agent <claude|codex|both>     Agent context and hook targets (default: both)
  --skills <core|all>             Rendered agent context skill mode (default: all)
  --workflow <standard|strict>    Rendered agent context workflow mode (default: standard)
  --with-husky                    Include Husky hook targets
  --with-ci                       Include GitHub Actions target
  --json                          Output machine-readable JSON
  --help, -h                      Show this help`,
  "setup:agent": `Usage: phasegate setup:agent [options]

Diagnose repository setup and produce an agent-readable setup plan.

Options:
  --intent <minimal|recommended|strict|ci-only|agent-hooks|retrofit>
  --agent <claude|codex|both>
  --workflow <standard|strict>
  --with-husky
  --with-ci
  --dry-run
  --apply
  --json
  --help, -h                      Show this help`,
  "config:plan": `Usage: phasegate config:plan --intent <intent> [options]

Produce an agent-readable configuration change plan.

Intents:
  l4-strict, codex-hooks, ci-fail-on-warning, baseline-reset, quick-mode-strict

Options:
  --dry-run
  --json
  --help, -h                      Show this help`,
  reconcile: `Usage: phasegate reconcile [options]

Reconcile PhaseGate-managed files with the current bundled templates.

Options:
  --dry-run                       Preview target actions without writing (default)
  --apply                         Write managed updates and manifest
  --force                         Force ai-assisted/manual targets after backing up existing files
  --json                          Output machine-readable JSON
  --help, -h                      Show this help`,
  validate: `Usage: phasegate validate [options]

Run validators against the project. Without --layer, runs all enabled validator layers (L2/L3/L4).

Options:
  --layer <L0|L2|L3|L4>           Run only the specified validator layer; L0 prints runtime hook info
  --json                          Output machine-readable JSON
  --help, -h                      Show this help`,
  lint: `Usage: phasegate lint [options]

Run L1 Biome AST checks across the project.

Options:
  --json                          Output machine-readable JSON
  --help, -h                      Show this help`,
  migrate: `Usage: phasegate migrate [options]

Migrate phasegate.config.json from older schema versions. Backs up the original to phasegate.config.json.bak.

Options:
  --dry-run                       Preview changes without writing
  --help, -h                      Show this help`,
  "list-errors": `Usage: phasegate list-errors [options]

List validator error catalog entries.

Options:
  --layer <L0|L1|L2|L3|L4>        Filter by layer
  --format <table|json>           Output format (default: "table")
  --help, -h                      Show this help`,
  "phasegate:status": `Usage: phasegate phasegate:status

Display harness status (enabled validators, schema version, hook deployment).`,
  "work-items:status": `Usage: phasegate work-items:status (--dry-run|--apply) [options]

Derive WI frontmatter status from inception, product reflection, implementation, and test evidence.

Options:
  --dry-run         Print current status, derived status, reason, and next action.
  --apply           Update only the status line in each stale description.md frontmatter.
  --id <WI-XXX>     Limit report/apply to one work item.
  --fail-on-stale   Return exit code 1 when dry-run finds stale status.
  --allow-downgrade Allow apply to lower a frontmatter status.
  --changed-only    Reserve apply scope for changed WI files; currently accepted as a no-op policy flag.
  --json            Output machine-readable JSON.
  --help, -h        Show this help`,
  "phasegate:detect-drift": `Usage: phasegate phasegate:detect-drift [options]

Run L4-001 drift detection between design documents and source code. WARNING: scans the project filesystem.

Options:
  --json                          Output machine-readable JSON (default for this command)
  --help, -h                      Show this help`,
  "phasegate:check-ready": `Usage: phasegate phasegate:check-ready

Check whether the harness is ready (config valid, hooks deployed).`,
  "phasegate:complete-check": `Usage: phasegate phasegate:complete-check

Run completion check (used by Stop hook). Validates phase-gate, metadata, and test-quality.`,
  "phasegate:check-phase": `Usage: phasegate phasegate:check-phase [options]

Check phase gate for a specific unit.

Options:
  --unit <unitId>   Target unit ID (e.g., harness-api). If omitted,
                    the first positional argument is used.
  --json            Output result as JSON.
  --help, -h        Show this help.

Examples:
  phasegate phasegate:check-phase --unit harness-api
  phasegate phasegate:check-phase harness-api --json`,
  "check-change-category": `Usage: phasegate check-change-category --paths <csv> [options]

Classify changed file paths into quick-mode categories and report
whether Full Mode is required.

Options:
  --paths <csv>              Comma-separated file paths to classify.
  --format <human|json>      Output format. Default: human.
  --fail-on-full-required    Exit with code 1 when Full Mode is required.
  --help, -h                 Show this help.

Examples:
  phasegate check-change-category --paths src/foo.ts,src/bar.ts
  phasegate check-change-category --paths src/foo.ts --format json`,
  "ci:generate-template": `Usage: phasegate ci:generate-template [options]

Generates a CI template configuration.

Options:
  --preset <id>    Preset name (e.g. standard, strict). Default: standard.
  --type <type>    Template purpose (NOT CI platform name). One of:
                     aidlc-gate        — AIDLC phase gate checks
                     consistency-check — Doc/code consistency checks
                     pre-commit        — Pre-commit hook template
                     agent-context-refresh — AGENTS.md / CLAUDE.md refresh workflow
  --render         Render the template to stdout
  --json           Output in JSON format

Examples:
  phasegate ci:generate-template --type aidlc-gate
  phasegate ci:generate-template --preset strict --type pre-commit --render`,
};

function printSubcommandHelp(command: string): void {
  const help = SUBCOMMAND_HELP[command];
  if (help) {
    console.log(help);
  } else {
    console.log(`Usage: phasegate ${command} [options]`);
    console.log("(use 'phasegate --help' for the full command reference)");
  }
}

/** フラグとその値を除いた位置引数のみを返す */
function parsePositionalArgs(args: readonly string[], flagsWithValues: readonly string[] = []): string[] {
  const result: string[] = [];
  const valueFlags = new Set(flagsWithValues);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (valueFlags.has(arg)) {
        i++; // skip flag value
      }
      continue;
    }
    result.push(arg);
  }

  return result;
}

type RenderFormat = "human" | "agent" | "ci";

function toRenderFormat(value: string): RenderFormat {
  if (value === "human" || value === "agent" || value === "ci") return value;
  return "human";
}

type ListFormat = "human" | "json";

function toListFormat(value: string): ListFormat {
  if (value === "human" || value === "json") return value;
  return "human";
}

type LayerIdFilter = "L0" | "L1" | "L2" | "L3" | "L4";

function toLayerFilter(value: string | undefined): LayerIdFilter | undefined {
  if (value === "L0" || value === "L1" || value === "L2" || value === "L3" || value === "L4") return value;
  return undefined;
}

type AdrStatus = "Proposed" | "Accepted" | "Deprecated" | "Superseded";

function isAdrStatus(s: string): s is AdrStatus {
  return s === "Proposed" || s === "Accepted" || s === "Deprecated" || s === "Superseded";
}

function toAdrStatuses(csv: string | undefined): readonly AdrStatus[] | undefined {
  if (!csv) return undefined;
  return csv.split(",").filter(isAdrStatus);
}

type SuiteIdValue = "k-requirements" | "gng-gate" | "v0-migration" | "agent-independence";

const VALID_SUITE_IDS: readonly SuiteIdValue[] = ["k-requirements", "gng-gate", "v0-migration", "agent-independence"];
const DEFAULT_REGRESSION_SUITES = "k-requirements,gng-gate";
const DEFAULT_COVERAGE_THRESHOLD = 90;

function parseSuiteIds(raw: string): SuiteIdValue[] {
  const ids = raw.split(",").filter(Boolean);
  for (const id of ids) {
    if (!VALID_SUITE_IDS.includes(id as SuiteIdValue)) {
      throw new Error(`Invalid suite ID: '${id}'. Valid values: ${VALID_SUITE_IDS.join(", ")}`);
    }
  }
  return ids as SuiteIdValue[];
}

function parseCoverageThreshold(raw: string | undefined): number {
  const n = Number(raw ?? DEFAULT_COVERAGE_THRESHOLD);
  if (!Number.isFinite(n) || n <= 0 || n > 100) {
    throw new Error(`Invalid threshold: '${raw}'. Must be a number between 1 and 100.`);
  }
  return n;
}

type InitPhasePreset = "full" | "standard" | "minimal" | "custom";
type AgentTarget = "claude" | "codex" | "both";
type SetupIntent = "minimal" | "recommended" | "strict" | "ci-only" | "agent-hooks" | "retrofit";
type ConfigChangeIntent = "l4-strict" | "codex-hooks" | "ci-fail-on-warning" | "baseline-reset" | "quick-mode-strict";
type SetupCompletenessStatus = "configured" | "planned" | "manual" | "not-applicable" | "unknown";

interface SetupCompletenessEntry {
  readonly area: string;
  readonly status: SetupCompletenessStatus;
  readonly evidence: readonly string[];
  readonly nextAction: string | null;
  readonly risk: string | null;
}

interface ConfigPatchOperation {
  readonly op: "add" | "replace";
  readonly pointer: string;
  readonly before: unknown;
  readonly after: unknown;
}

interface ConfigPatchPreview {
  readonly path: "phasegate.config.json";
  readonly applicability: "applicable" | "not-applicable" | "blocked";
  readonly blockedReason: string | null;
  readonly before: unknown;
  readonly after: unknown;
  readonly operations: readonly ConfigPatchOperation[];
}

function parseInitPhasePreset(value: string | undefined): InitPhasePreset | undefined {
  if (value === undefined) return undefined;
  if (value === "full" || value === "standard" || value === "minimal" || value === "custom") {
    return value;
  }
  return undefined;
}

function parseAgentTarget(value: string | undefined, fallback: AgentTarget = "both"): AgentTarget {
  if (value === "claude" || value === "codex" || value === "both") return value;
  return fallback;
}

function parseSetupIntent(value: string | undefined): SetupIntent {
  if (
    value === "minimal" ||
    value === "recommended" ||
    value === "strict" ||
    value === "ci-only" ||
    value === "agent-hooks" ||
    value === "retrofit"
  ) {
    return value;
  }
  return "recommended";
}

function parseConfigChangeIntent(value: string | undefined): ConfigChangeIntent {
  if (
    value === "l4-strict" ||
    value === "codex-hooks" ||
    value === "ci-fail-on-warning" ||
    value === "baseline-reset" ||
    value === "quick-mode-strict"
  ) {
    return value;
  }
  return "l4-strict";
}

async function projectFileExists(rootDir: string, relativePath: string): Promise<boolean> {
  try {
    await fsReadFile(join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

function setupCompletenessEntry(input: {
  readonly area: string;
  readonly included: boolean;
  readonly configured: boolean;
  readonly plannedEvidence: string;
  readonly configuredEvidence: string;
  readonly nextAction: string;
  readonly risk?: string;
}): SetupCompletenessEntry {
  if (!input.included) {
    return {
      area: input.area,
      status: "not-applicable",
      evidence: ["Not selected for this setup intent/options."],
      nextAction: null,
      risk: null,
    };
  }
  if (input.configured) {
    return {
      area: input.area,
      status: "configured",
      evidence: [input.configuredEvidence],
      nextAction: null,
      risk: input.risk ?? null,
    };
  }
  return {
    area: input.area,
    status: "planned",
    evidence: [input.plannedEvidence],
    nextAction: input.nextAction,
    risk: input.risk ?? null,
  };
}

function buildSetupCompleteness(input: {
  readonly intent: SetupIntent;
  readonly agent: AgentTarget;
  readonly withHusky: boolean;
  readonly withCi: boolean;
  readonly checks: {
    readonly packageJson: boolean;
    readonly phasegateConfig: boolean;
    readonly claudeSettings: boolean;
    readonly codexHooks: boolean;
    readonly agentsMd: boolean;
    readonly claudeMd: boolean;
    readonly huskyPreCommit: boolean;
    readonly ciWorkflow: boolean;
    readonly skillsVersion: boolean;
  };
}): readonly SetupCompletenessEntry[] {
  const includeClaude = input.agent === "claude" || input.agent === "both";
  const includeCodex = input.agent === "codex" || input.agent === "both";
  const agentHooksConfigured = (!includeClaude || input.checks.claudeSettings) && (!includeCodex || input.checks.codexHooks);
  const agentContextConfigured = (!includeClaude || input.checks.claudeMd) && (!includeCodex || input.checks.agentsMd);
  const entries: SetupCompletenessEntry[] = [
    setupCompletenessEntry({
      area: "local-config",
      included: true,
      configured: input.checks.packageJson && input.checks.phasegateConfig,
      configuredEvidence: "package.json and phasegate.config.json are present.",
      plannedEvidence: "setup:agent will create or merge package.json scripts and phasegate.config.json.",
      nextAction: "Run setup:agent --apply, then phasegate doctor.",
    }),
    setupCompletenessEntry({
      area: "agent-hooks",
      included: includeClaude || includeCodex,
      configured: agentHooksConfigured,
      configuredEvidence: "Selected agent hook settings are present.",
      plannedEvidence: "setup:agent will create or refresh selected agent hook settings.",
      nextAction: "Run setup:agent --apply for selected agents.",
      risk: includeCodex ? "Codex user-level hook feature enablement remains a manual external check." : undefined,
    }),
    setupCompletenessEntry({
      area: "agent-context",
      included: includeClaude || includeCodex,
      configured: agentContextConfigured,
      configuredEvidence: "Selected AGENTS.md / CLAUDE.md managed context files are present.",
      plannedEvidence: "setup:agent will create or refresh selected managed agent context sections.",
      nextAction: "Run setup:agent --apply and review preserved user-owned content.",
    }),
    setupCompletenessEntry({
      area: "skills",
      included: true,
      configured: input.checks.skillsVersion,
      configuredEvidence: "skills/.harness-version is present.",
      plannedEvidence: "setup:agent will deploy bundled PhaseGate skills.",
      nextAction: "Run setup:agent --apply to deploy skills.",
    }),
    setupCompletenessEntry({
      area: "git-hooks",
      included: input.withHusky,
      configured: input.checks.huskyPreCommit,
      configuredEvidence: ".husky/pre-commit is present.",
      plannedEvidence: "setup:agent will create or refresh Husky pre-commit, commit-msg, and pre-push hooks.",
      nextAction: "Run setup:agent --apply --with-husky.",
    }),
    setupCompletenessEntry({
      area: "ci",
      included: input.withCi,
      configured: input.checks.ciWorkflow,
      configuredEvidence: ".github/workflows/phasegate-aidlc-gate.yml is present.",
      plannedEvidence: "setup:agent will create or refresh the GitHub Actions PhaseGate workflow.",
      nextAction: "Run setup:agent --apply --with-ci.",
      risk: "A hosted CI run is still an external manual check.",
    }),
    setupCompletenessEntry({
      area: "validation",
      included: true,
      configured: input.checks.packageJson && input.checks.phasegateConfig,
      configuredEvidence: "Local validation commands can be run against the configured project.",
      plannedEvidence: "Validation commands are planned after setup apply.",
      nextAction: "Run phasegate doctor, phasegate phasegate:check-ready, and phasegate validate --layer L2 --format human.",
    }),
  ];

  const externalActions: string[] = [];
  if (includeCodex) externalActions.push("Run codex features enable codex_hooks if Codex hooks are not enabled for the user.");
  if (input.withCi) externalActions.push("Trigger or inspect the first GitHub Actions PhaseGate workflow run.");
  if (input.intent === "strict") externalActions.push("Confirm team policy accepts strict local and CI enforcement.");
  entries.push({
    area: "external-actions",
    status: externalActions.length > 0 ? "manual" : "not-applicable",
    evidence: externalActions.length > 0 ? externalActions : ["No external manual checks selected for this setup run."],
    nextAction: externalActions.length > 0 ? externalActions.join(" ") : null,
    risk: externalActions.length > 0 ? "PhaseGate cannot prove these user-level or hosted-service states from local files." : null,
  });
  return entries;
}

async function buildAgentSetupPlan(rootDir: string, input: {
  readonly intent: SetupIntent;
  readonly agent: AgentTarget;
  readonly withHusky: boolean;
  readonly withCi: boolean;
  readonly workflow: WorkflowMode;
}) {
  const checks = {
    packageJson: await projectFileExists(rootDir, "package.json"),
    phasegateConfig: await projectFileExists(rootDir, "phasegate.config.json"),
    claudeSettings: await projectFileExists(rootDir, ".claude/settings.json"),
    codexHooks: await projectFileExists(rootDir, ".codex/hooks.json"),
    agentsMd: await projectFileExists(rootDir, "AGENTS.md"),
    claudeMd: await projectFileExists(rootDir, "CLAUDE.md"),
    huskyPreCommit: await projectFileExists(rootDir, ".husky/pre-commit"),
    ciWorkflow: await projectFileExists(rootDir, ".github/workflows/phasegate-aidlc-gate.yml"),
    skillsVersion: await projectFileExists(rootDir, "skills/.harness-version"),
  };
  const includeClaude = input.agent === "claude" || input.agent === "both";
  const includeCodex = input.agent === "codex" || input.agent === "both";
  const changes = [
    !checks.packageJson ? "Add phasegate devDependency and phasegate scripts to package.json." : "Keep existing package.json and merge missing phasegate scripts only.",
    !checks.phasegateConfig ? `Create phasegate.config.json for ${input.workflow} workflow.` : "Keep existing phasegate.config.json; review config:plan before changing policy.",
    includeClaude ? "Create or refresh .claude/settings.json and CLAUDE.md managed section." : null,
    includeCodex ? "Create or refresh .codex/hooks.json and AGENTS.md managed section." : null,
    input.withHusky ? "Create or refresh Husky pre-commit, commit-msg, and pre-push backstops." : "Leave Husky hooks unmanaged in this setup run.",
    input.withCi ? "Create or refresh GitHub Actions PhaseGate workflow." : "Leave CI workflow unmanaged in this setup run.",
  ].filter((item): item is string => item !== null);
  const questions = [
    input.intent === "recommended" ? "Do you want both Claude and Codex context files, or only the agent you actively use?" : null,
    input.intent === "retrofit" ? "Should existing hooks/workflows be preserved as user-owned content or migrated into PhaseGate managed blocks?" : null,
    input.intent === "ci-only" ? "Should local hooks remain disabled while CI enforces the same checks?" : null,
    input.workflow !== "strict" ? "Do you want strict WI/product reflection enforcement now, or after the first green run?" : null,
  ].filter((item): item is string => item !== null);
  return {
    intent: input.intent,
    agent: input.agent,
    detected: checks,
    completeness: buildSetupCompleteness({ ...input, checks }),
    questions,
    changes,
    risks: [
      "Existing user content outside PhaseGate managed markers is preserved.",
      "Manual review is still required when a managed target has complex user edits and --force is not used.",
    ],
    rollback: [
      "Run phasegate uninstall --dry-run to preview reversal.",
      "Run phasegate uninstall --apply after reviewing the managed targets.",
      "Backups are written under .phasegate/backups when force is used on changed managed files.",
    ],
    validation: [
      "phasegate doctor",
      "phasegate phasegate:check-ready",
      "phasegate validate --layer L2 --format human",
    ],
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readProjectJson(rootDir: string, relativePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fsReadFile(join(rootDir, relativePath), "utf8")) as unknown;
  } catch {
    return null;
  }
}

function withNestedValue(source: unknown, path: readonly string[], value: unknown): Record<string, unknown> {
  const root = isPlainRecord(source) ? { ...source } : {};
  let cursor = root;
  for (const segment of path.slice(0, -1)) {
    const next = cursor[segment];
    cursor[segment] = isPlainRecord(next) ? { ...next } : {};
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[path[path.length - 1]] = value;
  return root;
}

function getNestedValue(source: unknown, path: readonly string[]): unknown {
  let cursor = source;
  for (const segment of path) {
    if (!isPlainRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function buildConfigPatchPreview(intent: ConfigChangeIntent, before: unknown | null): ConfigPatchPreview {
  const configIntents: Record<ConfigChangeIntent, readonly { readonly pointer: string; readonly path: readonly string[]; readonly value: unknown }[]> = {
    "l4-strict": [
      { pointer: "/layers/L4/enabled", path: ["layers", "L4", "enabled"], value: true },
      { pointer: "/layers/L4/failOnWarning", path: ["layers", "L4", "failOnWarning"], value: true },
    ],
    "ci-fail-on-warning": [
      { pointer: "/ci/enabled", path: ["ci", "enabled"], value: true },
      { pointer: "/layers/L4/failOnWarning", path: ["layers", "L4", "failOnWarning"], value: true },
    ],
    "quick-mode-strict": [
      { pointer: "/quickMode/allowedCategories", path: ["quickMode", "allowedCategories"], value: ["chore"] },
      { pointer: "/quickMode/relaxedGates", path: ["quickMode", "relaxedGates"], value: [] },
    ],
    "codex-hooks": [],
    "baseline-reset": [],
  };
  const changes = configIntents[intent];
  if (changes.length === 0) {
    return {
      path: "phasegate.config.json",
      applicability: "not-applicable",
      blockedReason: "Selected intent does not require a local phasegate.config.json mutation.",
      before,
      after: before,
      operations: [],
    };
  }
  let after: unknown = before;
  const operations: ConfigPatchOperation[] = [];
  for (const change of changes) {
    const previous = getNestedValue(after, change.path);
    after = withNestedValue(after, change.path, change.value);
    operations.push({
      op: previous === undefined ? "add" : "replace",
      pointer: change.pointer,
      before: previous ?? null,
      after: change.value,
    });
  }
  return {
    path: "phasegate.config.json",
    applicability: "applicable",
    blockedReason: null,
    before,
    after,
    operations,
  };
}

function hasStructuredInstallError(value: unknown): boolean {
  return isPlainRecord(value) && isPlainRecord(value.error);
}

async function buildConfigChangePlan(rootDir: string, intent: ConfigChangeIntent) {
  const catalog: Record<ConfigChangeIntent, {
    readonly targets: readonly string[];
    readonly managedTargets: readonly string[];
    readonly externalActions: readonly { readonly id: string; readonly label: string; readonly command: string | null; readonly blocking: boolean }[];
    readonly commands: readonly string[];
    readonly validations: readonly string[];
    readonly risks: readonly string[];
  }> = {
    "l4-strict": {
      targets: ["phasegate.config.json: layers.L4.enabled", "phasegate.config.json: layers.L4.failOnWarning"],
      managedTargets: ["phasegate.config.json"],
      externalActions: [],
      commands: ["phasegate validate --layer L4 --fail-on-warning --format human"],
      validations: ["phasegate phasegate:detect-drift --json", "phasegate phasegate:check-ready"],
      risks: ["L4 findings may be advisory today but become blocking when fail-on-warning is enabled."],
    },
    "codex-hooks": {
      targets: [".codex/hooks.json", "AGENTS.md", ".codex/skills"],
      managedTargets: [".codex/hooks.json", "AGENTS.md", ".codex/skills"],
      externalActions: [{ id: "codex-hooks-feature", label: "Enable Codex user-level hooks feature.", command: "codex features enable codex_hooks", blocking: true }],
      commands: ["phasegate install --agent codex --apply", "codex features enable codex_hooks"],
      validations: ["phasegate doctor --json", "phasegate phasegate:status --json"],
      risks: ["Codex apply_patch writes still require the pre-commit backstop for full coverage."],
    },
    "ci-fail-on-warning": {
      targets: [".github/workflows/phasegate-aidlc-gate.yml", "phasegate.config.json"],
      managedTargets: [".github/workflows/phasegate-aidlc-gate.yml", "phasegate.config.json"],
      externalActions: [{ id: "github-actions-first-run", label: "Trigger or inspect the first GitHub Actions PhaseGate run.", command: null, blocking: false }],
      commands: ["phasegate install --with-ci --apply", "phasegate validate --layer L4 --fail-on-warning"],
      validations: ["phasegate doctor", "phasegate ci:generate-template --type aidlc-gate --render"],
      risks: ["Existing warning-only projects may start failing CI after rollout."],
    },
    "baseline-reset": {
      targets: [".phasegate/baseline.json"],
      managedTargets: [".phasegate/baseline.json"],
      externalActions: [],
      commands: ["phasegate baseline --dry-run", "phasegate baseline --force --json"],
      validations: ["phasegate phasegate:status --json", "phasegate phasegate:check-ready"],
      risks: ["A reset can hide historical drift if reviewed without the generated diff."],
    },
    "quick-mode-strict": {
      targets: ["phasegate.config.json: quickMode"],
      managedTargets: ["phasegate.config.json"],
      externalActions: [],
      commands: ["phasegate check-change-category --paths <changed-files> --format json"],
      validations: ["phasegate ci-check --quick --dry-run", "phasegate phasegate:check-ready"],
      risks: ["More changes will require Full Mode validation before commit."],
    },
  };
  const before = await readProjectJson(rootDir, "phasegate.config.json");
  return {
    intent,
    ...catalog[intent],
    configPatch: buildConfigPatchPreview(intent, before),
    diffExplanation: "Review the listed targets first, apply through PhaseGate managed commands where possible, then run the validations in order.",
    rollback: "Use git diff for config changes; use phasegate uninstall/reconcile dry-runs for managed setup targets.",
  };
}

type RuleSeverity = "error" | "warning" | "off";

function toRuleSeverity(value: string): RuleSeverity {
  if (value === "error" || value === "warning" || value === "off") return value;
  return "error";
}

function toRuleSeverityMap(rules: Record<string, string>): Record<string, RuleSeverity> {
  const result: Record<string, RuleSeverity> = {};
  for (const [key, value] of Object.entries(rules)) {
    result[key] = toRuleSeverity(value);
  }
  return result;
}

/**
 * HarnessConfigV2 (resolved) から biome-ast-engine が期待する L1 Config を抽出する。
 */
function toL1Config(resolvedConfig: HarnessConfigV2) {
  return {
    enabled: resolvedConfig.layers.L1.enabled,
    rules: toRuleSeverityMap(resolvedConfig.layers.L1.rules),
  };
}

/**
 * HarnessConfigV2 (resolved) から biome-ast-engine が期待する architecture 情報を抽出する。
 * architecture が未設定の場合は undefined を返し、biome-ast-engine 側の default (clean) に委ねる。
 */
function toArchitectureInput(resolvedConfig: HarnessConfigV2) {
  if (!resolvedConfig.architecture) {
    return undefined;
  }
  return {
    preset: resolvedConfig.architecture.preset,
    layers: resolvedConfig.architecture.layers,
    allowedDependencies: resolvedConfig.architecture.allowedDependencies,
    metadataTags: resolvedConfig.architecture.metadataTags,
  };
}

/**
 * phasegate.config.json を直接読み、storyReflection 設定解決用の provider を返す。
 * config-foundation の HarnessConfigV2 は storyReflection 未サポートのため raw JSON 経由。
 */
async function loadStoryReflectionProvider(rootDir: string): Promise<HarnessConfigPhaseConfigProvider | null> {
  const configPath = join(rootDir, "phasegate.config.json");
  let raw: {
    phaseDependencies?: {
      preset?: "default" | "full" | "standard" | "minimal" | "custom";
      override?: boolean;
      storyReflection?: {
        enabled?: boolean;
        mappings?: ReadonlyArray<{ inception: string; product: string; required: boolean }>;
      };
    };
    reporting?: { outputDir?: string };
  };
  let content: string;
  try {
    content = await fsReadFile(configPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Warning: failed to read phasegate.config.json: ${message}\n`);
    return null;
  }
  try {
    raw = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Warning: phasegate.config.json is not valid JSON: ${message}\n`);
    return null;
  }
  const section: PhaseDepConfigSection = {
    customization: {
      preset: raw.phaseDependencies?.preset,
      overrideEnabled: raw.phaseDependencies?.override ?? false,
    },
    storyReflection: raw.phaseDependencies?.storyReflection,
    reportingOutputDir: raw.reporting?.outputDir,
  };
  return new HarnessConfigPhaseConfigProvider({
    config: section,
    defaultOutputDir: raw.reporting?.outputDir ?? ".harness/reports",
  });
}

async function printStoryReflectionValidationSummary(rootDir: string, unit: string | undefined): Promise<void> {
  const provider = await loadStoryReflectionProvider(rootDir);
  if (provider === null) return;
  const config = await provider.getStoryReflectionConfig();
  const policy = await provider.getCustomizationPolicy();
  const presenter = new StoryReflectionStatusPresenter();
  let result = StoryReflectionResult.pass();
  if (config.enabled && unit) {
    const fsAdapter = new FileSystemStoryReflectionAdapter({ rootDir });
    const checker = new StoryReflectionChecker(fsAdapter);
    const useCase = new CheckStoryReflectionUseCase({ checker });
    result = await useCase.execute({ unitId: unit, config });
  }
  console.log(presenter.formatValidationSummary({ config, preset: policy.preset, result }));
}

async function printStoryReflectionStatusLine(rootDir: string): Promise<void> {
  const provider = await loadStoryReflectionProvider(rootDir);
  if (provider === null) return;
  const config = await provider.getStoryReflectionConfig();
  const policy = await provider.getCustomizationPolicy();
  const presenter = new StoryReflectionStatusPresenter();
  console.log(presenter.formatStatusLine({ config, preset: policy.preset }));
}

let v2SchemaWarningEmitted = false;

function emitV2SchemaWarningOnce(sourcePath: string): void {
  if (v2SchemaWarningEmitted) return;
  v2SchemaWarningEmitted = true;
  process.stderr.write(
    [
      `Warning: ${sourcePath} は v2 schema（architecture キー無し）として検出されました。`,
      "  v0.86.0 以降は architecture.preset による層構造の明示を推奨しています。",
      "  自動 upgrade: npx phasegate migrate --schema v3",
      "  詳細: docs/guide/preset-selection.md",
      "",
    ].join("\n"),
  );
}

async function loadResolvedConfig(): Promise<HarnessConfigV2 | undefined> {
  try {
    const configModule = createConfigFoundationModule();
    const result = await configModule.usecases.loadResolvedConfigUseCase.execute();
    if (result.schemaVersion === "v2") {
      emitV2SchemaWarningOnce(result.sourcePath);
    }
    return result.config;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      process.stderr.write(`Invalid phasegate.config.json: ${error.message}\n`);
      process.exit(2);
    }
    if (error instanceof ConfigNotFoundError) {
      return undefined;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof ConfigPersistenceError) {
      process.stderr.write(`Warning: phasegate.config.json is not valid JSON: ${message}\n`);
    } else {
      process.stderr.write(`Warning: failed to load phasegate.config.json: ${message}\n`);
    }
    return undefined;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "help") {
    printUsage();
    process.exit(0);
  }

  const rootDir = getProjectRoot();
  const harnessRoot = getHarnessRoot();

  if (command === "--version" || command === "version") {
    const version = await getHarnessVersion(harnessRoot);
    console.log(`phasegate v${version}`);
    process.exit(0);
  }

  // Pre-dispatch: 全 subcommand で --help / -h を最優先で解釈し usage 出力 (副作用走行を防ぐ — WI-091 finding #3)
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printSubcommandHelp(command);
    process.exit(0);
  }

  const json = hasFlag(args, "--json");

  // Cross-unit wiring: 設定を先に解決し、各Unit に注入する
  const resolvedConfig = await loadResolvedConfig();

  try {
    switch (command) {
      // ── harness setup ──
      case "init": {
        console.log("Warning: phasegate init is deprecated and will be removed in v1.0.");
        console.log("Use phasegate install for idempotent setup with structured merge.");
        console.log("Existing legacy init behavior is preserved. Run phasegate doctor to verify installation state.");
        const KNOWN_INIT_FLAGS = [
          "--name",
          "--preset",
          "--skills",
          "--agent",
          "--workflow",
          "--with-husky",
          "--with-ci",
          "--yes",
        ];
        const flagError = validateKnownFlags(args, KNOWN_INIT_FLAGS);
        if (flagError) {
          console.error(flagError);
          process.exit(2);
        }
        const projectName = parseFlag(args, "--name") ?? "my-project";
        const rawPhasePreset = parseFlag(args, "--preset");
        if (
          rawPhasePreset !== undefined &&
          rawPhasePreset !== "full" &&
          rawPhasePreset !== "standard" &&
          rawPhasePreset !== "minimal" &&
          rawPhasePreset !== "custom"
        ) {
          console.error(`Invalid --preset value: "${rawPhasePreset}". Use "full", "standard", "minimal", or "custom".`);
          process.exit(2);
        }
        const phasePreset = parseInitPhasePreset(rawPhasePreset);
        const skillSetRaw = parseFlag(args, "--skills") ?? "all";
        if (skillSetRaw !== "core" && skillSetRaw !== "all") {
          console.error(`Invalid --skills value: "${skillSetRaw}". Use "core" or "all".`);
          process.exit(2);
        }
        const skillSet: SkillSet = skillSetRaw;
        const agentRaw = parseFlag(args, "--agent") ?? "claude";
        if (agentRaw !== "claude" && agentRaw !== "codex" && agentRaw !== "both") {
          console.error(`Invalid --agent value: "${agentRaw}". Use "claude", "codex", or "both".`);
          process.exit(2);
        }
        const agent = agentRaw;
        const workflowRaw = parseFlag(args, "--workflow");
        if (workflowRaw !== undefined && workflowRaw !== "standard" && workflowRaw !== "strict") {
          console.error(`Invalid --workflow value: "${workflowRaw}". Use "standard" or "strict".`);
          process.exit(2);
        }
        const workflow = parseWorkflowMode(workflowRaw);
        const deployClaude = agent === "claude" || agent === "both";
        const deployCodex = agent === "codex" || agent === "both";
        const result = await deploySkills(harnessRoot, rootDir, skillSet);
        const packageResult = await ensurePhasegatePackageDependency(rootDir, result.version);
        const skillLinkResult = await deployAgentSkillLinks(rootDir, {
          claude: deployClaude,
          codex: deployCodex,
        });
        const withCi = hasFlag(args, "--with-ci");
        const configResult = await initHarnessConfig(rootDir, projectName, phasePreset, {
          ciEnabled: withCi,
          workflow,
        });
        if (workflow === "strict") {
          await scaffoldInceptionRoots(rootDir);
        }
        const hooksResult = deployClaude
          ? await deployHookScripts(harnessRoot, rootDir)
          : {
              scriptsDeployed: 0,
              settingsCreated: false,
              hookConfigGenerated: false,
              detectedTargetDirs: [] as string[],
              detectedFormatter: null,
            };
        const codexResult = deployCodex ? await deployCodexHooks(harnessRoot, rootDir) : null;
        const designDocsResult = await deployDesignDocs(harnessRoot, rootDir);
        const withHusky = hasFlag(args, "--with-husky");
        const huskyResult = withHusky ? await deployHuskyHook(harnessRoot, rootDir) : null;
        const huskyCommitMsgResult = withHusky ? await deployHuskyCommitMsgHook(harnessRoot, rootDir) : null;
        const huskyPrePushResult = withHusky ? await deployHuskyPrePushHook(harnessRoot, rootDir) : null;
        const ciWorkflowResult = withCi ? await deployCiWorkflows(harnessRoot, rootDir) : null;
        await saveInstallationManifest(rootDir, result.version, [
          ...result.deployedSkills.map((skill) => ({
            path: join("skills", skill),
            mode: "created" as const,
            contentForHash: `${result.version}:${skill}`,
          })),
          await createFileManifestRecord(rootDir, join("skills", ".harness-version")),
          packageResult.created || packageResult.updated ? await createFileManifestRecord(rootDir, "package.json") : null,
          configResult.created ? await createFileManifestRecord(rootDir, "phasegate.config.json") : null,
          hooksResult.settingsCreated ? await createFileManifestRecord(rootDir, join(".claude", "settings.json")) : null,
          hooksResult.hookConfigGenerated
            ? await createFileManifestRecord(rootDir, join(".claude", "scripts", "hook-config.json"))
            : null,
          skillLinkResult.claude !== null ? await createSymlinkManifestRecord(rootDir, join(".claude", "skills")) : null,
          codexResult?.created ? await createFileManifestRecord(rootDir, join(".codex", "hooks.json")) : null,
          skillLinkResult.codex !== null ? await createSymlinkManifestRecord(rootDir, join(".codex", "skills")) : null,
          ...designDocsResult.copiedFiles.map((path) => createFileManifestRecord(rootDir, path)),
          huskyResult?.created ? await createFileManifestRecord(rootDir, join(".husky", "pre-commit")) : null,
          huskyCommitMsgResult?.created ? await createFileManifestRecord(rootDir, join(".husky", "commit-msg")) : null,
          huskyPrePushResult?.created ? await createFileManifestRecord(rootDir, join(".husky", "pre-push")) : null,
          ...(ciWorkflowResult?.copiedFiles.map((path) => createFileManifestRecord(rootDir, path)) ?? []),
        ]);
        const installModule = createInstallationModule();
        const installResult = await installModule.runInstallUseCase.execute({
          projectRoot: rootDir,
          harnessRoot,
          phasegateVersion: result.version,
          dryRun: false,
          apply: true,
          force: false,
          includeClaude: deployClaude,
          includeCodex: deployCodex,
          includeHusky: withHusky,
          includeCi: withCi,
          skillSet,
          workflow,
          agent,
        });
        console.log(
          `✓ Skills deployed to ${result.targetDir} (${result.deployedSkills.length} skills, set: ${skillSet})`,
        );
        if (installResult.changed.length > 0) {
          console.log(`✓ phasegate install structured merge applied (${installResult.changed.length} targets)`);
        }
        if (installResult.refused.length > 0) {
          console.log(
            `  phasegate install refused ${installResult.refused.length} ai-assisted/manual targets; run phasegate install --dry-run for details`,
          );
        }
        if (packageResult.created) {
          console.log(`✓ package.json created with phasegate devDependency`);
        } else if (packageResult.updated) {
          console.log(`✓ package.json updated with phasegate devDependency`);
        } else if (packageResult.alreadyPresent) {
          console.log(`  package.json already declares phasegate, skipped`);
        } else if (packageResult.skipped) {
          console.log(`  package.json could not be updated, skipped`);
        }
        if (configResult.created) {
          console.log(`✓ phasegate.config.json created`);
          if (workflow === "strict") {
            console.log(`✓ strict workflow configured (quickMode.relaxedGates: [], allowedCategories: ["chore"])`);
          }
        } else {
          console.log(`  phasegate.config.json already exists, skipped`);
        }
        if (hooksResult.scriptsDeployed > 0) {
          console.log(`✓ Hook scripts deployed to .claude/scripts/ (${hooksResult.scriptsDeployed} files)`);
        }
        if (hooksResult.hookConfigGenerated) {
          const dirsLabel = hooksResult.detectedTargetDirs.join(", ");
          const formatterLabel = hooksResult.detectedFormatter ?? "none";
          console.log(
            `✓ hook-config.json generated (targetDirs: ${dirsLabel}; formatter: ${formatterLabel})`,
          );
        }
        if (hooksResult.settingsCreated) {
          console.log(`✓ .claude/settings.json created`);
        } else if (hooksResult.scriptsDeployed > 0) {
          console.log(`  .claude/settings.json already exists, skipped`);
        }
        if (skillLinkResult.claude !== null) {
          if (skillLinkResult.claude.created) {
            console.log(`✓ .claude/skills linked to skills/`);
          } else {
            console.log(`  .claude/skills already exists, skipped`);
          }
        }
        if (codexResult !== null) {
          if (codexResult.created) {
            console.log(`✓ .codex/hooks.json deployed`);
          } else {
            console.log(`  .codex/hooks.json already exists, skipped`);
          }
        }
        if (skillLinkResult.codex !== null) {
          if (skillLinkResult.codex.created) {
            console.log(`✓ .codex/skills linked to skills/`);
          } else {
            console.log(`  .codex/skills already exists, skipped`);
          }
        }
        if (designDocsResult.copiedFiles.length > 0) {
          console.log(`✓ Design docs deployed (${designDocsResult.copiedFiles.length} files)`);
        }
        for (const skipped of designDocsResult.skippedFiles) {
          console.log(`  ${skipped} already exists, skipped`);
        }
        if (huskyResult !== null) {
          if (huskyResult.created) {
            console.log(`✓ .husky/pre-commit deployed`);
          } else {
            console.log(`  .husky/pre-commit already exists, skipped`);
          }
        }
        if (huskyCommitMsgResult !== null) {
          if (huskyCommitMsgResult.created) {
            console.log(`✓ .husky/commit-msg deployed`);
          } else {
            console.log(`  .husky/commit-msg already exists, skipped`);
          }
        }
        if (huskyPrePushResult !== null) {
          if (huskyPrePushResult.created) {
            console.log(`✓ .husky/pre-push deployed`);
          } else {
            console.log(`  .husky/pre-push already exists, skipped`);
          }
        }
        if (ciWorkflowResult !== null) {
          if (ciWorkflowResult.copiedFiles.length > 0) {
            console.log(`✓ CI workflows deployed (${ciWorkflowResult.copiedFiles.length} files)`);
          }
          for (const skipped of ciWorkflowResult.skippedFiles) {
            console.log(`  ${skipped} already exists, skipped`);
          }
        }
        console.log(`✓ Harness v${result.version} initialized (agent: ${agent})`);
        const legacyPlanCount = await countLegacyPlansWithoutWorkItems(rootDir);
        if (legacyPlanCount > 0) {
          console.log("");
          console.log(`Detected ${legacyPlanCount} legacy plan file(s) with no WI directories.`);
          console.log("Run migration? [Y/n]");
          console.log("  phasegate migrate work-items --apply");
        }
        console.log("");
        console.log("Next steps:");
        if (skillSet === "core") {
          console.log("  1. Core skills only — quality defense tools are ready");
        } else {
          console.log("  1. Run the product-architect skill to start AIDLC");
        }
        console.log("  2. Customize phasegate.config.json if needed");
        if (deployClaude) {
          console.log("  3. Edit .claude/scripts/hook-config.json to set target directories");
        }
        if (deployCodex) {
          console.log(`  ${deployClaude ? "4" : "3"}. Enable Codex hooks: codex features enable codex_hooks`);
          console.log(
            `  ${deployClaude ? "5" : "4"}. (Recommended) Install pre-commit backstop: rerun with --with-husky or set up husky manually`,
          );
          console.log(`     See docs/guide/codex-integration.md for the native apply_patch limitation.`);
        }
        if (skillSet !== "core") {
          console.log("");
          console.log("Need help?");
          console.log("  • Q&A about phasegate concepts: invoke /phasegate-toolkit-guide");
          console.log("  • Diagnose & tune phasegate.config.json: invoke /phasegate-config-doctor");
        }
        process.exit(hasStructuredInstallError(installResult) ? 1 : 0);
        break;
      }

      case "update-skills": {
        const KNOWN_RECONCILE_FLAGS = ["--dry-run", "--apply", "--force", "--json"];
        const flagError = validateKnownFlags(args, KNOWN_RECONCILE_FLAGS);
        if (flagError) {
          console.error(flagError);
          process.exit(2);
        }
        const apply = hasFlag(args, "--apply");
        const dryRun = hasFlag(args, "--dry-run") || !apply;
        const mod = createInstallationModule();
        const phasegateVersion = await getHarnessVersion(harnessRoot);
        const result = await mod.reconcileHandler.execute({
          projectRoot: rootDir,
          harnessRoot,
          phasegateVersion,
          dryRun,
          apply,
          force: hasFlag(args, "--force"),
          json,
        });
        if (!json) console.log("phasegate update-skills is deprecated; running phasegate reconcile.");
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case "doctor": {
        const mod = createInstallationModule();
        const phasegateVersion = await getHarnessVersion(harnessRoot);
        const result = await mod.doctorHandler.execute({
          projectRoot: rootDir,
          strict: hasFlag(args, "--strict"),
          json,
          reportOut: parseFlag(args, "--report-out") ?? null,
          phasegateVersion,
        });
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case "emit-agent-rules": {
        console.log(emitAgentRulesBlock());
        process.exit(0);
        break;
      }

      case "scaffold-wi": {
        const unit = args[1];
        const type = parseScaffoldWorkItemType(args[2]);
        if (!unit || !type) {
          console.error("Usage: phasegate scaffold-wi <unit|_cross> <story|issue|chore>");
          process.exit(2);
        }
        const descriptionPath = await scaffoldWorkItem(rootDir, unit, type);
        console.log(`Created ${descriptionPath}`);
        process.exit(0);
        break;
      }

      case "install": {
        const KNOWN_INSTALL_FLAGS = ["--dry-run", "--apply", "--force", "--json", "--agent", "--skills", "--workflow", "--with-husky", "--with-ci"];
        const flagError = validateKnownFlags(args, KNOWN_INSTALL_FLAGS);
        if (flagError) {
          console.error(flagError);
          process.exit(2);
        }
        const apply = hasFlag(args, "--apply");
        const dryRun = hasFlag(args, "--dry-run") || !apply;
        const agent = parseAgentTarget(parseFlag(args, "--agent"), "both");
        const skillSetRaw = parseFlag(args, "--skills") ?? "all";
        if (skillSetRaw !== "core" && skillSetRaw !== "all") {
          console.error(`Invalid --skills value: "${skillSetRaw}". Use "core" or "all".`);
          process.exit(2);
        }
        const workflowRaw = parseFlag(args, "--workflow");
        if (workflowRaw !== undefined && workflowRaw !== "standard" && workflowRaw !== "strict") {
          console.error(`Invalid --workflow value: "${workflowRaw}". Use "standard" or "strict".`);
          process.exit(2);
        }
        const includeClaude = agent === "claude" || agent === "both";
        const includeCodex = agent === "codex" || agent === "both";
        const mod = createInstallationModule();
        const phasegateVersion = await getHarnessVersion(harnessRoot);
        const result = await mod.installHandler.execute({
          projectRoot: rootDir,
          harnessRoot,
          phasegateVersion,
          dryRun,
          apply,
          force: hasFlag(args, "--force"),
          includeClaude,
          includeCodex,
          includeHusky: true,
          includeCi: true,
          skillSet: skillSetRaw,
          workflow: parseWorkflowMode(workflowRaw),
          agent,
          json,
        });
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case "setup:agent": {
        const KNOWN_SETUP_AGENT_FLAGS = ["--intent", "--agent", "--workflow", "--with-husky", "--with-ci", "--dry-run", "--apply", "--force", "--json"];
        const flagError = validateKnownFlags(args, KNOWN_SETUP_AGENT_FLAGS);
        if (flagError) {
          console.error(flagError);
          process.exit(2);
        }
        const intent = parseSetupIntent(parseFlag(args, "--intent"));
        const agent = parseAgentTarget(parseFlag(args, "--agent"), "both");
        const workflow = parseWorkflowMode(parseFlag(args, "--workflow") ?? (intent === "strict" ? "strict" : "standard"));
        const withCi = hasFlag(args, "--with-ci") || intent === "ci-only" || intent === "strict";
        const withHusky = hasFlag(args, "--with-husky") || intent === "agent-hooks" || intent === "strict";
        let plan = await buildAgentSetupPlan(rootDir, { intent, agent, withHusky, withCi, workflow });
        const apply = hasFlag(args, "--apply");
        let installResult: unknown = null;
        let bootstrapResult: unknown = null;
        if (apply) {
          const skillResult = await deploySkills(harnessRoot, rootDir, "all");
          const packageResult = await ensurePhasegatePackageDependency(rootDir, skillResult.version);
          const configResult = await initHarnessConfig(rootDir, "my-project", workflow === "strict" ? "full" : "standard", {
            ciEnabled: withCi,
            workflow,
          });
          bootstrapResult = {
            skillsDeployed: skillResult.deployedSkills.length,
            packageDependency: packageResult,
            configCreated: configResult.created,
          };
          const mod = createInstallationModule();
          const phasegateVersion = await getHarnessVersion(harnessRoot);
          installResult = await mod.runInstallUseCase.execute({
            projectRoot: rootDir,
            harnessRoot,
            phasegateVersion,
            dryRun: false,
            apply: true,
            force: hasFlag(args, "--force"),
            includeClaude: agent === "claude" || agent === "both",
            includeCodex: agent === "codex" || agent === "both",
            includeHusky: withHusky,
            includeCi: withCi,
            skillSet: "all",
            workflow,
            agent,
          });
          plan = await buildAgentSetupPlan(rootDir, { intent, agent, withHusky, withCi, workflow });
        }
        const output = { plan, applied: apply, bootstrapResult, installResult };
        if (json) {
          console.log(JSON.stringify(output, null, 2));
        } else {
          console.log(`phasegate setup:agent ${apply ? "apply" : "dry-run"} (${intent}, ${agent})`);
          for (const change of plan.changes) console.log(`- ${change}`);
          if (plan.questions.length > 0) {
            console.log("");
            console.log("Questions:");
            for (const question of plan.questions) console.log(`- ${question}`);
          }
          console.log("");
          console.log("Validation:");
          for (const command of plan.validation) console.log(`- ${command}`);
        }
        process.exit(0);
        break;
      }

      case "config:plan": {
        const KNOWN_CONFIG_PLAN_FLAGS = ["--intent", "--dry-run", "--json"];
        const flagError = validateKnownFlags(args, KNOWN_CONFIG_PLAN_FLAGS);
        if (flagError) {
          console.error(flagError);
          process.exit(2);
        }
        const plan = await buildConfigChangePlan(rootDir, parseConfigChangeIntent(parseFlag(args, "--intent")));
        if (json) {
          console.log(JSON.stringify(plan, null, 2));
        } else {
          console.log(`phasegate config:plan (${plan.intent})`);
          console.log("Targets:");
          for (const target of plan.targets) console.log(`- ${target}`);
          console.log("Commands:");
          for (const command of plan.commands) console.log(`- ${command}`);
          console.log("Validation:");
          for (const validation of plan.validations) console.log(`- ${validation}`);
        }
        process.exit(0);
        break;
      }

      case "uninstall": {
        const KNOWN_UNINSTALL_FLAGS = ["--dry-run", "--apply", "--force", "--json"];
        const flagError = validateKnownFlags(args, KNOWN_UNINSTALL_FLAGS);
        if (flagError) {
          console.error(flagError);
          process.exit(2);
        }
        const apply = hasFlag(args, "--apply");
        const dryRun = hasFlag(args, "--dry-run") || !apply;
        const mod = createInstallationModule();
        const result = await mod.uninstallHandler.execute({
          projectRoot: rootDir,
          harnessRoot,
          dryRun,
          apply,
          force: hasFlag(args, "--force"),
          json,
        });
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case "reconcile": {
        const KNOWN_RECONCILE_FLAGS = ["--dry-run", "--apply", "--force", "--json"];
        const flagError = validateKnownFlags(args, KNOWN_RECONCILE_FLAGS);
        if (flagError) {
          console.error(flagError);
          process.exit(2);
        }
        const apply = hasFlag(args, "--apply");
        const dryRun = hasFlag(args, "--dry-run") || !apply;
        const mod = createInstallationModule();
        const phasegateVersion = await getHarnessVersion(harnessRoot);
        const result = await mod.reconcileHandler.execute({
          projectRoot: rootDir,
          harnessRoot,
          phasegateVersion,
          dryRun,
          apply,
          force: hasFlag(args, "--force"),
          json,
        });
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      // ── config-foundation ──
      case "enable-feature": {
        const mod = createConfigFoundationModule();
        const featureName = args[1];
        const list = hasFlag(args, "--list");
        const configPath = parseFlag(args, "--config");
        const result = await mod.handlers.enableFeatureCommandHandler.execute({
          featureName,
          list,
          configPath,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "disable-feature": {
        const mod = createConfigFoundationModule();
        const featureName = args[1];
        const list = hasFlag(args, "--list");
        const configPath = parseFlag(args, "--config");
        const result = await mod.handlers.disableFeatureCommandHandler.execute({
          featureName,
          list,
          configPath,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "list-features": {
        const mod = createConfigFoundationModule();
        const result = await mod.handlers.enableFeatureCommandHandler.execute({
          list: true,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "migrate": {
        if (args[1] === "work-items") {
          const mod = createTraceabilityModelModule(
            rootDir,
            toTraceabilityModelOptions(resolvedConfig),
          );
          const result = await mod.migrateWorkItemsCommandHandler.execute({
            dryRun: hasFlag(args, "--dry-run"),
            apply: hasFlag(args, "--apply"),
            json,
          });
          console.log(result.text);
          process.exit(result.exitCode);
          break;
        }
        const mod = createConfigFoundationModule();
        const targetVersion = parseFlag(args, "--schema") ?? "v3";
        const configPath = parseFlag(args, "--config");
        const result = await mod.handlers.migrateSchemaCommandHandler.execute({
          targetVersion,
          configPath,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // ── harness-error ──
      case "render-errors": {
        const mod = createHarnessErrorModule(rootDir);
        const format = toRenderFormat(parseFlag(args, "--format") ?? "human");
        const failOnError = hasFlag(args, "--fail-on-error");
        const result = mod.renderHarnessErrorsHandler.execute({
          errors: [],
          format,
          failOnError,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "validate-fix": {
        const mod = createHarnessErrorModule(rootDir);
        const code = parseFlag(args, "--code");
        const failFast = hasFlag(args, "--fail-fast");
        const format = toListFormat(parseFlag(args, "--format") ?? "human");
        const result = await mod.validateFixExampleHandler.execute({
          code,
          failFast,
          format,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "list-errors": {
        const mod = createHarnessErrorModule(rootDir);
        const format = toListFormat(parseFlag(args, "--format") ?? "human");
        const layer = toLayerFilter(parseFlag(args, "--layer"));
        const result = await mod.listErrorDefinitionsHandler.execute({
          format,
          layer,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // ── traceability-model ──
      case "validate-metadata": {
        const mod = createTraceabilityModelModule(
          rootDir,
          toTraceabilityModelOptions(resolvedConfig),
        );
        const filePaths = parsePositionalArgs(args.slice(1));
        const result = await mod.validateMetadataCommandHandler.execute({
          filePaths,
          json,
        });
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      case "work-items:status": {
        const mod = createTraceabilityModelModule(
          rootDir,
          toTraceabilityModelOptions(resolvedConfig),
        );
        const result = await mod.workItemStatusCommandHandler.execute({
          dryRun: hasFlag(args, "--dry-run"),
          apply: hasFlag(args, "--apply"),
          failOnStale: hasFlag(args, "--fail-on-stale"),
          allowDowngrade: hasFlag(args, "--allow-downgrade"),
          changedOnly: hasFlag(args, "--changed-only"),
          id: parseFlag(args, "--id"),
          json,
        });
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      // ── phase-dependency-model ──
      case "check-phase-gate": {
        const phaseConfig = resolvedConfig ? toPhaseConfigSection(resolvedConfig) : undefined;
        const reportOutputDir = resolvedConfig?.reporting.outputDir;
        const mod = createPhaseDependencyModelModule({
          rootDir,
          phaseConfig,
          reportOutputDir,
        });
        const level = Number(parseFlag(args, "--level") ?? "1");
        const unitId = parseFlag(args, "--unit");
        const storyId = parseFlag(args, "--story");
        const targetFilePath = parseFlag(args, "--target-file");
        const result = await mod.checkPhaseGateCommandHandler.execute({
          targetLevel: level,
          unitId,
          storyId,
          targetFilePath,
          json,
        });
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      // ── adr-foundation ──
      case "list-adrs": {
        const mod = createAdrFoundationModule(rootDir);
        const statuses = toAdrStatuses(parseFlag(args, "--status"));
        const result = await mod.listAdrsCommandHandler.execute({
          statuses,
          json,
        });
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      case "validate-adr": {
        const mod = createAdrFoundationModule(rootDir);
        const all = hasFlag(args, "--all");
        const adrRef = args.find((a) => !a.startsWith("--") && a !== command);
        const result = await mod.validateAdrCommandHandler.execute({
          adrRef,
          all,
          json,
        });
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      // ── biome-ast-engine ──
      case "lint": {
        const l1Config = resolvedConfig ? toL1Config(resolvedConfig) : undefined;
        const architecture = resolvedConfig ? toArchitectureInput(resolvedConfig) : undefined;
        const mod = createBiomeAstEngineModule(rootDir, { l1Config, architecture });
        const result = await mod.harnessLintCommandHandler.execute(args.slice(1));
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      // ── validator-system ──
      case "validate": {
        const mod = createValidatorSystemModule(toValidatorSystemConfig(resolvedConfig));
        const layer = parseFlag(args, "--layer") as "L0" | "L2" | "L3" | "L4" | "all" | undefined;
        const unit = parseFlag(args, "--unit");
        const phase = parseFlag(args, "--phase");
        const format = parseValidateFormat(args);
        // WI-094 / ADR-017: --fail-on-warning / --no-fail-on-warning / 未指定→config値
        const failOnWarning = parseTriStateFlag(args, "--fail-on-warning", "--no-fail-on-warning");
        const noL4 = hasFlag(args, "--no-l4");
        const targetPaths = parsePositionalArgs(args.slice(1), ["--layer", "--unit", "--phase", "--format"]);
        const result = await mod.handlers.runValidators.execute({
          layer,
          unit,
          phase,
          format,
          failOnWarning,
          noL4,
          targetPaths,
        });
        console.log(result.output);
        if (layer === "L2" || layer === "all") {
          await printStoryReflectionValidationSummary(rootDir, unit);
        }
        process.exit(result.exitCode);
        break;
      }

      // ── quick-mode / ci-check ──
      case "ci-check": {
        const quick = hasFlag(args, "--quick");
        if (quick) {
          const mod = createQuickModeCompositionRoot();
          const failOnReject = hasFlag(args, "--fail-on-reject");
          const dryRun = hasFlag(args, "--dry-run");
          const files = parseFlag(args, "--files");
          const format = parseFlag(args, "--format") as "human" | "json" | "agent" | undefined;
          await mod.handler.handle({ quick: true, failOnReject, dryRun, files, format });
        } else {
          const mod = createHarnessApiModule();
          const flags: Record<string, boolean | string> = {};
          if (json) flags.json = true;
          await mod.handlers.ciCheck.handle({}, flags);
        }
        break;
      }

      // ── quick-mode / check-change-category (H10-05) ──
      case "check-change-category": {
        if (hasFlag(args, "--help")) {
          process.stdout.write(
            [
              "Usage: phasegate check-change-category --paths <csv> [options]",
              "",
              "Classify changed file paths into quick-mode categories and report",
              "whether Full Mode is required.",
              "",
              "Options:",
              "  --paths <csv>              Comma-separated file paths to classify.",
              "  --format <human|json>      Output format. Default: human.",
              "  --fail-on-full-required    Exit with code 1 when Full Mode is required.",
              "  --help                     Show this help.",
              "",
              "Examples:",
              "  phasegate check-change-category --paths src/foo.ts,src/bar.ts",
              "  phasegate check-change-category --paths src/foo.ts --format json",
              "",
            ].join("\n"),
          );
          return;
        }
        const mod = createQuickModeCompositionRoot();
        const paths = parseFlag(args, "--paths");
        const format = parseFlag(args, "--format") as "human" | "json" | undefined;
        const failOnFullRequired = hasFlag(args, "--fail-on-full-required");
        const result = await mod.checkChangeCategoryHandler.handle({
          paths,
          format,
          failOnFullRequired,
        });
        process.exit(result.exitCode);
        break;
      }

      // ── harness-api ──
      case "phasegate:check-ready": {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.checkReady.handle({}, flags);
        break;
      }

      case "phasegate:check-phase": {
        // ISSUE-005 P2-6: --help / --json を positional として食わないようにする
        if (hasFlag(args, "--help")) {
          process.stdout.write(
            [
              "Usage: phasegate phasegate:check-phase [options]",
              "",
              "Check phase gate for a specific unit.",
              "",
              "Options:",
              "  --unit <unitId>   Target unit ID (e.g., harness-api). If omitted,",
              "                    the first positional argument is used.",
              "  --json            Output result as JSON.",
              "  --help            Show this help.",
              "",
              "Examples:",
              "  phasegate phasegate:check-phase --unit harness-api",
              "  phasegate phasegate:check-phase harness-api --json",
              "",
            ].join("\n"),
          );
          return;
        }
        const mod = createHarnessApiModule();
        const positional = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
        const unit = parseFlag(args, "--unit") ?? positional ?? "";
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.checkPhase.handle({ unit }, flags);
        break;
      }

      case "phasegate:ci-check": {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.ciCheck.handle({}, flags);
        break;
      }

      case "phasegate:detect-drift": {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.detectDrift.handle({}, flags);
        break;
      }

      case "phasegate:status": {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.status.handle({}, flags);
        if (!json) await printStoryReflectionStatusLine(rootDir);
        break;
      }

      case "phasegate:lint": {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        const target = parseFlag(args, "--target");
        if (target) flags.target = target;
        await mod.handlers.lint.handle({}, flags);
        break;
      }

      case "phasegate:complete-check": {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.completeCheck.handle({}, flags);
        break;
      }

      case "phasegate:impact-analysis": {
        const mod = createHarnessApiModule();
        const storyId = args[1] && !args[1].startsWith("--") ? args[1] : (parseFlag(args, "--story-id") ?? "");
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.impactAnalysis.handle({ storyId }, flags);
        break;
      }

      case "phasegate:generate-matrix": {
        const { createNyquistValidationModule } = await import("./nyquist-validation/composition-root.js");
        const mod = createNyquistValidationModule({
          getStoryIds: async () => [],
        });
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.generateMatrixHandler.handle({
          requirementsPath: parseFlag(args, "--requirements") ?? "docs/product/user_stories.md",
          testRoot: parseFlag(args, "--tests") ?? "scripts/harness/__tests__",
          matrixFilePath: parseFlag(args, "--out") ?? ".harness/requirement-test-matrix.json",
        }, flags);
        break;
      }

      // ── ci-governance ──
      case "ci:generate-template": {
        if (hasFlag(args, "--help")) {
          console.log(`Usage: phasegate ci:generate-template [options]

Generates a CI template configuration.

Options:
  --preset <id>    Preset name (e.g. standard, strict). Default: standard.
  --type <type>    Template purpose (NOT CI platform name). One of:
                     aidlc-gate        — AIDLC phase gate checks
                     consistency-check — Doc/code consistency checks
                     pre-commit        — Pre-commit hook template
                     agent-context-refresh — AGENTS.md / CLAUDE.md refresh workflow
  --render         Render the template to stdout
  --json           Output in JSON format

Examples:
  phasegate ci:generate-template --type aidlc-gate
  phasegate ci:generate-template --preset strict --type pre-commit --render`);
          process.exit(0);
        }
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const presetId = parseFlag(args, "--preset") ?? "standard";
        const templateType = parseFlag(args, "--type") ?? "aidlc-gate";
        const render = hasFlag(args, "--render");
        const format = json ? "json" : "human";
        const result = await mod.generateCiTemplateHandler.handle({ presetId, templateType, render, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "ci:migrate-agents-md": {
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const dryRun = hasFlag(args, "--dry-run");
        const validateOnly = hasFlag(args, "--validate-only");
        const format = json ? "json" : "human";
        const result = await mod.migrateAgentsMdHandler.handle({ dryRun, validateOnly, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "ci:auto-refresh-agent-context": {
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const dryRun = hasFlag(args, "--dry-run");
        const apply = hasFlag(args, "--apply");
        const format = json ? "json" : "human";
        const result = await mod.refreshAgentContextHandler.handle({ dryRun, apply, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "refresh-claude-md": {
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const dryRun = hasFlag(args, "--dry-run");
        const apply = hasFlag(args, "--apply");
        const format = json ? "json" : "human";
        const result = await mod.refreshClaudeMdHandler.handle({ dryRun, apply, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "p2:check-agent-context": {
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const thresholdRaw = parseFlag(args, "--threshold-days");
        const thresholdDays = thresholdRaw === undefined ? undefined : Number(thresholdRaw);
        const format = json ? "json" : "human";
        const result = await mod.checkAgentContextHandler.handle({ thresholdDays, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "ci:check-repetition": {
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const errorCode = parseFlag(args, "--code") ?? "";
        const reset = hasFlag(args, "--reset");
        const format = json ? "json" : "human";
        const result = await mod.checkRepetitionHandler.handle({ errorCode, reset, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "baseline": {
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const dryRun = hasFlag(args, "--dry-run");
        const force = hasFlag(args, "--force");
        const pathsFlag = parseFlag(args, "--paths");
        const include = pathsFlag
          ? pathsFlag
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
        const format = json ? "json" : "human";
        const result = await mod.createBaselineHandler.handle({
          include,
          dryRun,
          force,
          format,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "scaffold-design": {
        const mod = buildCiGovernance(rootDir, harnessRoot);
        const unit = parseFlag(args, "--unit") ?? "";
        const phase = parseFlag(args, "--phase") ?? "";
        const force = hasFlag(args, "--force");
        const format = json ? "json" : "human";
        const result = await mod.scaffoldDesignHandler.handle({
          unit,
          phase,
          force,
          format,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // ── skill-quality ──
      case "skill:execute-tdd-cycle": {
        const mod = createSkillQualityHandlers();
        const unit = parseFlag(args, "--unit") ?? "";
        const storyId = parseFlag(args, "--story") ?? "";
        const description = parseFlag(args, "--desc") ?? "";
        const phaseRaw = parseFlag(args, "--phase") ?? "RED";
        const phase =
          phaseRaw === "RED" || phaseRaw === "GREEN" || phaseRaw === "REFACTOR" ? phaseRaw : ("RED" as const);
        const passed = hasFlag(args, "--passed");
        const result = await mod.executeTddCycleHandler.handle({ unit, storyId, description, phase, passed });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case "skill:check-coverage": {
        const mod = createSkillQualityHandlers();
        const storyId = parseFlag(args, "--story") ?? "";
        const format = json ? "json" : "human";
        const result = await mod.checkCoverageHandler.handle({ storyId, format });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case "skill:collect-lessons": {
        const mod = createSkillQualityHandlers();
        const storyId = parseFlag(args, "--story") ?? "";
        const sourcesRaw = parseFlag(args, "--sources") ?? "";
        const sources = sourcesRaw ? sourcesRaw.split(",") : [];
        const writeArtifact = hasFlag(args, "--write-artifact");
        const result = await mod.collectLessonsHandler.handle({ storyId, sources, writeArtifact });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case "skill:apply-cascade-update": {
        const mod = createSkillQualityHandlers();
        const storyId = parseFlag(args, "--story") ?? "";
        const dryRun = hasFlag(args, "--dry-run");
        const result = await mod.applyCascadeUpdateHandler.handle({ storyId, dryRun });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case "skill:validate-structure": {
        const mod = createSkillQualityHandlers();
        const skillFile = parseFlag(args, "--file") ?? "";
        const format = json ? "json" : "human";
        const result = await mod.validateSkillStructureHandler.handle({ skillFile, format });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      // ── regression-suite ──
      case "regression:run-k-requirements": {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runKRequirementsRegressionUseCase.execute();
        const output = json
          ? JSON.stringify(result, null, 2)
          : `K-Requirements: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case "regression:run-gng-gate": {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runGngGateRegressionUseCase.execute();
        const output = json
          ? JSON.stringify(result, null, 2)
          : `GnG Gate: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case "regression:run-agent-guard": {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runAgentIndependenceGuardUseCase.execute();
        const output = json
          ? JSON.stringify(result, null, 2)
          : `Agent Independence: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case "regression:run-k14-k15": {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runK14K15RegressionUseCase.execute();
        const output = json
          ? JSON.stringify(result, null, 2)
          : `K14/K15: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case "regression:configure-ci-gate": {
        const mod = buildRegressionSuite(rootDir);
        const requiredSuiteIds = parseSuiteIds(parseFlag(args, "--suites") ?? DEFAULT_REGRESSION_SUITES);
        const threshold = parseCoverageThreshold(parseFlag(args, "--threshold"));
        const result = await mod.configureCiGateUseCase.execute({
          requiredSuiteIds,
          coverageThreshold: threshold,
          executionMode: "sequential",
        });
        const output = json
          ? JSON.stringify(result, null, 2)
          : `CI gate configured: suites=${result.requiredSuiteIds.join(",")}, threshold=${result.coverageThreshold}%`;
        console.log(output);
        process.exit(0);
        break;
      }

      case "regression:analyze-migration": {
        const mod = buildRegressionSuite(rootDir);
        const dryRun = !hasFlag(args, "--no-dry-run");
        const result = await mod.analyzeV0MigrationUseCase.execute({ dryRun });
        const output = json
          ? JSON.stringify(result, null, 2)
          : `Migration analysis: total=${result.totalCount}, migrated=${result.migratedCount}, modified=${result.modifiedCount}, skipped=${result.skippedCount}`;
        console.log(output);
        process.exit(0);
        break;
      }

      case "regression:migrate-v0-tests": {
        const mod = buildRegressionSuite(rootDir);
        const confirm = hasFlag(args, "--confirm");
        const result = await mod.migrateV0TestsUseCase.execute({ confirmExecute: confirm });
        const output = json
          ? JSON.stringify(result, null, 2)
          : `Migration: total=${result.totalCount}, migrated=${result.migratedCount}, modified=${result.modifiedCount}, skipped=${result.skippedCount}`;
        console.log(output);
        process.exit(0);
        break;
      }

      // ── phase2-extensions ──
      case "p2:check-freshness": {
        const mod = buildPhase2Extensions(rootDir, resolvedConfig ?? undefined);
        const p2args = args.slice(1);
        const result = await mod.checkFreshnessHandler.handle(p2args);
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case "p2:validate-pointers": {
        const mod = buildPhase2Extensions(rootDir, resolvedConfig ?? undefined);
        const p2args = args.slice(1);
        const result = await mod.validatePointersHandler.handle(p2args);
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case "p2:generate-e2e-template": {
        const mod = buildPhase2Extensions(rootDir, resolvedConfig ?? undefined);
        const p2args = args.slice(1);
        const result = await mod.generateE2ETemplateHandler.handle(p2args);
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case "p2:check-initial-creation": {
        const mod = buildPhase2Extensions(rootDir, resolvedConfig ?? undefined);
        const p2args = args.slice(1);
        const result = await mod.checkInitialCreationExpirationHandler.handle(p2args);
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      // ── agent integration / hooks ──
      case "hook": {
        const subCommand = args[1];
        const usage = "Usage: phasegate hook <pre-tool-use|post-tool-use|stop|session-start|user-prompt-submit>";
        if (!subCommand) {
          console.error(usage);
          process.exit(2);
        }
        const hookFileName: Record<string, string> = {
          "pre-tool-use": "pre-tool-use-hook.js",
          "post-tool-use": "post-tool-use-hook.js",
          stop: "stop-hook.js",
          "session-start": "session-start-hook.js",
          "user-prompt-submit": "user-prompt-submit-hook.js",
        };
        const fileName = hookFileName[subCommand];
        if (!fileName) {
          console.error(`Unknown hook subcommand: ${subCommand}`);
          console.error(usage);
          process.exit(2);
        }
        const hookPath = join(harnessRoot, "scripts/harness/agent-integration/presentation", fileName);
        await import(hookPath);
        break;
      }

      case "pre-commit": {
        const preCommitPath = join(harnessRoot, "scripts/harness/integrations/pre-commit.js");
        const preCommitMod = (await import(preCommitPath)) as {
          runPreCommitCli: () => Promise<void>;
        };
        await preCommitMod.runPreCommitCli();
        break;
      }

      case "commit-msg": {
        const preCommitPath = join(harnessRoot, "scripts/harness/integrations/pre-commit.js");
        const preCommitMod = (await import(preCommitPath)) as {
          runCommitMsgCli: (commitMessagePath: string | undefined) => Promise<void>;
        };
        await preCommitMod.runCommitMsgCli(args[1]);
        break;
      }

      case "bypass:audit": {
        const preCommitPath = join(harnessRoot, "scripts/harness/integrations/pre-commit.js");
        const preCommitMod = (await import(preCommitPath)) as {
          runBypassAuditCli: (args: readonly string[]) => Promise<void>;
        };
        await preCommitMod.runBypassAuditCli(args.slice(1));
        break;
      }

      case "delegate-sonnet": {
        const { spawn } = await import("node:child_process");
        const scriptPath = join(harnessRoot, "scripts/delegate-sonnet.sh");
        const forwardArgs = args.slice(1);
        const child = spawn("bash", [scriptPath, ...forwardArgs], { stdio: "inherit" });
        await new Promise<void>((_, reject) => {
          child.on("exit", (code) => {
            process.exit(code ?? 1);
          });
          child.on("error", reject);
        });
        break;
      }

      // ── skills ──
      case "skills": {
        const subCommand = args[1];
        const skillsRoot = join(harnessRoot, "skills");

        if (subCommand === "list") {
          const { promises: fs } = await import("node:fs");
          const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
          const skills: string[] = [];
          for (const entry of entries) {
            if (entry.isDirectory()) {
              try {
                await fs.access(join(skillsRoot, entry.name, "SKILL.md"));
                skills.push(entry.name);
              } catch {
                // skip directories without SKILL.md
              }
            }
          }
          skills.sort();

          const grouped: Record<string, string[]> = { core: [], aidlc: [], utility: [], unknown: [] };
          for (const name of skills) {
            const cat = getCategoryForSkill(name) ?? "unknown";
            grouped[cat].push(name);
          }

          console.log(`Available skills (${skills.length}):\n`);

          const labels: Record<string, string> = {
            core: "Core — Quality Defense",
            aidlc: "AIDLC — Development Workflow",
            utility: "Utility",
          };
          for (const cat of ["core", "aidlc", "utility", "unknown"] as const) {
            if (grouped[cat].length === 0) continue;
            const label = labels[cat] ?? "Other";
            console.log(`  [${label}] (${grouped[cat].length})`);
            for (const name of grouped[cat]) {
              console.log(`    /${name}`);
            }
            console.log("");
          }
          process.exit(0);
        }

        if (subCommand === "info") {
          const skillName = args[2];
          if (!skillName) {
            console.error("Usage: phasegate skills info <skill-name>");
            process.exit(2);
          }
          const { promises: fs } = await import("node:fs");
          const skillMdPath = join(skillsRoot, skillName, "SKILL.md");
          try {
            const content = await fs.readFile(skillMdPath, "utf-8");
            console.log(content);
            process.exit(0);
          } catch {
            console.error(`Skill not found: ${skillName}`);
            console.error(`Expected: ${skillMdPath}`);
            process.exit(2);
          }
        }

        console.error("Usage: phasegate skills <list|info <name>>");
        process.exit(2);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(2);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Fatal: ${message}`);
    process.exit(2);
  }
}

main();
