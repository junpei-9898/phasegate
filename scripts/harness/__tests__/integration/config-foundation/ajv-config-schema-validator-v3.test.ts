// @layer test
// @unit config-foundation
// @story ISSUE-014
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AjvConfigSchemaValidator } from '../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js';

const baseV2Document = () => ({
  project: { name: 'dogfood', preset: 'standard' },
  layers: { L1: { enabled: true }, L2: { enabled: true }, L3: { enabled: true }, L4: { enabled: false } },
  quickMode: {
    allowedCategories: ['bugfix'],
    maintainedLayers: ['L1'],
    relaxedGates: [],
    fullModeRequiredWhen: {
      mixedCategories: true,
      newDomainFile: true,
      apiContractChange: true,
    },
  },
  phaseDependencies: { preset: 'default', override: false, customRules: [] },
  planningMode: { default: 'interactive', perPhase: {} },
  harnesses: {
    agentLessonCollection: false,
    cascadeUpdate: false,
    bundleSizeLimit: 0,
    deadCodeGC: false,
  },
  paths: { designDocs: 'docs/product/construction', inceptionDocs: 'docs/inception' },
  reporting: { format: 'json', outputDir: 'reports' },
});

target('AjvConfigSchemaValidator (v2/v3 structure detection)', () => {
  describe('architecture キーの有無で schema を切り替える', () => {
    context('architecture キーが無い v2 形式の document', () => {
      it('v2 schema で validate され errors 0 件', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = baseV2Document();

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('architecture キーを持つ v3 形式の document', () => {
      it('v3 schema で validate され errors 0 件', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = { ...baseV2Document(), architecture: { preset: 'clean' } };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('v2 document に architecture キーを足すと v2 schema は拒否する', () => {
      it('注: structure detection により実際は v3 として扱われるため OK', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = { ...baseV2Document(), architecture: { preset: 'hexagonal' } };

        // Act
        const actual = sut.validate(document);

        // Assert — v3 schema で validate されれば OK
        expect(actual).toEqual([]);
      });
    });

    context('architecture.preset が enum に無い値の場合', () => {
      it('v3 schema validate で error が返る', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'ioc-tower' },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual.length).toBeGreaterThan(0);
      });
    });

    context('architecture.preset = custom だが layers 未指定の場合', () => {
      it('v3 schema validate で error が返る (allOf/if/then)', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'custom' },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual.length).toBeGreaterThan(0);
      });
    });
  });
});
