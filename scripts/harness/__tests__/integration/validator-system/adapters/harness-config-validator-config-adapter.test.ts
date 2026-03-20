/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { HarnessConfigValidatorConfigAdapter } from '../../../../validator-system/infrastructure/adapters/harness-config-validator-config-adapter.js';

target('HarnessConfigValidatorConfigAdapter', () => {
  describe('getLayerConfig', () => {
    context('preset="standard"の設定でL2を取得する場合', () => {
      it('getLayerConfig("L2")がLayerConfig{enabled:true, validatorIds:[L2-001,L2-002,L2-003]}を返す (IT-REPO-HCAdapter-001)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: 'standard',
          layers: {
            L2: { enabled: true, validators: ['L2-001', 'L2-002', 'L2-003'] },
            L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'], coverageThreshold: 90, bundleSizeLimit: 512000 },
            L4: { enabled: true, validators: ['L4-001', 'L4-002', 'L4-003'] },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig('L2');

        // Assert
        expect(actual.layer).toBe('L2');
        expect(actual.enabled).toBe(true);
        expect(actual.validatorIds).toEqual(['L2-001', 'L2-002', 'L2-003']);
        expect(actual.strictOnly).toBe(false);
      });
    });

    context('preset="standard"でL3を取得する場合', () => {
      it('getLayerConfig("L3")がcoverageThreshold=90を含むLayerConfigを返す (IT-REPO-HCAdapter-002)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: 'standard',
          layers: {
            L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'], coverageThreshold: 90, bundleSizeLimit: 512000 },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.layer).toBe('L3');
        expect(actual.thresholds.coverageThreshold).toBe(90);
        expect(actual.strictOnly).toBe(false);
      });
    });

    context('preset="standard"でL4を取得する場合', () => {
      it('getLayerConfig("L4")がenabled=trueのLayerConfigを返す (IT-REPO-HCAdapter-003)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: 'standard',
          layers: {
            L4: { enabled: true, validators: ['L4-001', 'L4-002', 'L4-003'] },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig('L4');

        // Assert
        expect(actual.layer).toBe('L4');
        expect(actual.enabled).toBe(true);
      });
    });

    context('preset="strict"の場合', () => {
      it('getLayerConfig("L3")がstrictOnly=trueを返す (IT-REPO-HCAdapter-004)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: 'strict',
          layers: {
            L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'], coverageThreshold: 90, bundleSizeLimit: 512000 },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.strictOnly).toBe(true);
      });
    });

    context('preset="minimal"でL3 enabled=falseの場合', () => {
      it('getLayerConfig("L3")がenabled=falseを返す (IT-REPO-HCAdapter-005)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: 'minimal',
          layers: {
            L3: { enabled: false, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'] },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.enabled).toBe(false);
      });
    });

    context('bundleSizeLimit=512000が設定されている場合', () => {
      it('getLayerConfig("L3")のthresholds.bundleSizeLimit=512000が返る (IT-REPO-HCAdapter-006)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: 'standard',
          layers: {
            L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'], coverageThreshold: 90, bundleSizeLimit: 512000 },
          },
        });

        // Act
        const actual = await adapter.getLayerConfig('L3');

        // Assert
        expect(actual.thresholds.bundleSizeLimit).toBe(512000);
      });
    });

    context('layersが未定義の場合', () => {
      it('デフォルトのvalidatorIdsが使用される (IT-REPO-HCAdapter-007)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({
          preset: 'standard',
        });

        // Act
        const actual = await adapter.getLayerConfig('L2');

        // Assert
        expect(actual.validatorIds).toEqual(['L2-001', 'L2-002', 'L2-003']);
        expect(actual.enabled).toBe(true);
      });
    });

    context('preset未指定の場合', () => {
      it('standardプリセットが適用される (IT-REPO-HCAdapter-008)', async () => {
        // Arrange
        const adapter = new HarnessConfigValidatorConfigAdapter({});

        // Act
        const actual = await adapter.getLayerConfig('L2');

        // Assert
        expect(actual.strictOnly).toBe(false);
        expect(actual.enabled).toBe(true);
      });
    });
  });
});
