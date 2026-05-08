// @layer test
// @unit config-foundation
// @story H04-01
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { HarnessConfigSourceDocument } from '../../../config-foundation/domain/harness-config.js';
import type { ConfigSchemaValidatorPort } from '../../../config-foundation/domain/ports/config-schema-validator-port.js';
import type { PresetDefinition } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { PresetResolutionService } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { ValidateConfigUseCase } from '../../../config-foundation/application/usecases/validate-config-use-case.js';
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
      validate: { failOnWarning: false },
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
      validate: { failOnWarning: false },
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
      validate: { failOnWarning: false },
    },
  };
}

target('ValidateConfigUseCase', () => {
  describe('execute', () => {
    context('スキーマエラーがある場合', () => {
      it('errorsに詰めてvalid=falseを返すこと', () => {
        // Arrange
        const document = createMinimalSourceDocument();
        const schemaErrors = [
          createHarnessError('L1-001', 'project.name が必須です'),
        ];
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi.fn().mockReturnValue(schemaErrors),
        };
        const useCase = new ValidateConfigUseCase({
          schemaValidator,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
        });

        // Act
        const actual = useCase.execute(document);

        // Assert
        expect(schemaValidator.validate).toHaveBeenCalledWith(document);
        expect(actual).toEqual({
          valid: false,
          errors: schemaErrors,
        });
      });
    });

    context('Preset解決時にドメインエラーが発生する場合', () => {
      it('HarnessErrorへ変換してvalid=falseを返すこと', () => {
        // Arrange
        const document = createMinimalSourceDocument();
        const invalidPresetDefinitions = {
          ...createPresetDefinitions(),
          minimal: {
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
          } as unknown as PresetDefinition,
        };
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi.fn().mockReturnValue([]),
        };
        const useCase = new ValidateConfigUseCase({
          schemaValidator,
          presetDefinitions: invalidPresetDefinitions,
          presetResolutionService: new PresetResolutionService(),
        });

        // Act
        const actual = useCase.execute(document);

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors).toHaveLength(1);
        expect(actual.errors[0]?.code.toString()).toBe('L1-007');
      });
    });

    context('スキーマ検証とPreset解決の両方に問題がない場合', () => {
      it('valid=trueと空のerrorsを返すこと', () => {
        // Arrange
        const document = createMinimalSourceDocument();
        const schemaValidator: ConfigSchemaValidatorPort = {
          validate: vi.fn().mockReturnValue([]),
        };
        const useCase = new ValidateConfigUseCase({
          schemaValidator,
          presetDefinitions: createPresetDefinitions(),
          presetResolutionService: new PresetResolutionService(),
        });

        // Act
        const actual = useCase.execute(document);

        // Assert
        expect(actual).toEqual({
          valid: true,
          errors: [],
        });
      });
    });
  });
});
