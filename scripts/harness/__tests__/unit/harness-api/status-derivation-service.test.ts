// @layer test
// @unit harness-api
// @story H09-04
// @work-item-id WI-112
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { StatusDerivationService } from '../../../harness-api/domain/services/status-derivation-service.js';
import { ArtifactScanResult } from '../../../harness-api/domain/value-objects/artifact-scan-result.js';
import type { ArtifactPresence } from '../../../harness-api/domain/value-objects/artifact-scan-result.js';

function makeScanResult(artifacts: ArtifactPresence[]) {
  return ArtifactScanResult.create({ scannedPaths: [], foundArtifacts: artifacts, derivedLayerHealth: [] });
}

target('StatusDerivationService', () => {
  describe('derive: standardプリセット', () => {
    // UT-SDS-001
    it('standardプリセットでL1-L3が有効かつ成果物ありの場合、L1-L3がpass・L4がdisabledになること', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([
        { layer: 'L1', present: true },
        { layer: 'L2', present: true },
        { layer: 'L3', present: true },
      ]);
      const presetInfo = { name: 'standard' as const, enabledLayers: ['L1' as const, 'L2' as const, 'L3' as const] };
      const configSummary = { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
      const phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      // Act
      const actual = svc.derive({ scanResult, presetInfo, configSummary, phaseGateSummary });
      // Assert
      expect(actual.getLayerHealth('L1')?.lastResult).toBe('pass');
      expect(actual.getLayerHealth('L2')?.lastResult).toBe('pass');
      expect(actual.getLayerHealth('L3')?.lastResult).toBe('pass');
      expect(actual.getLayerHealth('L4')?.enabled).toBe(false);
    });

    // UT-SDS-002
    it('有効レイヤーで成果物なしの場合、lastResult=unknownになること', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([
        { layer: 'L1', present: true },
        { layer: 'L2', present: true },
        { layer: 'L3', present: false },
      ]);
      const presetInfo = { name: 'standard' as const, enabledLayers: ['L1' as const, 'L2' as const, 'L3' as const] };
      const configSummary = { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
      const phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      // Act
      const actual = svc.derive({ scanResult, presetInfo, configSummary, phaseGateSummary });
      // Assert
      expect(actual.getLayerHealth('L3')?.lastResult).toBe('unknown');
    });

    it('live validation resultがある場合、cached artifact stateと区別してlastResultへ反映すること', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([
        { layer: 'L1', present: true },
        { layer: 'L2', present: false },
      ]);
      const presetInfo = { name: 'standard' as const, enabledLayers: ['L1' as const, 'L2' as const, 'L3' as const] };
      const configSummary = { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
      const phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      // Act
      const actual = svc.derive({
        scanResult,
        presetInfo,
        configSummary,
        phaseGateSummary,
        liveValidationByLayer: { L2: 'pass', L4: 'skipped' },
      });
      // Assert
      expect(actual.getLayerHealth('L2')).toMatchObject({
        enabled: true,
        lastResult: 'pass',
        configurationState: 'enabled',
        cachedArtifactState: 'missing',
        liveValidationState: 'pass',
      });
      expect(actual.getLayerHealth('L4')).toMatchObject({
        enabled: false,
        lastResult: undefined,
        configurationState: 'disabled',
        liveValidationState: 'skipped',
      });
    });
  });

  describe('derive: strictプリセット', () => {
    // UT-SDS-003
    it('strictプリセットで全成果物ありの場合、L1-L4全てpassになること', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([
        { layer: 'L1', present: true },
        { layer: 'L2', present: true },
        { layer: 'L3', present: true },
        { layer: 'L4', present: true },
      ]);
      const presetInfo = { name: 'strict' as const, enabledLayers: ['L1' as const, 'L2' as const, 'L3' as const, 'L4' as const] };
      const configSummary = { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
      const phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      // Act
      const actual = svc.derive({ scanResult, presetInfo, configSummary, phaseGateSummary });
      // Assert
      expect(actual.getLayerHealth('L1')).toMatchObject({ enabled: true, lastResult: 'pass' });
      expect(actual.getLayerHealth('L2')).toMatchObject({ enabled: true, lastResult: 'pass' });
      expect(actual.getLayerHealth('L3')).toMatchObject({ enabled: true, lastResult: 'pass' });
      expect(actual.getLayerHealth('L4')).toMatchObject({ enabled: true, lastResult: 'pass' });
    });
  });

  describe('derive: minimalプリセット', () => {
    // UT-SDS-004
    it('minimalプリセットでL1のみ有効になること', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([{ layer: 'L1', present: true }]);
      const presetInfo = { name: 'minimal' as const, enabledLayers: ['L1' as const] };
      const configSummary = { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
      const phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      // Act
      const actual = svc.derive({ scanResult, presetInfo, configSummary, phaseGateSummary });
      // Assert
      expect(actual.getLayerHealth('L1')?.enabled).toBe(true);
      expect(actual.getLayerHealth('L2')?.enabled).toBe(false);
      expect(actual.getLayerHealth('L3')?.enabled).toBe(false);
      expect(actual.getLayerHealth('L4')?.enabled).toBe(false);
    });
  });

  describe('deriveLayerHealth', () => {
    // UT-SDS-005
    it('L1成果物ありでlastResult=passのLayerHealthを返すこと', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([{ layer: 'L1', present: true }]);
      // Act
      const actual = svc.deriveLayerHealth(scanResult, 'L1');
      // Assert
      expect(actual.lastResult).toBe('pass');
      expect(actual.enabled).toBe(true);
    });

    // UT-SDS-006
    it('L2成果物なしでlastResult=unknownのLayerHealthを返すこと', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([]);
      // Act
      const actual = svc.deriveLayerHealth(scanResult, 'L2');
      // Assert
      expect(actual.lastResult).toBe('unknown');
    });
  });

  describe('isAllLayersHealthy', () => {
    // UT-SDS-007
    it('全レイヤーpassの場合isAllLayersHealthy=trueになること', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([
        { layer: 'L1', present: true }, { layer: 'L2', present: true },
        { layer: 'L3', present: true }, { layer: 'L4', present: true },
      ]);
      const presetInfo = { name: 'strict' as const, enabledLayers: ['L1' as const, 'L2' as const, 'L3' as const, 'L4' as const] };
      const configSummary = { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
      const phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      const summary = svc.derive({ scanResult, presetInfo, configSummary, phaseGateSummary });
      // Act
      const actual = summary.isAllLayersHealthy();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-SDS-008
    it('いずれかのレイヤーにunknownがある場合isAllLayersHealthy=falseになること', () => {
      // Arrange
      const svc = new StatusDerivationService();
      const scanResult = makeScanResult([{ layer: 'L1', present: true }]);
      const presetInfo = { name: 'standard' as const, enabledLayers: ['L1' as const, 'L2' as const, 'L3' as const] };
      const configSummary = { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
      const phaseGateSummary = { totalStories: 0, passedStories: 0, pendingStories: 0 };
      const summary = svc.derive({ scanResult, presetInfo, configSummary, phaseGateSummary });
      // Act
      const actual = summary.isAllLayersHealthy();
      // Assert
      expect(actual).toBe(false);
    });
  });
});
