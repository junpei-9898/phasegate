// @layer test
import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ConfigFoundationCoverageThresholdAdapter } from '../../../../nyquist-validation/infrastructure/adapters/config-foundation-coverage-threshold-adapter.js';

target('ConfigFoundationCoverageThresholdAdapter', () => {
  context('getThresholdを呼ぶ場合', () => {
    it('preset=standardの設定でgetThresholdを呼ぶと、active=0.90が返ること', async () => {
      // Arrange
      const adapter = new ConfigFoundationCoverageThresholdAdapter({
        getPreset: vi.fn().mockResolvedValue('standard'),
      });

      // Act
      const actual = await adapter.getThreshold();

      // Assert
      expect(actual.standard).toBe(0.9);
      expect(actual.strict).toBe(0.95);
      expect(actual.active).toBe(0.9);
    });

    it('preset=strictの設定でgetThresholdを呼ぶと、active=0.95が返ること', async () => {
      // Arrange
      const adapter = new ConfigFoundationCoverageThresholdAdapter({
        getPreset: vi.fn().mockResolvedValue('strict'),
      });

      // Act
      const actual = await adapter.getThreshold();

      // Assert
      expect(actual.active).toBe(0.95);
    });

    it('preset=minimalの設定でgetThresholdを呼ぶと、active=0.80が返ること', async () => {
      // Arrange
      const adapter = new ConfigFoundationCoverageThresholdAdapter({
        getPreset: vi.fn().mockResolvedValue('minimal'),
      });

      // Act
      const actual = await adapter.getThreshold();

      // Assert
      expect(actual.active).toBe(0.8);
    });

    it('設定読み込みが失敗した場合、デフォルト値active=0.90にフォールバックすること', async () => {
      // Arrange
      const adapter = new ConfigFoundationCoverageThresholdAdapter({
        getPreset: vi.fn().mockRejectedValue(new Error('config load failed')),
      });

      // Act
      const actual = await adapter.getThreshold();

      // Assert
      expect(actual.active).toBe(0.9);
    });

    it('未知のpresetの場合、デフォルト値active=0.90にフォールバックすること', async () => {
      // Arrange
      const adapter = new ConfigFoundationCoverageThresholdAdapter({
        getPreset: vi.fn().mockResolvedValue('unknown'),
      });

      // Act
      const actual = await adapter.getThreshold();

      // Assert
      expect(actual.active).toBe(0.9);
    });
  });
});

// @story-id H08-07