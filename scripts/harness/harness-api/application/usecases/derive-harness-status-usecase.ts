// derive-harness-status-usecase.ts — DeriveHarnessStatusUseCase

import type { ArtifactScannerPort } from '../../domain/ports/artifact-scanner-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import { StatusDerivationService } from '../../domain/services/status-derivation-service.js';
import type { HarnessStatusSummary } from '../../domain/value-objects/harness-status-summary.js';
import type { StatusDerivationInput } from '../dto/status-derivation-input.js';

export interface DeriveHarnessStatusUseCaseDeps {
  artifactScannerPort: ArtifactScannerPort;
  configQueryPort: Pick<ConfigQueryPort, 'getPresetInfo' | 'getConfigSummary'> & Partial<Pick<ConfigQueryPort, 'getPhaseGateSummary'>>;
  statusDerivationService: StatusDerivationService;
}

export class DeriveHarnessStatusUseCase {
  private readonly artifactScannerPort: ArtifactScannerPort;
  private readonly configQueryPort: DeriveHarnessStatusUseCaseDeps['configQueryPort'];
  private readonly statusDerivationService: StatusDerivationService;

  constructor(deps: DeriveHarnessStatusUseCaseDeps) {
    this.artifactScannerPort = deps.artifactScannerPort;
    this.configQueryPort = deps.configQueryPort;
    this.statusDerivationService = deps.statusDerivationService;
  }

  async execute(_input: StatusDerivationInput): Promise<HarnessStatusSummary> {
    let scanResult: Awaited<ReturnType<ArtifactScannerPort['scan']>>;
    try {
      scanResult = await this.artifactScannerPort.scan();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`HarnessApiDomainError: ArtifactScannerPort failed: ${msg}`);
    }

    let presetInfo: Awaited<ReturnType<ConfigQueryPort['getPresetInfo']>>;
    try {
      presetInfo = await this.configQueryPort.getPresetInfo();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`HarnessApiDomainError: ConfigQueryPort.getPresetInfo failed: ${msg}`);
    }

    let configSummary: Awaited<ReturnType<ConfigQueryPort['getConfigSummary']>>;
    try {
      if (this.configQueryPort.getConfigSummary) {
        configSummary = await this.configQueryPort.getConfigSummary();
      } else {
        configSummary = { configPath: 'phasegate.config.json', lastModified: new Date().toISOString(), version: '2' };
      }
    } catch {
      configSummary = { configPath: 'phasegate.config.json', lastModified: new Date().toISOString(), version: '2' };
    }

    let phaseGateSummary: { totalStories: number; passedStories: number; pendingStories: number };
    try {
      if (this.configQueryPort.getPhaseGateSummary) {
        phaseGateSummary = await this.configQueryPort.getPhaseGateSummary();
      } else {
        phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      }
    } catch {
      phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
    }

    return this.statusDerivationService.derive({
      scanResult,
      presetInfo,
      configSummary,
      phaseGateSummary,
    });
  }
}
