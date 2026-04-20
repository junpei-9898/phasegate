// @layer test
// @unit phase2-extensions
// @story HF2-04
import { beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { HarnessConfigInitialCreationExpirationAdapter } from '../../../phase2-extensions/infrastructure/adapters/harness-config-initial-creation-expiration-adapter.js';

target('IT-P2-055〜057 HarnessConfigInitialCreationExpirationAdapter', () => {
  beforeEach(() => {
    // AAA を各テストに閉じ込めるため、共有 Arrange は持たない。
  });

  context('loadRules()', () => {
    it('config に複数ルールがあれば全て読み込む', async () => {
      // Arrange
      const config = {
        phase2Extensions: {
          initialCreationExpirationRules: [
            {
              ruleId: 'r1',
              documentPattern: 'docs/**/*.md',
              daysThreshold: 60,
              commitCountThreshold: 3,
              evaluationMode: 'or' as const,
              enabled: true,
            },
            {
              ruleId: 'r2',
              documentPattern: 'spec/**/*.md',
              daysThreshold: 30,
              commitCountThreshold: 2,
              evaluationMode: 'and' as const,
              enabled: false,
            },
          ],
        },
      };
      const adapter = new HarnessConfigInitialCreationExpirationAdapter(config);

      // Act
      const actual = await adapter.loadRules();

      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].ruleId).toBe('r1');
      expect(actual[1].ruleId).toBe('r2');
      expect(actual[1].isEnabled()).toBe(false);
    });

    it('config が undefined のときデフォルトルール (days=90/commit=5/or) を返す', async () => {
      // Arrange
      const adapter = new HarnessConfigInitialCreationExpirationAdapter(undefined);

      // Act
      const actual = await adapter.loadRules();

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].daysThreshold).toBe(90);
      expect(actual[0].commitCountThreshold).toBe(5);
      expect(actual[0].evaluationMode).toBe('or');
      expect(actual[0].isEnabled()).toBe(true);
    });

    it('enabled=false のルールは isEnabled()=false で読み込まれる', async () => {
      // Arrange
      const config = {
        phase2Extensions: {
          initialCreationExpirationRules: [
            {
              ruleId: 'r1',
              documentPattern: 'docs/**/*.md',
              daysThreshold: 90,
              commitCountThreshold: 5,
              evaluationMode: 'or' as const,
              enabled: false,
            },
          ],
        },
      };
      const adapter = new HarnessConfigInitialCreationExpirationAdapter(config);

      // Act
      const actual = await adapter.loadRules();

      // Assert
      expect(actual[0].isEnabled()).toBe(false);
    });
  });
});
