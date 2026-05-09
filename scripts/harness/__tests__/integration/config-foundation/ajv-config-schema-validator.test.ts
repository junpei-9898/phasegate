// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AjvConfigSchemaValidator } from '../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js';
import {
  createValidSourceDocument,
  createValidSourceDocumentWithPhasePreset,
} from './config-foundation-test-fixtures.js';

function createStoryReflectionDocument(artifacts: string[]): Record<string, unknown> {
  const document = createValidSourceDocument({
    phaseDependencies: {
      preset: 'full',
      override: false,
      customRules: [],
    },
  }) as unknown as Record<string, unknown>;

  const phaseDependencies = document.phaseDependencies as Record<string, unknown>;
  phaseDependencies.storyReflection = {
    enabled: true,
    mappings: [
      {
        unitId: 'config-foundation',
        artifacts,
      },
    ],
  };

  return document;
}

target('AjvConfigSchemaValidator', () => {
  describe('validate', () => {
    context('有効なv2ドキュメントの場合', () => {
      it('IT-CF-043: 空配列を返すこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument();

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('AJV内部型を外に漏らさない場合', () => {
      it('IT-CF-048: keywordやschemaPathを持たないHarnessErrorへ変換すること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument({
          project: {
            name: 'my-project',
            preset: 'invalid' as never,
          },
        });

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual.every((error) => 'message' in error)).toBe(true);
        expect(actual.every((error) => !('keyword' in (error as object)))).toBe(true);
        expect(actual.every((error) => !('schemaPath' in (error as object)))).toBe(true);
      });
    });

    context('複数箇所が壊れている場合', () => {
      it('IT-CF-050: 複数エラーをまとめて返すこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const { project: _project, ...withoutProject } = createValidSourceDocument();
        const document = {
          ...withoutProject,
          harnesses: {
            bundleSizeLimit: -1,
          },
        };

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(2);
      });
    });

    context('phaseDependencies.preset に新しいプリセットを使う場合', () => {
      it('full を有効値として受け付けること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocumentWithPhasePreset('full');

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });

      it('standard を有効値として受け付けること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocumentWithPhasePreset('standard');

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });

      it('minimal を有効値として受け付けること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocumentWithPhasePreset('minimal');

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });

      it('invalid を無効値として拒否すること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument({
          phaseDependencies: {
            preset: 'invalid' as never,
            override: false,
            customRules: [],
          },
        });

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual.some((error) => 'path' in error && error.path === '/phaseDependencies/preset')).toBe(true);
      });
    });

    context('baseline セクション (ISSUE-007 Wave 1)', () => {
      it('IT-CF-BL-001a: baseline プロパティを省略しても valid', () => {
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument();
        expect(validator.validate(document)).toEqual([]);
      });

      it('IT-CF-BL-001b: baseline.enabled=true + path で valid', () => {
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        document.baseline = { enabled: true, path: '.phasegate/baseline.json' };
        expect(validator.validate(document as never)).toEqual([]);
      });

      it('IT-CF-BL-001c: baseline.enabled が非 boolean で invalid', () => {
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        document.baseline = { enabled: 'yes', path: '.phasegate/baseline.json' };
        const errors = validator.validate(document as never);
        expect(errors.length).toBeGreaterThanOrEqual(1);
      });
    });

    context('preCommit.implementationExtensions (WI-012)', () => {
      it('拡張子配列を持つ設定を有効として扱うこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        document.preCommit = { implementationExtensions: ['.ts', '.py'] };
        // Act
        const actual = validator.validate(document as never);
        // Assert
        expect(actual).toEqual([]);
      });

      it('拡張子配列が空の場合は無効として扱うこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        document.preCommit = { implementationExtensions: [] };
        // Act
        const actual = validator.validate(document as never);
        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(1);
      });
    });

    context('project.paths (ISSUE-007 Wave 8)', () => {
      it('IT-CF-PP-001a: project.paths.source を持つ設定が valid', () => {
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        (document.project as Record<string, unknown>).paths = { source: ['src', 'lib'] };
        expect(validator.validate(document as never)).toEqual([]);
      });

      it('IT-CF-PP-001b: project.paths.source + docs を持つ設定が valid', () => {
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        (document.project as Record<string, unknown>).paths = {
          source: ['backend/src'],
          docs: { construction: 'docs/product/construction', inception: 'docs/inception' },
        };
        expect(validator.validate(document as never)).toEqual([]);
      });

      it('IT-CF-PP-001c: project.paths.source が空配列で invalid', () => {
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        (document.project as Record<string, unknown>).paths = { source: [] };
        const errors = validator.validate(document as never);
        expect(errors.length).toBeGreaterThanOrEqual(1);
      });

      it('IT-CF-PP-001d: project.paths に未知キーで invalid', () => {
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        (document.project as Record<string, unknown>).paths = { source: ['src'], unknown: 'x' };
        const errors = validator.validate(document as never);
        expect(errors.length).toBeGreaterThanOrEqual(1);
      });
    });

    context('phaseDependencies.storyReflection を検証する場合', () => {
      it('省略した既存形式を有効として扱うこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument();

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });

      it('enabled と mappings を持つ形式を有効として扱うこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createStoryReflectionDocument(['logical_design.md', 'domain_model.md']);

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual).toEqual([]);
      });

      it('artifact に空文字が含まれる場合はエラーになること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createStoryReflectionDocument(['logical_design.md', '']);

        // Act
        const actual = validator.validate(document);

        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual.some((error) => 'path' in error && error.path === '/phaseDependencies/storyReflection/mappings/0/artifacts/1')).toBe(true);
      });
    });
  });
});
