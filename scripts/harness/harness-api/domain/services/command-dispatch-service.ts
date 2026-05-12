// @layer domain
// @unit harness-api
// @work-item-id WI-108 / WI-114
// command-dispatch-service.ts — CommandDispatchService Domain Service

import { CommandRegistry } from './command-registry.js';
import { StatusDerivationService } from './status-derivation-service.js';
import { HarnessApiResponse, type ExitCode, type HarnessError } from '../value-objects/harness-api-response.js';
import { CheckReadyResult } from '../value-objects/check-ready-result.js';
import { CiCheckResult } from '../value-objects/ci-check-result.js';
import { DriftReportSummary } from '../value-objects/drift-report-summary.js';
import type { ValidatorExecutionPort } from '../ports/validator-execution-port.js';
import type { PhaseGateQueryPort } from '../ports/phase-gate-query-port.js';
import type { BiomeLintPort } from '../ports/biome-lint-port.js';
import type { ImpactAnalysisPort } from '../ports/impact-analysis-port.js';
import type { ArtifactScannerPort } from '../ports/artifact-scanner-port.js';
import type { ConfigQueryPort } from '../ports/config-query-port.js';
import type { LayerId } from '../value-objects/layer-health.js';

export interface CommandDispatchPorts {
  validatorExecutionPort: ValidatorExecutionPort;
  phaseGateQueryPort: PhaseGateQueryPort;
  biomeLintPort: BiomeLintPort;
  impactAnalysisPort: ImpactAnalysisPort;
  artifactScannerPort: ArtifactScannerPort;
  configQueryPort: { getConfig?: () => Promise<unknown>; getPresetInfo?: () => Promise<unknown>; getConfigSummary?: () => Promise<unknown> };
}

export interface DispatchResult<T = unknown> {
  status: string;
  errors: readonly HarnessError[];
  summary: unknown;
  data?: T;
  exitCode: ExitCode;
}

function makeError(message: string): HarnessError {
  return { code: 'HARNESS_ERROR', severity: 'error', message };
}

type LiveValidationState = 'pass' | 'fail' | 'skipped' | 'not-run' | 'error';

function layerIdFromValidatorId(validatorId: string): LayerId | null {
  const prefix = validatorId.slice(0, 2);
  return prefix === 'L1' || prefix === 'L2' || prefix === 'L3' || prefix === 'L4' ? prefix : null;
}

function summarizeLayerResults(items: readonly { validatorId: string; passed: boolean; skipped?: boolean }[]): Partial<Record<LayerId, LiveValidationState>> {
  const result: Partial<Record<LayerId, LiveValidationState>> = {};
  for (const layerId of ['L2', 'L3', 'L4'] as const) {
    const layerItems = items.filter((item) => layerIdFromValidatorId(item.validatorId) === layerId);
    if (layerItems.length === 0) continue;
    if (layerItems.every((item) => item.skipped === true)) {
      result[layerId] = 'skipped';
    } else if (layerItems.some((item) => !item.passed && item.skipped !== true)) {
      result[layerId] = 'fail';
    } else {
      result[layerId] = 'pass';
    }
  }
  return result;
}

const KNOWN_COMMANDS = new Set([
  'phasegate:check-ready',
  'phasegate:check-phase',
  'phasegate:ci-check',
  'phasegate:detect-drift',
  'phasegate:status',
  'phasegate:lint',
  'phasegate:complete-check',
  'phasegate:impact-analysis',
]);

export class CommandDispatchService {
  private readonly registry: CommandRegistry | null;
  private readonly ports: CommandDispatchPorts;
  private readonly statusDerivationService: StatusDerivationService;

  constructor(
    registryOrPorts: CommandRegistry | CommandDispatchPorts,
    ports?: CommandDispatchPorts,
    statusDerivationService?: StatusDerivationService
  ) {
    if (registryOrPorts instanceof CommandRegistry) {
      this.registry = registryOrPorts;
      this.ports = ports!;
      this.statusDerivationService = statusDerivationService ?? new StatusDerivationService();
    } else {
      // Called with just a ports object (unit test pattern)
      this.registry = null;
      this.ports = registryOrPorts;
      this.statusDerivationService = new StatusDerivationService();
    }
  }

  async dispatch<T = unknown>(input: {
    commandName: string;
    args: Record<string, string>;
    flags: Record<string, boolean | string>;
  }): Promise<DispatchResult<T>> {
    const { commandName, args, flags } = input;
    const summary = { totalChecks: 1, passed: 0, failed: 0, warnings: 0 };

    try {
      // Check command exists in registry or known set
      if (this.registry !== null) {
        this.registry.findByName(commandName); // throws CommandNotFoundError if missing
      } else if (!KNOWN_COMMANDS.has(commandName)) {
        throw new Error(`CommandNotFoundError: command '${commandName}' is not registered`);
      }

      return await this._executeCommand<T>(commandName, args, flags, summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const response = HarnessApiResponse.error<T>([makeError(message)], { ...summary, failed: 1 });
      return {
        status: 'error',
        errors: response.errors,
        summary: response.summary,
        data: undefined,
        exitCode: 2,
      };
    }
  }

  private async _executeCommand<T>(
    commandName: string,
    args: Record<string, string>,
    _flags: Record<string, boolean | string>,
    summary: { totalChecks: number; passed: number; failed: number; warnings: number }
  ): Promise<DispatchResult<T>> {
    switch (commandName) {
      case 'phasegate:check-ready': {
        const stories = await this.ports.phaseGateQueryPort.queryAllStories();
        const result = CheckReadyResult.fromStories(stories);
        if (result.allPassed) {
          const r = HarnessApiResponse.pass({ ...summary, passed: 1 }, result);
          return { status: 'pass', errors: [], summary: r.summary, data: result as unknown as T, exitCode: 0 };
        }
        const failed = result.getFailedStories();
        const errors = failed.map((s) => makeError(`Story ${s.storyId} failed Phase Gate`));
        const r = HarnessApiResponse.fail(errors, { ...summary, failed: 1 }, result);
        return { status: 'fail', errors: r.errors, summary: r.summary, data: result as unknown as T, exitCode: 1 };
      }

      case 'phasegate:check-phase': {
        const unitId = args.unit ?? '';
        const phaseInfo = await this.ports.phaseGateQueryPort.queryUnit(unitId);
        if (phaseInfo === null) {
          const errors = [makeError(`Unit '${unitId}' not found`)];
          const r = HarnessApiResponse.fail(errors, { ...summary, failed: 1 });
          return { status: 'fail', errors: r.errors, summary: r.summary, data: undefined, exitCode: 1 };
        }
        const r = HarnessApiResponse.pass({ ...summary, passed: 1 }, phaseInfo);
        return { status: 'pass', errors: [], summary: r.summary, data: phaseInfo as unknown as T, exitCode: 0 };
      }

      case 'phasegate:ci-check': {
        const validatorResults = await this.ports.validatorExecutionPort.runAllValidators();
        const result = CiCheckResult.fromResults(validatorResults);
        if (result.allPassed) {
          const r = HarnessApiResponse.pass({ ...summary, passed: 1 }, result);
          return { status: 'pass', errors: [], summary: r.summary, data: result as unknown as T, exitCode: 0 };
        }
        const collected = result.collectAllErrors();
        const errors = collected.length > 0
          ? collected
          : result.getFailedValidators().map((v) => makeError(`Validator ${v.validatorId} failed`));
        const r = HarnessApiResponse.fail(errors, { ...summary, failed: 1 }, result);
        return { status: 'fail', errors: r.errors, summary: r.summary, data: result as unknown as T, exitCode: 1 };
      }

      case 'phasegate:detect-drift': {
        const drifts = await this.ports.validatorExecutionPort.runDriftDetection();
        const result = DriftReportSummary.fromDrifts(drifts);
        if (!result.hasDrift()) {
          const r = HarnessApiResponse.pass({ ...summary, passed: 1 }, result);
          return { status: 'pass', errors: [], summary: r.summary, data: result as unknown as T, exitCode: 0 };
        }
        const r = HarnessApiResponse.pass({ ...summary, passed: 1, warnings: drifts.length }, result);
        return { status: 'pass', errors: [], summary: r.summary, data: result as unknown as T, exitCode: 0 };
      }

      case 'phasegate:status': {
        const scanResult = await this.ports.artifactScannerPort.scan();
        const liveValidationByLayer: Partial<Record<LayerId, LiveValidationState>> = {};
        try {
          const [lintResult, validatorResults] = await Promise.all([
            this.ports.biomeLintPort.runLint(),
            this.ports.validatorExecutionPort.runAllValidators(),
          ]);
          liveValidationByLayer.L1 = lintResult.passed ? 'pass' : 'fail';
          Object.assign(liveValidationByLayer, summarizeLayerResults(validatorResults));
        } catch {
          liveValidationByLayer.L1 = liveValidationByLayer.L1 ?? 'error';
        }
        let presetInfo = { name: 'standard' as const, enabledLayers: ['L1', 'L2', 'L3'] as ('L1' | 'L2' | 'L3' | 'L4')[] };
        const configPort = this.ports.configQueryPort;
        if (configPort.getPresetInfo) {
          const pi = await configPort.getPresetInfo();
          presetInfo = pi as typeof presetInfo;
        } else if (configPort.getConfig) {
          await configPort.getConfig();
        }
        const statusSummary = this.statusDerivationService.derive({
          scanResult,
          presetInfo,
          configSummary: { configPath: 'phasegate.config.json', lastModified: '', version: '2' },
          phaseGateSummary: { totalStories: 0, passedStories: 0, pendingStories: 0 },
          liveValidationByLayer,
        });
        const r = HarnessApiResponse.pass({ ...summary, passed: 1 }, statusSummary);
        return { status: 'pass', errors: [], summary: r.summary, data: statusSummary as unknown as T, exitCode: 0 };
      }

      case 'phasegate:lint': {
        const lintResult = await this.ports.biomeLintPort.runLint();
        if (lintResult.passed) {
          const r = HarnessApiResponse.pass({ ...summary, passed: 1 });
          return { status: 'pass', errors: [], summary: r.summary, data: undefined, exitCode: 0 };
        }
        const errors = lintResult.errors.length > 0 ? lintResult.errors : [makeError('Lint failed')];
        const r = HarnessApiResponse.fail(errors, { ...summary, failed: 1 });
        return { status: 'fail', errors: r.errors, summary: r.summary, data: undefined, exitCode: 1 };
      }

      case 'phasegate:complete-check': {
        const [validatorResults, lintResult] = await Promise.all([
          this.ports.validatorExecutionPort.runAllValidators(),
          this.ports.biomeLintPort.runLint(),
        ]);
        const allErrors: HarnessError[] = [];
        for (const v of validatorResults) {
          if (!v.passed) {
            const errs = v.errors && v.errors.length > 0 ? v.errors : [makeError(`Validator ${v.validatorId} failed`)];
            allErrors.push(...errs);
          }
        }
        if (!lintResult.passed) {
          const errs = lintResult.errors.length > 0 ? lintResult.errors : [makeError('Lint failed')];
          allErrors.push(...errs);
        }
        if (allErrors.length === 0) {
          const r = HarnessApiResponse.pass({ ...summary, passed: 1 });
          return { status: 'pass', errors: [], summary: r.summary, data: undefined, exitCode: 0 };
        }
        const r = HarnessApiResponse.fail(allErrors, { ...summary, failed: 1 });
        return { status: 'fail', errors: r.errors, summary: r.summary, data: undefined, exitCode: 1 };
      }

      case 'phasegate:impact-analysis': {
        const storyId = args.storyId ?? '';
        const result = await this.ports.impactAnalysisPort.analyze(storyId);
        if (result === null) {
          const errors = [makeError(`Story '${storyId}' not found`)];
          const r = HarnessApiResponse.fail(errors, { ...summary, failed: 1 });
          return { status: 'fail', errors: r.errors, summary: r.summary, data: undefined, exitCode: 1 };
        }
        const r = HarnessApiResponse.pass({ ...summary, passed: 1 }, result);
        return { status: 'pass', errors: [], summary: r.summary, data: result as unknown as T, exitCode: 0 };
      }

      default:
        throw new Error(`CommandNotFoundError: unknown command '${commandName}'`);
    }
  }
}
