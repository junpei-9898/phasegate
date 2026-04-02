import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';
import { UnsupportedFeatureError } from '../../../config-foundation/domain/errors/unsupported-feature-error.js';
import type { HarnessConfigSourceDocument } from '../../../config-foundation/domain/harness-config.js';
import type { ConfigRepositoryPort } from '../../../config-foundation/domain/ports/config-repository-port.js';
import type { ConfigSchemaValidatorPort } from '../../../config-foundation/domain/ports/config-schema-validator-port.js';
import type { FeatureRegistryPort } from '../../../config-foundation/domain/ports/feature-registry-port.js';
import { FeatureRegistry } from '../../../config-foundation/domain/services/feature-registry.js';
import type { PresetDefinition } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { PresetResolutionService } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { EnableFeatureUseCase } from '../../../config-foundation/application/usecases/enable-feature-use-case.js';
import { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

function createHarnessError(code: string, message: string): HarnessError {
  return new HarnessError({
    code: ErrorCode.create(code),
    severity: Severity.create('error'),
    message,
    suggestion: '修正してください',
    adrRef: null,
    fixExample: null,
  });
}

function createMinimalSourceDocument(): HarnessConfigSourceDocument {
  return {
    project: {
      name: 'my-project',
      preset: 'minimal',
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
    harnesses: {},
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

target('EnableFeatureUseCase', () => {
  describe('execute', () => {
    context('利用可能な機能を有効化する場合', () => {
      it('更新済みsourceDocumentを保存して結果DTOを返すこと', async () => {
        // Arrange
        const document = createMinimalSourceDocument();
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
        const useCase = new EnableFeatureUseCase({
          configRepository,
          schemaValidator,
          featureRegistryPort,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
          featureRegistry: new FeatureRegistry(),
        });

        // Act
        const actual = await useCase.execute(
          'agentLessonCollection',
          '/tmp/phasegate.config.json',
        );

        // Assert
        expect(configRepository.save).toHaveBeenCalledWith(
          '/tmp/phasegate.config.json',
          expect.objectContaining({
            harnesses: {
              agentLessonCollection: true,
            },
          }),
        );
        expect(actual).toEqual({
          feature: 'agentLessonCollection',
          enabled: true,
          configPath: '/tmp/phasegate.config.json',
        });
      });
    });

    context('保存前の再検証でエラーがある場合', () => {
      it('ConfigValidationErrorを送出して保存しないこと', async () => {
        // Arrange
        const document = createMinimalSourceDocument();
        const configRepository: ConfigRepositoryPort = {
          load: vi.fn().mockResolvedValue({
            path: '/tmp/phasegate.config.json',
            document,
          }),
          save: vi.fn().mockResolvedValue(undefined),
        };
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi
            .fn()
            .mockReturnValueOnce([])
            .mockReturnValueOnce([createHarnessError('L1-001', '不正な設定です')]),
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
        const useCase = new EnableFeatureUseCase({
          configRepository,
          schemaValidator,
          featureRegistryPort,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
          featureRegistry: new FeatureRegistry(),
        });

        // Act
        const actual = useCase.execute(
          'agentLessonCollection',
          '/tmp/phasegate.config.json',
        );

        // Assert
        await expect(actual).rejects.toThrowError(ConfigValidationError);
        expect(configRepository.save).not.toHaveBeenCalled();
      });
    });

    context('利用可能ではない機能を指定する場合', () => {
      it('UnsupportedFeatureErrorを送出して保存しないこと', async () => {
        // Arrange
        const document = createMinimalSourceDocument();
        const configRepository: ConfigRepositoryPort = {
          load: vi.fn().mockResolvedValue({
            path: '/tmp/phasegate.config.json',
            document,
          }),
          save: vi.fn().mockResolvedValue(undefined),
        };
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi.fn().mockReturnValue([]),
        };
        const featureRegistryPort: FeatureRegistryPort = {
          listAvailable: vi.fn().mockReturnValue(['agentLessonCollection']),
        };
        const useCase = new EnableFeatureUseCase({
          configRepository,
          schemaValidator,
          featureRegistryPort,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
          featureRegistry: new FeatureRegistry(),
        });

        // Act
        const actual = useCase.execute('deadCodeGC', '/tmp/phasegate.config.json');

        // Assert
        await expect(actual).rejects.toThrowError(UnsupportedFeatureError);
        expect(configRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
