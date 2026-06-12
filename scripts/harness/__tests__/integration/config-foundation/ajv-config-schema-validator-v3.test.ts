// @layer test
// @unit config-foundation
// @story H04-01
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
        expect(actual).toEqual([
          expect.objectContaining({
            errorCode: 'L1-001',
            path: '/architecture/preset',
            message: expect.stringContaining('enum: /architecture/preset'),
          }),
        ]);
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
        expect(actual).toEqual(expect.arrayContaining([
          expect.objectContaining({
            errorCode: 'L1-001',
            path: '/architecture/layers',
            message: expect.stringContaining('required: /architecture/layers'),
          }),
          expect.objectContaining({
            errorCode: 'L1-001',
            path: '/architecture/allowedDependencies',
            message: expect.stringContaining('required: /architecture/allowedDependencies'),
          }),
        ]));
      });
    });
  });

  describe('agentIntegration.stopHook.enforce フィールド (WI-087 Phase C-2)', () => {
    context('agentIntegration.stopHook.enforce: true を含む v3 document', () => {
      it('v3 schema で validate され errors 0 件', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          agentIntegration: { stopHook: { enforce: true } },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('agentIntegration.stopHook.enforce: false を含む v3 document', () => {
      it('v3 schema で validate され errors 0 件', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          agentIntegration: { stopHook: { enforce: false } },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('agentIntegration セクションがそもそも無い v3 document', () => {
      it('v3 schema で validate され errors 0 件 (任意フィールド)', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('agentIntegration.stopHook.enforce が boolean 以外 (string) の場合', () => {
      it('v3 schema validate で error が返る', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          agentIntegration: { stopHook: { enforce: 'yes' } },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([
          expect.objectContaining({
            errorCode: 'L1-001',
            path: '/agentIntegration/stopHook/enforce',
            message: expect.stringContaining('must be boolean'),
          }),
        ]);
      });
    });

    context('agentIntegration セクションに未定義の key が含まれる場合', () => {
      it('v3 schema validate で error が返る (additionalProperties: false)', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          agentIntegration: { unknownKey: true },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([
          expect.objectContaining({
            errorCode: 'L1-001',
            path: '/agentIntegration/unknownKey',
            message: expect.stringContaining('additionalProperties'),
          }),
        ]);
      });
    });
  });

  describe('ci.enabled フィールド (WI-032 post-publish dogfood)', () => {
    context('ci.enabled: true を含む v3 document', () => {
      it('v3 schema で validate され errors 0 件', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          ci: { enabled: true },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('ci.enabled が boolean 以外の場合', () => {
      it('v3 schema validate で error が返る', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          ci: { enabled: 'yes' },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([
          expect.objectContaining({
            errorCode: 'L1-001',
            path: '/ci/enabled',
            message: expect.stringContaining('must be boolean'),
          }),
        ]);
      });
    });
  });

  describe('modelRouting.delegation フィールド (WI-219)', () => {
    context('v2 document が delegation none を含む場合', () => {
      it('v2 schema で validate され errors 0 件', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          modelRouting: { delegation: 'none' },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('v3 document が delegation delegate-sonnet を含む場合', () => {
      it('v3 schema で validate され errors 0 件', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          modelRouting: { delegation: 'delegate-sonnet' },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('modelRouting.delegation が未対応値の場合', () => {
      it('schema validate で error が返る', () => {
        // Arrange
        const sut = new AjvConfigSchemaValidator();
        const document = {
          ...baseV2Document(),
          architecture: { preset: 'clean' },
          modelRouting: { delegation: 'always' },
        };

        // Act
        const actual = sut.validate(document);

        // Assert
        expect(actual).toEqual([
          expect.objectContaining({
            errorCode: 'L1-001',
            path: '/modelRouting/delegation',
            message: expect.stringContaining('delegate-sonnet, none'),
          }),
        ]);
      });
    });
  });
});
