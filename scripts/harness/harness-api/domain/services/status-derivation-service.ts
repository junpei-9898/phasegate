// @layer domain
// @unit harness-api
// @work-item-id WI-112
// status-derivation-service.ts — StatusDerivationService Domain Service

import { LayerHealth, type LayerId } from '../value-objects/layer-health.js';
import { HarnessStatusSummary, type PresetInfo, type ConfigSummary, type PhaseGateSummary } from '../value-objects/harness-status-summary.js';
import type { ArtifactScanResult, ArtifactPresence } from '../value-objects/artifact-scan-result.js';

const ALL_LAYER_IDS: readonly LayerId[] = ['L1', 'L2', 'L3', 'L4'];

function getLayerId(artifact: ArtifactPresence): LayerId | null {
  const id = artifact.layer ?? artifact.layerId;
  if (id === 'L1' || id === 'L2' || id === 'L3' || id === 'L4') return id;
  return null;
}

export class StatusDerivationService {
  /**
   * Derive LayerHealth for a specific layer from scan result.
   */
  deriveLayerHealth(scanResult: ArtifactScanResult, layerId: LayerId): LayerHealth {
    const layerArtifacts = scanResult.foundArtifacts.filter((a) => getLayerId(a) === layerId);
    const hasPresent = layerArtifacts.some((a) => a.present === true);
    const lastResult = hasPresent ? 'pass' : 'unknown';
    return LayerHealth.create({ layerId, enabled: true, lastResult });
  }

  /**
   * Derive full HarnessStatusSummary from scan result and config.
   */
  deriveStatusSummary(
    scanResult: ArtifactScanResult,
    config: { layers?: Record<string, { enabled: boolean }> },
    presetInfo?: PresetInfo,
    configSummary?: ConfigSummary,
    phaseGateSummary?: PhaseGateSummary
  ): HarnessStatusSummary {
    const derivedLayers = scanResult.derivedLayerHealth;

    // Build layer health for all 4 layers
    const layers: LayerHealth[] = ALL_LAYER_IDS.map((layerId) => {
      // Check if enabled in config
      const layerConfig = config.layers?.[layerId];
      const enabled = layerConfig !== undefined ? layerConfig.enabled : true;

      // Find matching derived layer health
      const existing = derivedLayers.find((l) => l.layerId === layerId);
      if (existing) {
        return LayerHealth.create({ layerId, enabled, lastResult: existing.lastResult });
      }

      // Derive from scan result
      const layerArtifacts = scanResult.foundArtifacts.filter((a) => getLayerId(a) === layerId);
      const hasPresent = layerArtifacts.some((a) => a.present === true);
      const lastResult = enabled ? (hasPresent ? 'pass' : 'unknown') : undefined;
      return LayerHealth.create({ layerId, enabled, lastResult });
    });

    const effectivePresetInfo: PresetInfo = presetInfo ?? {
      name: 'standard',
      enabledLayers: ['L1', 'L2', 'L3'],
    };

    const effectiveConfigSummary: ConfigSummary = configSummary ?? {
      configPath: 'phasegate.config.json',
      lastModified: new Date().toISOString(),
      version: '2',
    };

    const effectivePhaseGateSummary: PhaseGateSummary = phaseGateSummary ?? {
      totalStories: 0,
      passedStories: 0,
      pendingStories: 0,
    };

    return HarnessStatusSummary.create({
      layers,
      phaseGateSummary: effectivePhaseGateSummary,
      presetInfo: effectivePresetInfo,
      configSummary: effectiveConfigSummary,
    });
  }

  /**
   * Full derive method following the design spec.
   */
  derive(input: {
    scanResult: ArtifactScanResult;
    presetInfo: PresetInfo;
    configSummary: ConfigSummary;
    phaseGateSummary: PhaseGateSummary;
    liveValidationByLayer?: Partial<Record<LayerId, 'pass' | 'fail' | 'skipped' | 'not-run' | 'error'>>;
  }): HarnessStatusSummary {
    const { scanResult, presetInfo, configSummary, phaseGateSummary, liveValidationByLayer } = input;

    const layers: LayerHealth[] = ALL_LAYER_IDS.map((layerId) => {
      const enabled = presetInfo.enabledLayers.includes(layerId);
      const configurationState = enabled ? 'enabled' : 'disabled';

      // Find from derivedLayerHealth
      const existing = scanResult.derivedLayerHealth.find((l) => l.layerId === layerId);
      const layerArtifacts = scanResult.foundArtifacts.filter((a) => getLayerId(a) === layerId);
      const hasPresent = layerArtifacts.some((a) => a.present === true);
      const cachedArtifactState = hasPresent ? 'present' : 'missing';
      const liveValidationState = liveValidationByLayer?.[layerId] ?? 'not-run';
      const liveLastResult =
        liveValidationState === 'pass' || liveValidationState === 'fail'
          ? liveValidationState
          : undefined;

      if (enabled) {
        const lastResult = liveLastResult ?? existing?.lastResult ?? (hasPresent ? 'pass' : 'unknown');
        return LayerHealth.create({
          layerId,
          enabled,
          lastResult,
          configurationState,
          cachedArtifactState,
          liveValidationState,
        });
      } else {
        return LayerHealth.create({
          layerId,
          enabled: false,
          lastResult: undefined,
          configurationState,
          cachedArtifactState,
          liveValidationState,
        });
      }
    });

    return HarnessStatusSummary.create({
      layers,
      phaseGateSummary,
      presetInfo,
      configSummary,
    });
  }
}
