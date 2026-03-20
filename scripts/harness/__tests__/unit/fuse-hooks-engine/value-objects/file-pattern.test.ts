import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { FilePattern } from '../../../../fuse-hooks-engine/domain/value-objects/file-pattern.js';

target('FilePattern', () => {
  describe('生成', () => {
    it('UT-HF-014 有効なincludePatternsで生成できること', () => {
      // Arrange / Act
      const actual = FilePattern.create(['**/*.ts']);
      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual._unsafeUnwrap().includePatterns).toEqual(['**/*.ts']);
    });

    it('UT-HF-016 includePatternsが空配列でResult.failが返ること', () => {
      // Arrange / Act
      const actual = FilePattern.create([]);
      // Assert
      expect(actual.isErr()).toBe(true);
      expect(actual._unsafeUnwrapErr().code).toBe('HOOK_EMPTY_INCLUDE_PATTERN');
    });
  });

  describe('test', () => {
    it('UT-HF-018 includeにマッチするとtrueを返すこと', () => {
      // Arrange
      const sut = FilePattern.create(['**/*.ts'])._unsafeUnwrap();
      // Act
      const actual = sut.test('src/app.ts');
      // Assert
      expect(actual).toBe(true);
    });

    it('UT-HF-019 excludeにマッチするとfalseを返すこと', () => {
      // Arrange
      const sut = FilePattern.create(['**/*.ts'], ['**/*.spec.ts'])._unsafeUnwrap();
      // Act
      const actual = sut.test('src/app.spec.ts');
      // Assert
      expect(actual).toBe(false);
    });
  });
});
