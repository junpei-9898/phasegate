// @layer test
// @unit config-foundation
// @story H04-01
// @work-item-id WI-092 / WI-033
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { HarnessConfigV2 } from '../../../config-foundation/domain/harness-config.js';
import { toValidatorSystemConfig } from '../../../config-foundation/application/mappers/validator-system-config-mapper.js';

function createResolvedConfig(): HarnessConfigV2 {
  return {
    project: {
      name: 'my-project',
      preset: 'standard',
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
        enabled: true,
        validators: ['consistency'],
        coverageThreshold: 80,
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

target('toValidatorSystemConfig', () => {
  describe('resolved configをvalidator-system用configに変換する場合', () => {
    context('L4が無効でvalidator配列が設定されている場合', () => {
      it('L4のvalidator配列と各レイヤーの有効状態が渡されること', () => {
        // Arrange
        const resolvedConfig = createResolvedConfig();

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toEqual({
          project: { preset: 'standard' },
          layers: {
            L2: { enabled: true, validators: ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014'] },
            L3: { enabled: true },
            L4: { enabled: false, validators: ['drift-detector'] },
          },
          validate: { failOnWarning: false },
        });
      });
    });

    context('validate.failOnWarning が true の場合', () => {
      it('failOnWarning=true が validator-system に伝搬すること', () => {
        // Arrange — WI-094 / ADR-017
        const resolvedConfig = createResolvedConfig();
        resolvedConfig.validate = { failOnWarning: true };

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toEqual({
          project: { preset: 'standard' },
          layers: {
            L2: { enabled: true, validators: ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014'] },
            L3: { enabled: true },
            L4: { enabled: false, validators: ['drift-detector'] },
          },
          validate: { failOnWarning: true },
        });
      });
    });

    context('resolved configが取得できない場合', () => {
      it('validator-systemのデフォルト設定に委ねるためundefinedを返すこと', () => {
        // Arrange
        const resolvedConfig = undefined;

        // Act
        const actual = toValidatorSystemConfig(resolvedConfig);

        // Assert
        expect(actual).toBeUndefined();
      });
    });
  });
});
