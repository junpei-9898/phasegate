// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';
import type {
  HarnessConfigResolvedDocument,
  HarnessConfigSourceDocument,
} from '../../../config-foundation/domain/harness-config.js';
import type { ConfigRepositoryPort } from '../../../config-foundation/domain/ports/config-repository-port.js';
import type { ConfigSchemaValidatorPort } from '../../../config-foundation/domain/ports/config-schema-validator-port.js';
import type { PresetDefinition } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { PresetResolutionService } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { LoadResolvedConfigUseCase } from '../../../config-foundation/application/usecases/load-resolved-config-use-case.js';
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

function createMinimalResolvedDocument(): HarnessConfigResolvedDocument {
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
    architecture: {
      preset: 'clean',
      layers: ['domain', 'application', 'infrastructure', 'presentation'],
      allowedDependencies: {
        domain: ['domain'],
        application: ['application', 'domain'],
        infrastructure: ['infrastructure', 'application', 'domain'],
        presentation: ['presentation', 'application', 'domain'],
      },
      metadataTags: { layer: '@layer', unit: '@unit' },
      layerDetection: { byPath: true, byTag: true },
    },
  };
}

function createPresetDefinitions(): Readonly<
  Record<'minimal' | 'standard' | 'strict', PresetDefinition>
> {
  const minimal = createMinimalResolvedDocument();

  return {
    minimal: {
      layers: minimal.layers,
      quickMode: minimal.quickMode,
      phaseDependencies: minimal.phaseDependencies,
      planningMode: minimal.planningMode,
      harnesses: minimal.harnesses,
      paths: minimal.paths,
      reporting: minimal.reporting,
    },
    standard: {
      ...{
        layers: {
          ...minimal.layers,
          L3: {
            enabled: true,
            validators: ['consistency', 'test-quality'],
            coverageThreshold: 90,
          },
        },
      },
      quickMode: minimal.quickMode,
      phaseDependencies: minimal.phaseDependencies,
      planningMode: minimal.planningMode,
      harnesses: minimal.harnesses,
      paths: minimal.paths,
      reporting: minimal.reporting,
    },
    strict: {
      ...{
        layers: {
          ...minimal.layers,
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
      },
      quickMode: minimal.quickMode,
      phaseDependencies: minimal.phaseDependencies,
      planningMode: minimal.planningMode,
      harnesses: {
        agentLessonCollection: true,
        cascadeUpdate: false,
        bundleSizeLimit: 500,
        deadCodeGC: true,
      },
      paths: minimal.paths,
      reporting: minimal.reporting,
    },
  };
}

target('LoadResolvedConfigUseCase', () => {
  describe('execute', () => {
    context('有効な設定ドキュメントを読み込む場合', () => {
      it('解決済み設定DTOと読込元パスを返すこと', async () => {
        // Arrange
        const document = createMinimalSourceDocument();
        const expectedConfig = createMinimalResolvedDocument();
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
        const useCase = new LoadResolvedConfigUseCase({
          configRepository,
          schemaValidator,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
        });

        // Act
        const actual = await useCase.execute('/tmp/phasegate.config.json');

        // Assert
        expect(configRepository.load).toHaveBeenCalledWith('/tmp/phasegate.config.json');
        expect(schemaValidator.validate).toHaveBeenCalledWith(document);
        expect(actual).toEqual({
          config: expectedConfig,
          sourcePath: '/tmp/phasegate.config.json',
          schemaVersion: 'v2',
        });
      });
    });

    context('スキーマエラーがある設定ドキュメントを読み込む場合', () => {
      it('ConfigValidationErrorを送出すること', async () => {
        // Arrange
        const document = createMinimalSourceDocument();
        const schemaErrors = [
          createHarnessError('L1-001', 'project.name が必須です'),
        ];
        const configRepository: ConfigRepositoryPort = {
          load: vi.fn().mockResolvedValue({
            path: '/tmp/phasegate.config.json',
            document,
          }),
          save: vi.fn(),
        };
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi.fn().mockReturnValue(schemaErrors),
        };
        const useCase = new LoadResolvedConfigUseCase({
          configRepository,
          schemaValidator,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
        });

        // Act
        const actual = useCase.execute('/tmp/phasegate.config.json');

        // Assert
        await expect(actual).rejects.toThrowError(ConfigValidationError);
      });
    });
  });
});
