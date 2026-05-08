// @layer test
// @unit phase2-extensions
// @story H08-01
import { expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { HarnessConfigFreshnessAdapter } from '../../../phase2-extensions/infrastructure/adapters/harness-config-freshness-adapter.js';

target('HarnessConfigFreshnessAdapter', () => {
  context('default rules', () => {
    it('paths.designDocs をデフォルトの freshness 対象に使う', async () => {
      // Arrange
      const adapter = new HarnessConfigFreshnessAdapter({
        paths: {
          designDocs: 'custom/product/construction',
          inceptionDocs: 'custom/inception',
        },
      });

      // Act
      const actual = await adapter.loadRules();

      // Assert
      expect(actual[0].documentPattern).toBe('custom/product/construction/**/*.md');
    });

    it('paths.designDocs をデフォルトの pointer-validation 対象に使う', async () => {
      // Arrange
      const adapter = new HarnessConfigFreshnessAdapter({
        paths: {
          designDocs: 'custom/product/construction',
          inceptionDocs: 'custom/inception',
        },
      });

      // Act
      const actual = await adapter.loadPointerRules();

      // Assert
      expect(actual[0].documentPattern).toBe('custom/product/construction/**/*.md');
    });
  });
});
