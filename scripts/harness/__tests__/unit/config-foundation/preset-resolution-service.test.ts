// @layer test
// @unit config-foundation
// @story H04-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  PresetResolutionService,
  type PresetDefinition,
  InvalidPresetDefinitionError,
  ConfigMergeError,
} from '../../../config-foundation/domain/services/preset-resolution-service.js';
import type {
  HarnessConfigResolvedDocument,
  HarnessConfigSourceDocument,
} from '../../../config-foundation/domain/harness-config.js';
import { FeatureName } from '../../../config-foundation/domain/value-objects/feature-name.js';
import { FeatureToggle } from '../../../config-foundation/domain/value-objects/feature-toggle.js';

const AVAILABLE_FEATURES = [
  'agentLessonCollection',
  'cascadeUpdate',
  'bundleSizeLimit',
  'deadCodeGC',
] as const;

function createFeatureName(name: string): FeatureName {
  return FeatureName.create(name, AVAILABLE_FEATURES);
}

function createPresetResolutionService(): PresetResolutionService {
  return new PresetResolutionService();
}

function createMinimalPresetDefinition(): PresetDefinition {
  return {
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
    validate: {
      failOnWarning: false,
    },
  };
}

function createStandardPresetDefinition(): PresetDefinition {
  const definition = createMinimalPresetDefinition();

  definition.layers.L3 = {
    enabled: true,
    validators: ['consistency', 'test-quality'],
    coverageThreshold: 90,
  };

  return definition;
}

function createStrictPresetDefinition(): PresetDefinition {
  const definition = createStandardPresetDefinition();

  definition.layers.L4 = {
    enabled: true,
    validators: ['drift-detector', 'dead-code-detector'],
    schedule: '0 1 * * *',
  };
  definition.harnesses = {
    agentLessonCollection: true,
    cascadeUpdate: false,
    bundleSizeLimit: 500,
    deadCodeGC: true,
  };

  return definition;
}

function createSourceDocument(
  preset: 'minimal' | 'standard' | 'strict' = 'minimal',
): HarnessConfigSourceDocument {
  return {
    project: {
      name: 'my-project',
      preset,
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

function createResolvedDocument(): HarnessConfigResolvedDocument {
  const presetDefinition = createMinimalPresetDefinition();

  return {
    project: {
      name: 'my-project',
      preset: 'minimal',
      languages: ['typescript'],
    },
    layers: presetDefinition.layers,
    quickMode: presetDefinition.quickMode,
    phaseDependencies: presetDefinition.phaseDependencies,
    planningMode: presetDefinition.planningMode,
    harnesses: presetDefinition.harnesses,
    paths: presetDefinition.paths,
    reporting: presetDefinition.reporting,
    validate: presetDefinition.validate,
  };
}

target('PresetResolutionService', () => {
  describe('resolve', () => {
    // UT-CF-166
    context('minimal presetを解決する場合', () => {
      it('preset定義にsource差分を上書きしたresolvedを返す', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createMinimalPresetDefinition();
        const sourceDocument = createSourceDocument('minimal');
        sourceDocument.harnesses.agentLessonCollection = true;

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.project).toEqual({
          name: 'my-project',
          preset: 'minimal',
          languages: ['typescript'],
        });
        expect(actual.harnesses.agentLessonCollection).toBe(true);
        expect(actual.harnesses.deadCodeGC).toBe(false);
      });
    });

    // UT-CF-167
    context('standard presetを解決する場合', () => {
      it('L3有効かつcoverageThreshold=90になる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createStandardPresetDefinition();
        const sourceDocument = createSourceDocument('standard');

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.layers.L3.enabled).toBe(true);
        expect(actual.layers.L3.coverageThreshold).toBe(90);
      });
    });

    // UT-CF-168
    context('strict presetを解決する場合', () => {
      it('全レイヤーが有効になる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createStrictPresetDefinition();
        const sourceDocument = createSourceDocument('strict');

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.layers.L1.enabled).toBe(true);
        expect(actual.layers.L2.enabled).toBe(true);
        expect(actual.layers.L3.enabled).toBe(true);
        expect(actual.layers.L4.enabled).toBe(true);
      });
    });

    // UT-CF-169
    context('objectフィールドを上書きする場合', () => {
      it('deep mergeされる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createStandardPresetDefinition();
        const sourceDocument = createSourceDocument('standard');
        sourceDocument.layers.L3 = {
          coverageThreshold: 95,
        };

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.layers.L3.enabled).toBe(true);
        expect(actual.layers.L3.validators).toEqual([
          'consistency',
          'test-quality',
        ]);
        expect(actual.layers.L3.coverageThreshold).toBe(95);
      });
    });

    // UT-CF-170
    context('arrayフィールドを上書きする場合', () => {
      it('結合ではなく置換される', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createMinimalPresetDefinition();
        const sourceDocument = createSourceDocument('minimal');
        sourceDocument.layers.L2 = {
          validators: ['custom-validator'],
        };

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.layers.L2.validators).toEqual(['custom-validator']);
      });
    });

    // UT-CF-171
    context('primitiveフィールドを上書きする場合', () => {
      it('source側の値が優先される', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createStandardPresetDefinition();
        const sourceDocument = createSourceDocument('standard');
        sourceDocument.layers.L3 = {
          coverageThreshold: 95,
        };

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.layers.L3.coverageThreshold).toBe(95);
      });
    });

    // UT-CF-172
    context('project.nameとproject.presetを解決する場合', () => {
      it('resolvedDocumentへ反映される', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createStandardPresetDefinition();
        const sourceDocument = createSourceDocument('standard');
        sourceDocument.project.name = 'next-project';

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.project.name).toBe('next-project');
        expect(actual.project.preset).toBe('standard');
      });
    });

    // UT-CF-173
    context('presetDefinitionが欠落している場合', () => {
      it('エラーになる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const sourceDocument = createSourceDocument('minimal');
        const invalidDefinition = {
          quickMode: {},
        } as unknown as PresetDefinition;

        // Act
        const actual = () =>
          presetResolutionService.resolve(sourceDocument, invalidDefinition);

        // Assert
        expect(actual).toThrowError(InvalidPresetDefinitionError);
        expect(actual).toThrowError(/L1-007/);
      });
    });

    // UT-CF-174
    context('deep merge対象の型が衝突する場合', () => {
      it('エラーになる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createMinimalPresetDefinition();
        const sourceDocument = createSourceDocument('minimal');
        const invalidSourceDocument = {
          ...sourceDocument,
          layers: 1,
        } as unknown as HarnessConfigSourceDocument;

        // Act
        const actual = () =>
          presetResolutionService.resolve(invalidSourceDocument, presetDefinition);

        // Assert
        expect(actual).toThrowError(ConfigMergeError);
        expect(actual).toThrowError(/L1-008/);
      });
    });

    // UT-CF-175
    context('standard preset上でcoverageThresholdを95へ上書きする場合', () => {
      it('個別上書きできる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createStandardPresetDefinition();
        const sourceDocument = createSourceDocument('standard');
        sourceDocument.layers.L3 = {
          coverageThreshold: 95,
        };

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.layers.L3.coverageThreshold).toBe(95);
      });
    });

    // UT-CF-176
    context('sourceDocumentが差分を持たない場合', () => {
      it('preset定義がそのまま使われる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const presetDefinition = createMinimalPresetDefinition();
        const sourceDocument = createSourceDocument('minimal');

        // Act
        const actual = presetResolutionService.resolve(
          sourceDocument,
          presetDefinition,
        );

        // Assert
        expect(actual.layers).toEqual(presetDefinition.layers);
        expect(actual.harnesses).toEqual(presetDefinition.harnesses);
        expect(actual.quickMode).toEqual(presetDefinition.quickMode);
      });
    });
  });

  describe('applyFeatureOverride', () => {
    // UT-CF-177
    context('boolean機能をtrueにする場合', () => {
      it('対象フィールドだけtrueになる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const resolvedDocument = createResolvedDocument();
        const featureToggle = FeatureToggle.create(
          createFeatureName('agentLessonCollection'),
          true,
        );

        // Act
        const actual = presetResolutionService.applyFeatureOverride(
          resolvedDocument,
          featureToggle,
        );

        // Assert
        expect(actual.harnesses.agentLessonCollection).toBe(true);
      });
    });

    // UT-CF-178
    context('boolean機能をfalseにする場合', () => {
      it('対象フィールドだけfalseになる', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const resolvedDocument = createResolvedDocument();
        resolvedDocument.harnesses.cascadeUpdate = true;
        const featureToggle = FeatureToggle.create(
          createFeatureName('cascadeUpdate'),
          false,
        );

        // Act
        const actual = presetResolutionService.applyFeatureOverride(
          resolvedDocument,
          featureToggle,
        );

        // Assert
        expect(actual.harnesses.cascadeUpdate).toBe(false);
      });
    });

    // UT-CF-179
    context('bundleSizeLimitを有効化する場合', () => {
      it('既定値500を設定する', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const resolvedDocument = createResolvedDocument();
        const featureToggle = FeatureToggle.create(
          createFeatureName('bundleSizeLimit'),
          true,
        );

        // Act
        const actual = presetResolutionService.applyFeatureOverride(
          resolvedDocument,
          featureToggle,
        );

        // Assert
        expect(actual.harnesses.bundleSizeLimit).toBe(500);
      });
    });

    // UT-CF-180
    context('bundleSizeLimitを無効化する場合', () => {
      it('0を設定する', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const resolvedDocument = createResolvedDocument();
        resolvedDocument.harnesses.bundleSizeLimit = 500;
        const featureToggle = FeatureToggle.create(
          createFeatureName('bundleSizeLimit'),
          false,
        );

        // Act
        const actual = presetResolutionService.applyFeatureOverride(
          resolvedDocument,
          featureToggle,
        );

        // Assert
        expect(actual.harnesses.bundleSizeLimit).toBe(0);
      });
    });

    // UT-CF-181
    context('1機能だけ切り替える場合', () => {
      it('他のharnesses属性は変更しない', () => {
        // Arrange
        const presetResolutionService = createPresetResolutionService();
        const resolvedDocument = createResolvedDocument();
        resolvedDocument.harnesses = {
          agentLessonCollection: false,
          cascadeUpdate: true,
          bundleSizeLimit: 300,
          deadCodeGC: true,
        };
        const featureToggle = FeatureToggle.create(
          createFeatureName('agentLessonCollection'),
          true,
        );

        // Act
        const actual = presetResolutionService.applyFeatureOverride(
          resolvedDocument,
          featureToggle,
        );

        // Assert
        expect(actual.harnesses.agentLessonCollection).toBe(true);
        expect(actual.harnesses.cascadeUpdate).toBe(true);
        expect(actual.harnesses.bundleSizeLimit).toBe(300);
        expect(actual.harnesses.deadCodeGC).toBe(true);
      });
    });
  });
});
