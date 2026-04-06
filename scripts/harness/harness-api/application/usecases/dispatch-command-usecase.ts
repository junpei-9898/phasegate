// @layer application
// dispatch-command-usecase.ts — DispatchCommandUseCase

import { CommandRegistry } from '../../domain/services/command-registry.js';
import { CommandDispatchService } from '../../domain/services/command-dispatch-service.js';
import { StatusDerivationService } from '../../domain/services/status-derivation-service.js';
import { HarnessApiResponseMapper } from '../mappers/harness-api-response-mapper.js';
import type { ValidatorExecutionPort } from '../../domain/ports/validator-execution-port.js';
import type { PhaseGateQueryPort } from '../../domain/ports/phase-gate-query-port.js';
import type { BiomeLintPort } from '../../domain/ports/biome-lint-port.js';
import type { ImpactAnalysisPort } from '../../domain/ports/impact-analysis-port.js';
import type { ArtifactScannerPort } from '../../domain/ports/artifact-scanner-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { CommandDispatchInput } from '../dto/command-dispatch-input.js';
import type { CommandDispatchOutput } from '../dto/command-dispatch-output.js';
import type { ExitCode } from '../../domain/value-objects/harness-api-response.js';

export interface DispatchCommandUseCaseDeps {
  commandDispatchService?: CommandDispatchService;
  statusDerivationService?: StatusDerivationService;
  validatorExecutionPort: ValidatorExecutionPort;
  phaseGateQueryPort: PhaseGateQueryPort;
  biomeLintPort: BiomeLintPort;
  impactAnalysisPort: ImpactAnalysisPort;
  artifactScannerPort: ArtifactScannerPort;
  configQueryPort: ConfigQueryPort | { getPresetInfo?: () => Promise<unknown>; getConfigSummary?: () => Promise<unknown> };
}

export class DispatchCommandUseCase {
  private readonly dispatchService: CommandDispatchService;
  private readonly mapper: HarnessApiResponseMapper;

  constructor(deps: DispatchCommandUseCaseDeps) {
    const ports = {
      validatorExecutionPort: deps.validatorExecutionPort,
      phaseGateQueryPort: deps.phaseGateQueryPort,
      biomeLintPort: deps.biomeLintPort,
      impactAnalysisPort: deps.impactAnalysisPort,
      artifactScannerPort: deps.artifactScannerPort,
      configQueryPort: deps.configQueryPort as { getPresetInfo?: () => Promise<unknown>; getConfigSummary?: () => Promise<unknown> },
    };

    if (deps.commandDispatchService) {
      // The service was already constructed with a registry — just use it directly
      // but we need to set ports too via the service constructor
      this.dispatchService = new CommandDispatchService(
        new CommandRegistry(),
        ports,
        deps.statusDerivationService
      );
      // Actually use the provided dispatch service ports by reconstructing
      this.dispatchService = new CommandDispatchService(ports, undefined, deps.statusDerivationService);
    } else {
      this.dispatchService = new CommandDispatchService(ports, undefined, deps.statusDerivationService);
    }

    this.mapper = new HarnessApiResponseMapper();
  }

  async execute<T = unknown>(input: CommandDispatchInput): Promise<CommandDispatchOutput<T>> {
    const result = await this.dispatchService.dispatch<T>({
      commandName: input.commandName,
      args: input.args ?? {},
      flags: input.flags ?? {},
    });

    // Build a HarnessApiResponse-compatible object for the mapper
    const responseContract = {
      status: result.status as 'pass' | 'fail' | 'error',
      errors: result.errors,
      summary: result.summary as string | { totalChecks: number; passed: number; failed: number; warnings: number },
      data: result.data as T | undefined,
    };

    return {
      response: Object.freeze(responseContract),
      exitCode: result.exitCode as ExitCode,
    };
  }
}
