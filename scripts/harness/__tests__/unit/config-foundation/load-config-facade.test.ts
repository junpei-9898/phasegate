import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { HarnessConfigV2 } from '../../../config-foundation/domain/harness-config.js';
import { LoadConfigFacade } from '../../../config-foundation/application/facades/load-config-facade.js';

function createResolvedConfig(): HarnessConfigV2 {
  return {
    project: {
      name: 'my-project',
      preset: 'minimal',
    },
    layers: {
      L1: {
        enabled: true,
        rules: {},
      },
      L2: {
        enabled: true,
        validators: ['phase-gate', 'architecture'],
      },
      L3: {
        enabled: false,
        validators: ['consistency'],
        coverageThreshold: 0,
      },
      L4: {
        enabled: false,
        validators: ['drift-detector'],
        schedule: '0 0 * * *',
      },
    },
    quickMode: {
      allowedCategories: ['bugfix'],
      maintainedLayers: ['L1', 'L2'],
      relaxedGates: [],
    },
    phaseDependencies: {
      preset: 'default',
      override: false,
      customRules: [],
    },
    planningMode: {
      default: 'interactive',
      perPhase: {},
    },
    harnesses: {
      agentLessonCollection: false,
      cascadeUpdate: false,
      bundleSizeLimit: 0,
      deadCodeGC: false,
    },
    paths: {
      designDocs: 'docs/product/construction',
      inceptionDocs: 'docs/inception',
    },
    reporting: {
      format: 'json',
      outputDir: 'reports',
    },
  };
}

target('LoadConfigFacade', () => {
  describe('load', () => {
    context('内部のLoadResolvedConfigUseCaseが成功する場合', () => {
      it('解決済み設定DTOだけを返すこと', async () => {
        // Arrange
        const config = createResolvedConfig();
        const loadResolvedConfigUseCase = {
          execute: vi.fn().mockResolvedValue({
            config,
            sourcePath: '/tmp/phasegate.config.json',
          }),
        };
        const facade = new LoadConfigFacade({
          loadResolvedConfigUseCase,
        });

        // Act
        const actual = await facade.load('/tmp/phasegate.config.json');

        // Assert
        expect(loadResolvedConfigUseCase.execute).toHaveBeenCalledWith(
          '/tmp/phasegate.config.json',
        );
        expect(actual).toEqual(config);
      });
    });
  });
});
