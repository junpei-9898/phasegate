// @layer test
// @unit nyquist-validation
// @story HF2-05
// @work-item-id WI-222
// @work-item-id WI-292
import { expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AjvJsonSchemaValidatorAdapter } from '../../../../nyquist-validation/infrastructure/adapters/ajv-json-schema-validator-adapter.js';

target('AjvJsonSchemaValidatorAdapter — schema 1.1 binding', () => {
  context('binding フィールドを含む 1.1 マトリクスの場合', () => {
    // @ac AC-6
    it('binding付き1.1マトリクスが検証を通過すること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const matrix = {
        version: '1.1',
        generatedAt: '2026-07-05T00:00:00.000Z',
        stories: [{
          storyId: 'H07-01',
          storyMappings: [{
            acId: 'AC-1',
            testReferences: [{ filePath: 'a.test.ts', testType: 'unit', testName: 't', binding: 'ac' }],
          }],
        }],
      };

      // Act
      const actual = await adapter.validate(matrix);

      // Assert
      expect(actual.valid).toBe(true);
      expect(actual.errors).toEqual([]);
    });
  });

  context('binding フィールドを持たない 1.0 マトリクスの場合', () => {
    // @ac AC-6
    it('binding無し1.0マトリクスが後方互換で検証を通過すること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const matrix = {
        version: '1.0',
        generatedAt: '2026-07-05T00:00:00.000Z',
        stories: [{
          storyId: 'H07-01',
          storyMappings: [{
            acId: 'AC-1',
            testReferences: [{ filePath: 'a.test.ts', testType: 'unit', testName: 't' }],
          }],
        }],
      };

      // Act
      const actual = await adapter.validate(matrix);

      // Assert
      expect(actual.valid).toBe(true);
      expect(actual.errors).toEqual([]);
    });
  });

  context('binding が enum 外の値の場合', () => {
    it('不正なbinding値でvalid=falseになること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const matrix = {
        version: '1.1',
        generatedAt: '2026-07-05T00:00:00.000Z',
        stories: [{
          storyId: 'H07-01',
          storyMappings: [{
            acId: 'AC-1',
            testReferences: [{ filePath: 'a.test.ts', testType: 'unit', binding: 'semantic' }],
          }],
        }],
      };

      // Act
      const actual = await adapter.validate(matrix);

      // Assert
      expect(actual.valid).toBe(false);
    });
  });

  context('coverage lifecycle フィールドを含む 1.2 マトリクスの場合', () => {
    it('planned Story を含む 1.2 マトリクスが検証を通過すること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const matrix = {
        version: '1.2',
        generatedAt: '2026-07-16T00:00:00.000Z',
        stories: [{
          storyId: 'H17-07',
          coverageStatus: 'planned',
          coverageLifecycle: ['planned'],
          storyMappings: [{ acId: 'AC-1', testReferences: [] }],
        }],
      };

      // Act
      const actual = await adapter.validate(matrix);

      // Assert
      expect(actual.valid).toBe(true);
      expect(actual.errors).toEqual([]);
    });

    it('未知の coverage status を拒否すること', async () => {
      // Arrange
      const adapter = new AjvJsonSchemaValidatorAdapter();
      const matrix = {
        version: '1.2',
        generatedAt: '2026-07-16T00:00:00.000Z',
        stories: [{
          storyId: 'H17-07',
          coverageStatus: 'deferred',
          coverageLifecycle: ['deferred'],
          storyMappings: [{ acId: 'AC-1', testReferences: [] }],
        }],
      };

      // Act
      const actual = await adapter.validate(matrix);

      // Assert
      expect(actual.valid).toBe(false);
    });
  });
});
