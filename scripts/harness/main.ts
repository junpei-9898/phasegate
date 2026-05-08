/**
 * @unit harness-api
 * @layer presentation
 *
 * Phasegate CLI エントリポイント。
 * 各Unitの Composition Root からハンドラーを取得し、コマンドに応じてディスパッチする。
 *
 * 起動時に config-foundation で設定を解決し、他Unit に注入する（Cross-unit wiring）。
 */

import { access, readFile as fsReadFile } from "node:fs/promises";
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
  deployDesignDocs,
  deployHookScripts,
  deployHuskyCommitMsgHook,
  deployHuskyHook,
  deploySkills,
  getCategoryForSkill,
  getDeployedVersion,
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function printUsage(): void {
  const usage = `
Usage: phasegate <command> [options]

Setup:
  init                         Initialize project: deploy skills + design docs + phasegate.config.json
                               (--name <project-name>, --preset <full|standard|minimal|custom>,
                                --skills <core|all>, --agent <claude|codex|both>, --with-husky, --yes)
  update-skills                Re-deploy skills from current harness version

Commands:
  enable-feature <name>        Enable a harness feature
  disable-feature <name>       Disable a harness feature
  list-features                List available features
  migrate                      Migrate phasegate.config.json (--schema v3, --config <path>)

  render-errors                Render harness errors (--format human|agent|ci)
  validate-fix                 Validate fix examples (--code <code>)
  list-errors                  List error definitions (--format human|json, --layer L0-L4)

  validate-metadata <files..>  Validate implementation metadata
  check-phase-gate             Check phase gate (--level 1|2|3)

  list-adrs                    List ADRs (--status Proposed|Accepted|...)
  validate-adr                 Validate ADRs (--all or <adrRef>)

  lint                         Run lint checks (--json, --target <path>)

  validate                     Run validators (--layer L0|L2|L3|L4|all, --unit, --format human|agent|ci)
  ci-check                     CI check (--quick for quick mode, --fail-on-reject, --dry-run, --files)

  phasegate:check-ready         Check ready status (--json)
  phasegate:check-phase         Check phase gate (--unit <unitId>, --json)
  phasegate:ci-check            Full CI check (--json)
  phasegate:detect-drift         Detect design/code drift (--json)
  phasegate:status              Phasegate overall status (--json)
  phasegate:lint                Lint via harness-api (--target <path>, --json)
  phasegate:complete-check       Complete L2-L4 check (--json)
  phasegate:impact-analysis      Impact analysis for story (<storyId>, --json)

  ci:generate-template         Generate CI template (--preset <id>, --type <aidlc-gate|consistency-check|pre-commit>, --render, --json)
  ci:migrate-agents-md         Migrate AGENTS.md (--dry-run, --validate-only, --json)
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
  --with-husky                    Install Husky pre-commit hooks
  --yes                           Skip confirmation prompts
  --help, -h                      Show this help`,
  "update-skills": `Usage: phasegate update-skills [options]

Redeploy skills in .claude/skills/ from the installed phasegate version. WARNING: overwrites existing skill files.

Options:
  --skills <core|all>             Skill set to deploy
  --agent <claude|codex|both>     Agent integration target
  --help, -h                      Show this help`,
  validate: `Usage: phasegate validate [options]

Run validators against the project. Without --layer, runs all enabled layers (L0/L2/L3/L4).

Options:
  --layer <L0|L2|L3|L4>           Run only the specified layer
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
  --preset <id>    Preset name (e.g. standard, strict). Required.
  --type <type>    Template purpose (NOT CI platform name). One of:
                     aidlc-gate        — AIDLC phase gate checks
                     consistency-check — Doc/code consistency checks
                     pre-commit        — Pre-commit hook template
  --render         Render the template to stdout
  --json           Output in JSON format

Examples:
  phasegate ci:generate-template --preset standard --type aidlc-gate
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

function parseInitPhasePreset(value: string | undefined): InitPhasePreset | undefined {
  if (value === undefined) return undefined;
  if (value === "full" || value === "standard" || value === "minimal" || value === "custom") {
    return value;
  }
  return undefined;
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
        const KNOWN_INIT_FLAGS = ["--name", "--preset", "--skills", "--agent", "--with-husky", "--yes"];
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
        const deployClaude = agent === "claude" || agent === "both";
        const deployCodex = agent === "codex" || agent === "both";
        const result = await deploySkills(harnessRoot, rootDir, skillSet);
        const skillLinkResult = await deployAgentSkillLinks(rootDir, {
          claude: deployClaude,
          codex: deployCodex,
        });
        const configResult = await initHarnessConfig(rootDir, projectName, phasePreset);
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
        console.log(
          `✓ Skills deployed to ${result.targetDir} (${result.deployedSkills.length} skills, set: ${skillSet})`,
        );
        if (configResult.created) {
          console.log(`✓ phasegate.config.json created`);
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
        console.log(`✓ Harness v${result.version} initialized (agent: ${agent})`);
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
        process.exit(0);
        break;
      }

      case "update-skills": {
        const deployed = await getDeployedVersion(rootDir);
        const current = await getHarnessVersion(harnessRoot);
        const previousSkillSet: SkillSet = deployed?.skillSet ?? "all";
        const overrideSkillSet = parseFlag(args, "--skills");
        const updateSkillSet: SkillSet =
          overrideSkillSet === "core" || overrideSkillSet === "all" ? overrideSkillSet : previousSkillSet;
        if (deployed) {
          console.log(`Previously deployed: v${deployed.version} (${deployed.deployedAt}, set: ${previousSkillSet})`);
        } else {
          console.log("No previously deployed skills found");
        }
        console.log(`Current harness version: v${current}`);
        const result = await deploySkills(harnessRoot, rootDir, updateSkillSet);
        const shouldLinkClaude =
          (await pathExists(join(rootDir, ".claude", "settings.json"))) ||
          (await pathExists(join(rootDir, ".claude", "skills")));
        const shouldLinkCodex =
          (await pathExists(join(rootDir, ".codex", "hooks.json"))) ||
          (await pathExists(join(rootDir, ".codex", "skills")));
        await deployAgentSkillLinks(rootDir, {
          claude: shouldLinkClaude,
          codex: shouldLinkCodex,
        });
        console.log(`✓ Skills updated (${result.deployedSkills.length} skills redeployed, set: ${updateSkillSet})`);
        process.exit(0);
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
        const format = parseFlag(args, "--format") as "human" | "agent" | "ci" | undefined;
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

      // ── ci-governance ──
      case "ci:generate-template": {
        if (hasFlag(args, "--help")) {
          console.log(`Usage: phasegate ci:generate-template [options]

Generates a CI template configuration.

Options:
  --preset <id>    Preset name (e.g. standard, strict). Required.
  --type <type>    Template purpose (NOT CI platform name). One of:
                     aidlc-gate        — AIDLC phase gate checks
                     consistency-check — Doc/code consistency checks
                     pre-commit        — Pre-commit hook template
  --render         Render the template to stdout
  --json           Output in JSON format

Examples:
  phasegate ci:generate-template --preset standard --type aidlc-gate
  phasegate ci:generate-template --preset strict --type pre-commit --render`);
          process.exit(0);
        }
        const mod = buildCiGovernance(rootDir);
        const presetId = parseFlag(args, "--preset") ?? "default";
        const templateType = parseFlag(args, "--type") ?? "aidlc-gate";
        const render = hasFlag(args, "--render");
        const format = json ? "json" : "human";
        const result = await mod.generateCiTemplateHandler.handle({ presetId, templateType, render, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "ci:migrate-agents-md": {
        const mod = buildCiGovernance(rootDir);
        const dryRun = hasFlag(args, "--dry-run");
        const validateOnly = hasFlag(args, "--validate-only");
        const format = json ? "json" : "human";
        const result = await mod.migrateAgentsMdHandler.handle({ dryRun, validateOnly, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "ci:check-repetition": {
        const mod = buildCiGovernance(rootDir);
        const errorCode = parseFlag(args, "--code") ?? "";
        const reset = hasFlag(args, "--reset");
        const format = json ? "json" : "human";
        const result = await mod.checkRepetitionHandler.handle({ errorCode, reset, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case "baseline": {
        const mod = buildCiGovernance(rootDir);
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
