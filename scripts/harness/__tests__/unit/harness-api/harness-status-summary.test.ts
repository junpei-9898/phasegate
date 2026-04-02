import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessStatusSummary } from '../../../harness-api/domain/value-objects/harness-status-summary.js';
import { LayerHealth } from '../../../harness-api/domain/value-objects/layer-health.js';
import type { PhaseGateSummary, PresetInfo, ConfigSummary } from '../../../harness-api/domain/value-objects/harness-status-summary.js';

function buildPhaseGateSummary(): PhaseGateSummary {
  return { totalStories: 0, passedStories: 0, pendingStories: 0 };
}

function buildPresetInfo(): PresetInfo {
  return { name: 'standard', enabledLayers: ['L1', 'L2', 'L3'] };
}

function buildConfigSummary(): ConfigSummary {
  return { configPath: 'phasegate.config.json', lastModified: '2026-03-19T00:00:00.000Z', version: '2' };
}

function makeLayer(id: 'L1' | 'L2' | 'L3' | 'L4') {
  return LayerHealth.create({ layerId: id, enabled: true, lastResult: 'pass' });
}

target('HarnessStatusSummary', () => {
  describe('正常系: 4レイヤー全て揃った状態でHarnessStatusSummaryを生成する', () => {
    // UT-HSS-001
    it('L1/L2/L3/L4の4件でHarnessStatusSummaryが生成されること', () => {
      // Arrange
      const layers = [makeLayer('L1'), makeLayer('L2'), makeLayer('L3'), makeLayer('L4')];
      const input = { layers, phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = HarnessStatusSummary.create(input);
      // Assert
      expect(actual.layers).toHaveLength(4);
    });
  });

  describe('不変条件テスト（INV: 4レイヤー必須）', () => {
    // UT-HSS-002
    it('layers=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { layers: [], phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = () => HarnessStatusSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HSS-003
    it('layers=[L1/L2/L3]（L4欠落）でエラーをthrowすること', () => {
      // Arrange
      const layers = [makeLayer('L1'), makeLayer('L2'), makeLayer('L3')];
      const input = { layers, phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = () => HarnessStatusSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HSS-004
    it('layers=[L1/L2/L3/L4/L1]（L1重複）でエラーをthrowすること', () => {
      // Arrange
      const layers = [makeLayer('L1'), makeLayer('L2'), makeLayer('L3'), makeLayer('L4'), makeLayer('L1')];
      const input = { layers, phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = () => HarnessStatusSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
