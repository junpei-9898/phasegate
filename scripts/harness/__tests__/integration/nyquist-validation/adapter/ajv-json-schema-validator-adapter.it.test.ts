import { expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AjvJsonSchemaValidatorAdapter } from '../../../../nyquist-validation/infrastructure/adapters/ajv-json-schema-validator-adapter.js';
import { createValidFullCoverageMatrixData } from '../nyquist-validation-test-fixtures.js';

target('AjvJsonSchemaValidatorAdapter', () => {
  context('validateメソッドによるJSONスキーマ検証を行う場合', () => {
    it('有効なmatrixオブジェクトを渡すと、valid=trueかつerrorsが空配列で返ること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();

      // Act
      const actual = await adapter.validate(createValidFullCoverageMatrixData());

      // Assert
      expect(actual.valid).toBe(true);
      expect(actual.errors).toEqual([]);
    });

    it('storiesフィールドが欠損したオブジェクトを渡すと、valid=falseかつerrorsにL3-004エラーが含まれること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();

      // Act
      const actual = await adapter.validate({ version: '1.0.0', generatedAt: '2026-03-19T00:00:00.000Z' });

      // Assert
      expect(actual.valid).toBe(false);
      expect(actual.errors[0]?.code).toBe('L3-004');
    });

    it('storyIdが不正形式のオブジェクトを渡すと、patternエラーが含まれること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const invalidStoryId = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [{ storyId: 'INVALID-FORMAT', storyMappings: [] }],
      };

      // Act
      const actual = await adapter.validate(invalidStoryId);

      // Assert
      expect(actual.valid).toBe(false);
      expect(actual.errors.some((error) => error.message.includes('形式'))).toBe(true);
    });

    it('testTypeが許容外の場合、enumエラーが含まれること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const invalidTestType = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [{
          storyId: 'H07-01',
          storyMappings: [{ acId: 'AC-1', testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'e2e', testName: 'test' }] }],
        }],
      };

      // Act
      const actual = await adapter.validate(invalidTestType);

      // Assert
      expect(actual.valid).toBe(false);
      expect(actual.errors.some((error) => error.message.includes('許容値'))).toBe(true);
    });

    it('filePathが空文字の場合、valid=falseになること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const emptyFilePath = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [{
          storyId: 'H07-01',
          storyMappings: [{ acId: 'AC-1', testReferences: [{ filePath: '', testType: 'it', testName: 'test' }] }],
        }],
      };

      // Act
      const actual = await adapter.validate(emptyFilePath);

      // Assert
      expect(actual.valid).toBe(false);
    });

    it('acIdがAC-0の場合、patternエラーが含まれること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const invalidAcId = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [{ storyId: 'H07-01', storyMappings: [{ acId: 'AC-0', testReferences: [] }] }],
      };

      // Act
      const actual = await adapter.validate(invalidAcId);

      // Assert
      expect(actual.valid).toBe(false);
      expect(actual.errors.some((error) => error.message.includes('形式'))).toBe(true);
    });

    it('複数フィールドが同時に不正な場合、全エラーが一括でerrorsに格納されること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const multipleErrors = {
        version: '1.0.0',
        generatedAt: '2026-03-19T00:00:00.000Z',
        stories: [{
          storyId: 'BAD-FORMAT',
          storyMappings: [{ acId: 'AC-0', testReferences: [{ filePath: '', testType: 'e2e', testName: 'test' }] }],
        }],
      };

      // Act
      const actual = await adapter.validate(multipleErrors);

      // Assert
      expect(actual.valid).toBe(false);
      expect(actual.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('nullを渡すと、valid=falseかつtypeエラーが含まれること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();

      // Act
      const actual = await adapter.validate(null);

      // Assert
      expect(actual.valid).toBe(false);
      expect(actual.errors.some((error) => error.message.includes('型'))).toBe(true);
    });
  });
});

// @story-id H08-07