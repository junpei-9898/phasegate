import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { HarnessConfigSourceDocument } from '../../../config-foundation/domain/harness-config.js';
import type { ConfigRepositoryPort } from '../../../config-foundation/domain/ports/config-repository-port.js';
import type { ConfigSchemaValidatorPort } from '../../../config-foundation/domain/ports/config-schema-validator-port.js';
import type { FeatureRegistryPort } from '../../../config-foundation/domain/ports/feature-registry-port.js';
import { FeatureRegistry } from '../../../config-foundation/domain/services/feature-registry.js';
import type { PresetDefinition } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { PresetResolutionService } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { ListAvailableFeaturesUseCase } from '../../../config-foundation/application/usecases/list-available-features-use-case.js';

function createSourceDocument(): HarnessConfigSourceDocument {
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
      agentLessonCollection: true,
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

target('ListAvailableFeaturesUseCase', () => {
  describe('execute', () => {
    context('利用可能機能の一覧を取得する場合', () => {
      it('現在状態付きで一覧を返すこと', async () => {
        // Arrange
        const document = createSourceDocument();
        const configRepository: ConfigRepositoryPort = {
          load: vi.fn().mockResolvedValue({
            path: '/tmp/phasegate.config.json',
            document,
          }),
          save: vi.fn(),
        };
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi.fn().mockReturnValue([]),
        };
        const featureRegistryPort: FeatureRegistryPort = {
          listAvailable: vi
            .fn()
            .mockReturnValue([
              'deadCodeGC',
              'agentLessonCollection',
              'bundleSizeLimit',
            ]),
        };
        const useCase = new ListAvailableFeaturesUseCase({
          configRepository,
          schemaValidator,
          featureRegistryPort,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
          featureRegistry: new FeatureRegistry(),
        });

        // Act
        const actual = await useCase.execute('/tmp/phasegate.config.json');

        // Assert
        expect(actual).toEqual([
          {
            name: 'agentLessonCollection',
            enabled: true,
          },
          {
            name: 'bundleSizeLimit',
            enabled: true,
          },
          {
            name: 'deadCodeGC',
            enabled: true,
          },
        ]);
      });
    });
  });
});
