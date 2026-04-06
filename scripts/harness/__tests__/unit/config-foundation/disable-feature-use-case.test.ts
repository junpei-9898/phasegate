// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { HarnessConfigSourceDocument } from '../../../config-foundation/domain/harness-config.js';
import type { ConfigRepositoryPort } from '../../../config-foundation/domain/ports/config-repository-port.js';
import type { ConfigSchemaValidatorPort } from '../../../config-foundation/domain/ports/config-schema-validator-port.js';
import type { FeatureRegistryPort } from '../../../config-foundation/domain/ports/feature-registry-port.js';
import { FeatureRegistry } from '../../../config-foundation/domain/services/feature-registry.js';
import type { PresetDefinition } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { PresetResolutionService } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { DisableFeatureUseCase } from '../../../config-foundation/application/usecases/disable-feature-use-case.js';

function createSourceDocumentWithBundleSizeLimit(): HarnessConfigSourceDocument {
  return {
    project: {
      name: 'my-project',
      preset: 'strict',
    },
    layers: {},
    quickMode: {},
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
      bundleSizeLimit: 500,
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

function createPresetDefinitions(): Readonly<
  Record<'minimal' | 'standard' | 'strict', PresetDefinition>
> {
  return {
    minimal: {
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
    },
    standard: {
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
          enabled: true,
          validators: ['consistency', 'test-quality'],
          coverageThreshold: 90,
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
    },
    strict: {
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
          enabled: true,
          validators: ['consistency', 'test-quality'],
          coverageThreshold: 95,
        },
        L4: {
          enabled: true,
          validators: ['drift-detector', 'dead-code-detector'],
          schedule: '0 1 * * *',
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
        agentLessonCollection: true,
        cascadeUpdate: false,
        bundleSizeLimit: 500,
        deadCodeGC: true,
      },
      paths: {
        designDocs: 'docs/product/construction',
        inceptionDocs: 'docs/inception',
      },
      reporting: {
        format: 'json',
        outputDir: 'reports',
      },
    },
  };
}

target('DisableFeatureUseCase', () => {
  describe('execute', () => {
    context('有効なbundleSizeLimit機能を無効化する場合', () => {
      it('更新済みsourceDocumentを保存して結果DTOを返すこと', async () => {
        // Arrange
        const document = createSourceDocumentWithBundleSizeLimit();
        const configRepository: ConfigRepositoryPort = {
          load: vi.fn().mockResolvedValue({
            path: '/tmp/phasegate.config.json',
            document,
          }),
          save: vi.fn().mockResolvedValue(undefined),
        };
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi.fn().mockReturnValueOnce([]).mockReturnValueOnce([]),
        };
        const featureRegistryPort: FeatureRegistryPort = {
          listAvailable: vi
            .fn()
            .mockReturnValue([
              'agentLessonCollection',
              'cascadeUpdate',
              'bundleSizeLimit',
              'deadCodeGC',
            ]),
        };
        const useCase = new DisableFeatureUseCase({
          configRepository,
          schemaValidator,
          featureRegistryPort,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
          featureRegistry: new FeatureRegistry(),
        });

        // Act
        const actual = await useCase.execute(
          'bundleSizeLimit',
          '/tmp/phasegate.config.json',
        );

        // Assert
        expect(configRepository.save).toHaveBeenCalledWith(
          '/tmp/phasegate.config.json',
          expect.objectContaining({
            harnesses: {
              bundleSizeLimit: 0,
            },
          }),
        );
        expect(actual).toEqual({
          feature: 'bundleSizeLimit',
          enabled: false,
          configPath: '/tmp/phasegate.config.json',
        });
      });
    });
  });
});
