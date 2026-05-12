// @layer test
// @unit harness-api
// @story H09-04
// @work-item-id WI-112
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { LayerHealth } from '../../../harness-api/domain/value-objects/layer-health.js';

target('LayerHealth', () => {
  describe('正常系: 有効な引数でLayerHealthを生成する', () => {
    // UT-LYH-001
    it('layerId=L1, enabled=true, lastResult=passでLayerHealthが生成されること', () => {
      // Arrange
      const input = { layerId: 'L1' as const, enabled: true, lastResult: 'pass' };
      // Act
      const actual = LayerHealth.create(input);
      // Assert
      expect(actual.layerId).toBe('L1');
      expect(actual.enabled).toBe(true);
      expect(actual.lastResult).toBe('pass');
    });

    // UT-LYH-002
    it('layerId=L4, enabled=false, lastResult省略でLayerHealthが生成されること', () => {
      // Arrange
      const input = { layerId: 'L4' as const, enabled: false };
      // Act
      const actual = LayerHealth.create(input);
      // Assert
      expect(actual.enabled).toBe(false);
      expect(actual.lastResult).toBe(undefined);
    });

    // UT-LYH-003
    it('layerId=L2, enabled=true, lastResult=unknownでLayerHealthが生成されること', () => {
      // Arrange
      const input = { layerId: 'L2' as const, enabled: true, lastResult: 'unknown' };
      // Act
      const actual = LayerHealth.create(input);
      // Assert
      expect(actual.lastResult).toBe('unknown');
    });

    it('configuration/cached/live validation stateを分離して保持すること', () => {
      // Arrange
      const input = {
        layerId: 'L4' as const,
        enabled: false,
        configurationState: 'disabled' as const,
        cachedArtifactState: 'missing' as const,
        liveValidationState: 'skipped' as const,
      };
      // Act
      const actual = LayerHealth.create(input);
      // Assert
      expect(actual.configurationState).toBe('disabled');
      expect(actual.cachedArtifactState).toBe('missing');
      expect(actual.liveValidationState).toBe('skipped');
    });
  });

  describe('制約テスト: 列挙外の値はエラー', () => {
    // UT-LYH-004
    it('layerId=L5（列挙外）でエラーをthrowすること', () => {
      // Arrange
      const input = { layerId: 'L5', enabled: true };
      // Act
      const actual = () => LayerHealth.create(input);
      // Assert
      expect(actual).toThrow("invalid layerId 'L5'");
    });

    // UT-LYH-005
    it('lastResult=running（列挙外）でエラーをthrowすること', () => {
      // Arrange
      const input = { layerId: 'L1', enabled: true, lastResult: 'running' };
      // Act
      const actual = () => LayerHealth.create(input);
      // Assert
      expect(actual).toThrow("invalid lastResult 'running'");
    });
  });

  // UT-BND-007
  it('UT-BND-007: lastResult=failが有効値として生成されること', () => {
    // Arrange
    const input = { layerId: 'L3' as const, enabled: true, lastResult: 'fail' };
    // Act
    const actual = LayerHealth.create(input);
    // Assert
    expect(actual.lastResult).toBe('fail');
  });
});
