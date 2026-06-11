// @layer test
// @unit config-foundation
// @story H02-01
// @work-item-id WI-212
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AjvConfigSchemaValidator } from '../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js';
import { createValidSourceDocument } from './config-foundation-test-fixtures.js';

target('AjvConfigSchemaValidator project.languages', () => {
  describe('validate: project.languages を検証する', () => {
    context('非空の言語配列が指定されている場合', () => {
      it('設定を valid として扱うこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        (document.project as Record<string, unknown>).languages = ['python', 'go'];

        // Act
        const actual = validator.validate(document as never);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('言語配列が空の場合', () => {
      it('schema validation error を返すこと', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createValidSourceDocument() as unknown as Record<string, unknown>;
        (document.project as Record<string, unknown>).languages = [];

        // Act
        const actual = validator.validate(document as never);

        // Assert
        expect(actual).toEqual([
          expect.objectContaining({
            path: '/project/languages',
            message: expect.stringContaining('project/languages'),
          }),
        ]);
      });
    });
  });
});
