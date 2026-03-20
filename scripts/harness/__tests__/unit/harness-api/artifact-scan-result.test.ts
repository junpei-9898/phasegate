import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ArtifactScanResult } from '../../../harness-api/domain/value-objects/artifact-scan-result.js';
import { LayerHealth } from '../../../harness-api/domain/value-objects/layer-health.js';
import type { ArtifactPresence } from '../../../harness-api/domain/value-objects/artifact-scan-result.js';

function buildArtifactPresence(artifactType: string, present: boolean): ArtifactPresence {
  return { artifactType, present, path: present ? `docs/product/${artifactType}.md` : null };
}

function makeLayer(id: 'L1' | 'L2' | 'L3' | 'L4') {
  return LayerHealth.create({ layerId: id, enabled: true, lastResult: 'pass' });
}

target('ArtifactScanResult', () => {
  describe('正常系: 有効な引数でArtifactScanResultを生成する', () => {
    // UT-ASR-001
    it('scannedPaths/foundArtifacts/derivedLayerHealth全て有効でArtifactScanResultが生成されること', () => {
      // Arrange
      const layers = [makeLayer('L1'), makeLayer('L2'), makeLayer('L3'), makeLayer('L4')];
      const input = {
        scannedPaths: ['docs/product/construction/harness-error'],
        foundArtifacts: [buildArtifactPresence('domain-model', true)],
        derivedLayerHealth: layers,
      };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.scannedPaths).toHaveLength(1);
      expect(actual.derivedLayerHealth).toHaveLength(4);
    });

    // UT-ASR-002
    it('全て空でArtifactScanResultが生成されること', () => {
      // Arrange
      const input = { scannedPaths: [], foundArtifacts: [], derivedLayerHealth: [] };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.foundArtifacts).toHaveLength(0);
    });

    // UT-ASR-003
    it('foundArtifactsにpresent=trueが含まれる場合に正しく格納されること', () => {
      // Arrange
      const artifact = buildArtifactPresence('unit-test-logic', true);
      const input = { scannedPaths: ['scripts/harness'], foundArtifacts: [artifact], derivedLayerHealth: [] };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.foundArtifacts[0].present).toBe(true);
    });

    // UT-ASR-004
    it('derivedLayerHealthが4件（L1〜L4対応）でArtifactScanResultが生成されること', () => {
      // Arrange
      const layers = (['L1', 'L2', 'L3', 'L4'] as const).map((id) => makeLayer(id));
      const input = { scannedPaths: [], foundArtifacts: [], derivedLayerHealth: layers };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.derivedLayerHealth).toHaveLength(4);
    });
  });
});
