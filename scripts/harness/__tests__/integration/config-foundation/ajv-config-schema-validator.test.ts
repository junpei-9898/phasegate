import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AjvConfigSchemaValidator } from '../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js';
import { createValidSourceDocument } from './config-foundation-test-fixtures.js';

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
  });
});
