/**
 * @layer presentation
 *
 * GSDLC Harness CLI エントリポイント。
 * 各Unitの Composition Root からハンドラーを取得し、コマンドに応じてディスパッチする。
 *
 * 起動時に config-foundation で設定を解決し、他Unit に注入する（Cross-unit wiring）。
 */

import { dirname, resolve } from 'node:path';
import { createConfigFoundationModule } from './config-foundation/composition-root.js';
import { createHarnessErrorModule } from './harness-error/composition-root.js';
import { createTraceabilityModelModule } from './traceability-model/composition-root.js';
import { createPhaseDependencyModelModule } from './phase-dependency-model/composition-root.js';
import { createAdrFoundationModule } from './adr-foundation/composition-root.js';
import { createBiomeAstEngineModule } from './biome-ast-engine/composition-root.js';
import { createValidatorSystemModule } from './validator-system/composition-root.js';
import { createQuickModeCompositionRoot } from './quick-mode/composition-root.js';
import { createHarnessApiModule } from './harness-api/composition-root.js';
import { buildCiGovernance } from './ci-governance/composition-root.js';
import { createSkillQualityHandlers } from './skill-quality/composition-root.js';
import { buildRegressionSuite } from './regression-suite/composition-root.js';
import { buildFuseHooksEngine } from './fuse-hooks-engine/composition-root.js';
import { buildPhase2Extensions } from './phase2-extensions/composition-root.js';
import { deploySkills, getDeployedVersion, getHarnessVersion, initHarnessConfig } from './setup/skill-deployer.js';
import type { HarnessConfigV2 } from './config-foundation/domain/harness-config.js';

/**
 * main.ts (scripts/harness/main.ts) から2階層上がパッケージルート。
 * process.argv[1] は tsx 実行時にスクリプトの絶対パスになる。
 */
function getHarnessRoot(): string {
  return resolve(dirname(process.argv[1]), '../..');
}

function getProjectRoot(): string {
  return process.cwd();
}

function printUsage(): void {
  const usage = `
Usage: harness <command> [options]

Setup:
  init                         Initialize project: deploy skills + create harness.config.json
                               (--name <project-name>)
  update-skills                Re-deploy skills from current harness version

Commands:
  enable-feature <name>        Enable a harness feature
  disable-feature <name>       Disable a harness feature
  list-features                List available features

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

  harness:check-ready          Check ready status (--json)
  harness:check-phase          Check phase gate (--unit <unitId>, --json)
  harness:ci-check             Full CI check (--json)
  harness:detect-drift         Detect design/code drift (--json)
  harness:status               Harness overall status (--json)
  harness:lint                 Lint via harness-api (--target <path>, --json)
  harness:complete-check       Complete L2-L4 check (--json)
  harness:impact-analysis      Impact analysis for story (<storyId>, --json)

  ci:generate-template         Generate CI template (--preset <id>, --type <type>, --render, --json)
  ci:migrate-agents-md         Migrate AGENTS.md (--dry-run, --validate-only, --json)
  ci:check-repetition          Check error repetition (--code <errorCode>, --reset, --json)

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

  hooks:config                   Load/validate .harness-hooks.yml (validate|load [--yaml <path>])
  hooks:gate-check               Check completion gate (--story <storyId>)

  p2:check-freshness             Check doc freshness (--pattern <glob>, --dry-run, --format text|json)
  p2:validate-pointers           Validate doc pointers (--include-urls, --format text|json)
  p2:generate-e2e-template       Generate E2E test template (--phase <phase>, --output <path>)

Options:
  --help                       Show this help message
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

/** フラグとその値を除いた位置引数のみを返す */
function parsePositionalArgs(
  args: readonly string[],
  flagsWithValues: readonly string[] = [],
): string[] {
  const result: string[] = [];
  const valueFlags = new Set(flagsWithValues);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (valueFlags.has(arg)) {
        i++; // skip flag value
      }
      continue;
    }
    result.push(arg);
  }

  return result;
}

type RenderFormat = 'human' | 'agent' | 'ci';

function toRenderFormat(value: string): RenderFormat {
  if (value === 'human' || value === 'agent' || value === 'ci') return value;
  return 'human';
}

type ListFormat = 'human' | 'json';

function toListFormat(value: string): ListFormat {
  if (value === 'human' || value === 'json') return value;
  return 'human';
}

type LayerIdFilter = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

function toLayerFilter(value: string | undefined): LayerIdFilter | undefined {
  if (value === 'L0' || value === 'L1' || value === 'L2' || value === 'L3' || value === 'L4') return value;
  return undefined;
}

type AdrStatus = 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';

function isAdrStatus(s: string): s is AdrStatus {
  return s === 'Proposed' || s === 'Accepted' || s === 'Deprecated' || s === 'Superseded';
}

function toAdrStatuses(csv: string | undefined): readonly AdrStatus[] | undefined {
  if (!csv) return undefined;
  return csv.split(',').filter(isAdrStatus);
}

type SuiteIdValue = 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence';

const VALID_SUITE_IDS: readonly SuiteIdValue[] = [
  'k-requirements', 'gng-gate', 'v0-migration', 'agent-independence',
];
const DEFAULT_REGRESSION_SUITES = 'k-requirements,gng-gate';
const DEFAULT_COVERAGE_THRESHOLD = 90;

function parseSuiteIds(raw: string): SuiteIdValue[] {
  const ids = raw.split(',').filter(Boolean);
  for (const id of ids) {
    if (!VALID_SUITE_IDS.includes(id as SuiteIdValue)) {
      throw new Error(`Invalid suite ID: '${id}'. Valid values: ${VALID_SUITE_IDS.join(', ')}`);
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

type PhasePreset = 'default' | 'custom';

function toPhasePreset(value: string): PhasePreset {
  if (value === 'default' || value === 'custom') return value;
  return 'default';
}

type RuleSeverity = 'error' | 'warning' | 'off';

function toRuleSeverity(value: string): RuleSeverity {
  if (value === 'error' || value === 'warning' || value === 'off') return value;
  return 'error';
}

function toRuleSeverityMap(
  rules: Record<string, string>,
): Record<string, RuleSeverity> {
  const result: Record<string, RuleSeverity> = {};
  for (const [key, value] of Object.entries(rules)) {
    result[key] = toRuleSeverity(value);
  }
  return result;
}

/**
 * HarnessConfigV2 (resolved) から phase-dependency-model が期待する PhaseConfigSection を抽出する。
 */
function toPhaseConfigSection(resolvedConfig: HarnessConfigV2) {
  return {
    planningMode: resolvedConfig.planningMode,
    customization: {
      preset: toPhasePreset(resolvedConfig.phaseDependencies.preset),
      overrideEnabled: resolvedConfig.phaseDependencies.override,
      rules: resolvedConfig.phaseDependencies.customRules.map((r) => ({
        targetPhase: r.phase,
        condition: 'requires',
        action: r.requires,
      })),
    },
    reportingOutputDir: resolvedConfig.reporting.outputDir,
  };
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

async function loadResolvedConfig(): Promise<HarnessConfigV2 | undefined> {
  try {
    const configModule = createConfigFoundationModule();
    const result = await configModule.usecases.loadResolvedConfigUseCase.execute();
    return result.config;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === 'help') {
    printUsage();
    process.exit(0);
  }

  const rootDir = getProjectRoot();
  const harnessRoot = getHarnessRoot();
  const json = hasFlag(args, '--json');

  // Cross-unit wiring: 設定を先に解決し、各Unit に注入する
  const resolvedConfig = await loadResolvedConfig();

  try {
    switch (command) {
      // ── harness setup ──
      case 'init': {
        const projectName = parseFlag(args, '--name') ?? 'my-project';
        const result = await deploySkills(harnessRoot, rootDir);
        const configResult = await initHarnessConfig(rootDir, projectName);
        console.log(`✓ Skills deployed to ${result.targetDir} (${result.deployedSkills.length} skills)`);
        if (configResult.created) {
          console.log(`✓ harness.config.json created`);
        } else {
          console.log(`  harness.config.json already exists, skipped`);
        }
        console.log(`✓ Harness v${result.version} initialized`);
        console.log('');
        console.log('Next steps:');
        console.log('  1. Run the product-architect skill to start AIDLC');
        console.log('  2. Customize harness.config.json if needed');
        process.exit(0);
        break;
      }

      case 'update-skills': {
        const deployed = await getDeployedVersion(rootDir);
        const current = await getHarnessVersion(harnessRoot);
        if (deployed) {
          console.log(`Previously deployed: v${deployed.version} (${deployed.deployedAt})`);
        } else {
          console.log('No previously deployed skills found');
        }
        console.log(`Current harness version: v${current}`);
        const result = await deploySkills(harnessRoot, rootDir);
        console.log(`✓ Skills updated (${result.deployedSkills.length} skills redeployed)`);
        process.exit(0);
        break;
      }

      // ── config-foundation ──
      case 'enable-feature': {
        const mod = createConfigFoundationModule();
        const featureName = args[1];
        const list = hasFlag(args, '--list');
        const configPath = parseFlag(args, '--config');
        const result = await mod.handlers.enableFeatureCommandHandler.execute({
          featureName,
          list,
          configPath,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case 'disable-feature': {
        const mod = createConfigFoundationModule();
        const featureName = args[1];
        const list = hasFlag(args, '--list');
        const configPath = parseFlag(args, '--config');
        const result = await mod.handlers.disableFeatureCommandHandler.execute({
          featureName,
          list,
          configPath,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case 'list-features': {
        const mod = createConfigFoundationModule();
        const result = await mod.handlers.enableFeatureCommandHandler.execute({
          list: true,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // ── harness-error ──
      case 'render-errors': {
        const mod = createHarnessErrorModule(rootDir);
        const format = toRenderFormat(parseFlag(args, '--format') ?? 'human');
        const failOnError = hasFlag(args, '--fail-on-error');
        const result = mod.renderHarnessErrorsHandler.execute({
          errors: [],
          format,
          failOnError,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case 'validate-fix': {
        const mod = createHarnessErrorModule(rootDir);
        const code = parseFlag(args, '--code');
        const failFast = hasFlag(args, '--fail-fast');
        const format = toListFormat(parseFlag(args, '--format') ?? 'human');
        const result = await mod.validateFixExampleHandler.execute({
          code,
          failFast,
          format,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case 'list-errors': {
        const mod = createHarnessErrorModule(rootDir);
        const format = toListFormat(parseFlag(args, '--format') ?? 'human');
        const layer = toLayerFilter(parseFlag(args, '--layer'));
        const result = await mod.listErrorDefinitionsHandler.execute({
          format,
          layer,
        });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // ── traceability-model ──
      case 'validate-metadata': {
        const mod = createTraceabilityModelModule(rootDir);
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
      case 'check-phase-gate': {
        const phaseConfig = resolvedConfig
          ? toPhaseConfigSection(resolvedConfig)
          : undefined;
        const reportOutputDir = resolvedConfig?.reporting.outputDir;
        const mod = createPhaseDependencyModelModule({
          rootDir,
          phaseConfig,
          reportOutputDir,
        });
        const level = Number(parseFlag(args, '--level') ?? '1');
        const unitId = parseFlag(args, '--unit');
        const storyId = parseFlag(args, '--story');
        const result =
          await mod.checkPhaseGateCommandHandler.execute({
            targetLevel: level,
            unitId,
            storyId,
            json,
          });
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      // ── adr-foundation ──
      case 'list-adrs': {
        const mod = createAdrFoundationModule(rootDir);
        const statuses = toAdrStatuses(parseFlag(args, '--status'));
        const result = await mod.listAdrsCommandHandler.execute({
          statuses,
          json,
        });
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      case 'validate-adr': {
        const mod = createAdrFoundationModule(rootDir);
        const all = hasFlag(args, '--all');
        const adrRef = args.find(
          (a) => !a.startsWith('--') && a !== command,
        );
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
      case 'lint': {
        const l1Config = resolvedConfig
          ? toL1Config(resolvedConfig)
          : undefined;
        const mod = createBiomeAstEngineModule(rootDir, { l1Config });
        const result = await mod.harnessLintCommandHandler.execute(
          args.slice(1),
        );
        console.log(result.text);
        process.exit(result.exitCode);
        break;
      }

      // ── validator-system ──
      case 'validate': {
        const mod = createValidatorSystemModule();
        const layer = parseFlag(args, '--layer') as 'L0' | 'L2' | 'L3' | 'L4' | 'all' | undefined;
        const unit = parseFlag(args, '--unit');
        const phase = parseFlag(args, '--phase');
        const format = parseFlag(args, '--format') as 'human' | 'agent' | 'ci' | undefined;
        const failOnWarning = hasFlag(args, '--fail-on-warning');
        const noL4 = hasFlag(args, '--no-l4');
        const targetPaths = parsePositionalArgs(args.slice(1), [
          '--layer',
          '--unit',
          '--phase',
          '--format',
        ]);
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
        process.exit(result.exitCode);
        break;
      }

      // ── quick-mode / ci-check ──
      case 'ci-check': {
        const quick = hasFlag(args, '--quick');
        if (quick) {
          const mod = createQuickModeCompositionRoot();
          const failOnReject = hasFlag(args, '--fail-on-reject');
          const dryRun = hasFlag(args, '--dry-run');
          const files = parseFlag(args, '--files');
          const format = parseFlag(args, '--format') as 'human' | 'json' | 'agent' | undefined;
          await mod.handler.handle({ quick: true, failOnReject, dryRun, files, format });
        } else {
          const mod = createHarnessApiModule();
          const flags: Record<string, boolean | string> = {};
          if (json) flags.json = true;
          await mod.handlers.ciCheck.handle({}, flags);
        }
        break;
      }

      // ── harness-api ──
      case 'harness:check-ready': {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.checkReady.handle({}, flags);
        break;
      }

      case 'harness:check-phase': {
        const mod = createHarnessApiModule();
        const unit = parseFlag(args, '--unit') ?? args[1] ?? '';
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.checkPhase.handle({ unit }, flags);
        break;
      }

      case 'harness:ci-check': {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.ciCheck.handle({}, flags);
        break;
      }

      case 'harness:detect-drift': {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.detectDrift.handle({}, flags);
        break;
      }

      case 'harness:status': {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.status.handle({}, flags);
        break;
      }

      case 'harness:lint': {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        const target = parseFlag(args, '--target');
        if (target) flags.target = target;
        await mod.handlers.lint.handle({}, flags);
        break;
      }

      case 'harness:complete-check': {
        const mod = createHarnessApiModule();
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.completeCheck.handle({}, flags);
        break;
      }

      case 'harness:impact-analysis': {
        const mod = createHarnessApiModule();
        const storyId = args[1] && !args[1].startsWith('--') ? args[1] : (parseFlag(args, '--story-id') ?? '');
        const flags: Record<string, boolean | string> = {};
        if (json) flags.json = true;
        await mod.handlers.impactAnalysis.handle({ storyId }, flags);
        break;
      }

      // ── ci-governance ──
      case 'ci:generate-template': {
        const mod = buildCiGovernance(rootDir);
        const presetId = parseFlag(args, '--preset') ?? 'default';
        const templateType = parseFlag(args, '--type') ?? 'aidlc-gate';
        const render = hasFlag(args, '--render');
        const format = json ? 'json' : 'human';
        const result = await mod.generateCiTemplateHandler.handle({ presetId, templateType, render, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case 'ci:migrate-agents-md': {
        const mod = buildCiGovernance(rootDir);
        const dryRun = hasFlag(args, '--dry-run');
        const validateOnly = hasFlag(args, '--validate-only');
        const format = json ? 'json' : 'human';
        const result = await mod.migrateAgentsMdHandler.handle({ dryRun, validateOnly, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case 'ci:check-repetition': {
        const mod = buildCiGovernance(rootDir);
        const errorCode = parseFlag(args, '--code') ?? '';
        const reset = hasFlag(args, '--reset');
        const format = json ? 'json' : 'human';
        const result = await mod.checkRepetitionHandler.handle({ errorCode, reset, format });
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // ── skill-quality ──
      case 'skill:execute-tdd-cycle': {
        const mod = createSkillQualityHandlers();
        const unit = parseFlag(args, '--unit') ?? '';
        const storyId = parseFlag(args, '--story') ?? '';
        const description = parseFlag(args, '--desc') ?? '';
        const phaseRaw = parseFlag(args, '--phase') ?? 'RED';
        const phase = (phaseRaw === 'RED' || phaseRaw === 'GREEN' || phaseRaw === 'REFACTOR')
          ? phaseRaw
          : 'RED' as const;
        const passed = hasFlag(args, '--passed');
        const result = await mod.executeTddCycleHandler.handle({ unit, storyId, description, phase, passed });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case 'skill:check-coverage': {
        const mod = createSkillQualityHandlers();
        const storyId = parseFlag(args, '--story') ?? '';
        const format = json ? 'json' : 'human';
        const result = await mod.checkCoverageHandler.handle({ storyId, format });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case 'skill:collect-lessons': {
        const mod = createSkillQualityHandlers();
        const storyId = parseFlag(args, '--story') ?? '';
        const sourcesRaw = parseFlag(args, '--sources') ?? '';
        const sources = sourcesRaw ? sourcesRaw.split(',') : [];
        const writeArtifact = hasFlag(args, '--write-artifact');
        const result = await mod.collectLessonsHandler.handle({ storyId, sources, writeArtifact });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case 'skill:apply-cascade-update': {
        const mod = createSkillQualityHandlers();
        const storyId = parseFlag(args, '--story') ?? '';
        const dryRun = hasFlag(args, '--dry-run');
        const result = await mod.applyCascadeUpdateHandler.handle({ storyId, dryRun });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      case 'skill:validate-structure': {
        const mod = createSkillQualityHandlers();
        const skillFile = parseFlag(args, '--file') ?? '';
        const format = json ? 'json' : 'human';
        const result = await mod.validateSkillStructureHandler.handle({ skillFile, format });
        console.log(result.message);
        process.exit(result.exitCode);
        break;
      }

      // ── regression-suite ──
      case 'regression:run-k-requirements': {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runKRequirementsRegressionUseCase.execute();
        const output = json ? JSON.stringify(result, null, 2) : `K-Requirements: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case 'regression:run-gng-gate': {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runGngGateRegressionUseCase.execute();
        const output = json ? JSON.stringify(result, null, 2) : `GnG Gate: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case 'regression:run-agent-guard': {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runAgentIndependenceGuardUseCase.execute();
        const output = json ? JSON.stringify(result, null, 2) : `Agent Independence: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case 'regression:run-k14-k15': {
        const mod = buildRegressionSuite(rootDir);
        const result = await mod.runK14K15RegressionUseCase.execute();
        const output = json ? JSON.stringify(result, null, 2) : `K14/K15: ${result.passedCount}/${result.totalCount} passed`;
        console.log(output);
        process.exit(result.failedCount > 0 ? 1 : 0);
        break;
      }

      case 'regression:configure-ci-gate': {
        const mod = buildRegressionSuite(rootDir);
        const requiredSuiteIds = parseSuiteIds(parseFlag(args, '--suites') ?? DEFAULT_REGRESSION_SUITES);
        const threshold = parseCoverageThreshold(parseFlag(args, '--threshold'));
        const result = await mod.configureCiGateUseCase.execute({
          requiredSuiteIds,
          coverageThreshold: threshold,
          executionMode: 'sequential',
        });
        const output = json ? JSON.stringify(result, null, 2) : `CI gate configured: suites=${result.requiredSuiteIds.join(',')}, threshold=${result.coverageThreshold}%`;
        console.log(output);
        process.exit(0);
        break;
      }

      case 'regression:analyze-migration': {
        const mod = buildRegressionSuite(rootDir);
        const dryRun = !hasFlag(args, '--no-dry-run');
        const result = await mod.analyzeV0MigrationUseCase.execute({ dryRun });
        const output = json
          ? JSON.stringify(result, null, 2)
          : `Migration analysis: total=${result.totalCount}, migrated=${result.migratedCount}, modified=${result.modifiedCount}, skipped=${result.skippedCount}`;
        console.log(output);
        process.exit(0);
        break;
      }

      case 'regression:migrate-v0-tests': {
        const mod = buildRegressionSuite(rootDir);
        const confirm = hasFlag(args, '--confirm');
        const result = await mod.migrateV0TestsUseCase.execute({ confirmExecute: confirm });
        const output = json
          ? JSON.stringify(result, null, 2)
          : `Migration: total=${result.totalCount}, migrated=${result.migratedCount}, modified=${result.modifiedCount}, skipped=${result.skippedCount}`;
        console.log(output);
        process.exit(0);
        break;
      }

      // ── fuse-hooks-engine ──
      case 'hooks:config': {
        const mod = buildFuseHooksEngine(rootDir);
        const subcommand = args[1] ?? 'load';
        const yamlPath = parseFlag(args, '--yaml') ?? '.harness-hooks.yml';
        const result = await mod.hookConfigHandler.handle([subcommand, yamlPath]);
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      case 'hooks:gate-check': {
        const mod = buildFuseHooksEngine(rootDir);
        const storyId = parseFlag(args, '--story') ?? args[1] ?? '';
        const result = await mod.completionGateHandler.handle([storyId]);
        console.log(result.output);
        process.exit(result.exitCode);
        break;
      }

      // ── phase2-extensions ──
      case 'p2:check-freshness': {
        const mod = buildPhase2Extensions(rootDir, resolvedConfig ?? undefined);
        const p2args = args.slice(1);
        const result = await mod.checkFreshnessHandler.handle(p2args);
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case 'p2:validate-pointers': {
        const mod = buildPhase2Extensions(rootDir, resolvedConfig ?? undefined);
        const p2args = args.slice(1);
        const result = await mod.validatePointersHandler.handle(p2args);
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      case 'p2:generate-e2e-template': {
        const mod = buildPhase2Extensions(rootDir, resolvedConfig ?? undefined);
        const p2args = args.slice(1);
        const result = await mod.generateE2ETemplateHandler.handle(p2args);
        console.log(result.stdout);
        process.exit(result.exitCode);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(2);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Fatal: ${message}`);
    process.exit(2);
  }
}

main();
