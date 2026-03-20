import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { createFilePathPointer, createUrlPointer } from '../../../helpers/phase2-extensions-test-factories.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';
import { Pointer } from '../../../../phase2-extensions/domain/value-objects/pointer.js';

target('UT-P2-003 Pointer', () => {
  context('create()', () => {
    it('type="file-path" で正常に生成される', () => {
      // Arrange
      const input = { type: 'file-path' as const, rawText: '[設計](docs/design.md)', target: 'docs/design.md' };
      // Act
      const actual = Pointer.create(input);
      // Assert
      expect(actual.type).toBe('file-path');
      expect(actual.target).toBe('docs/design.md');
    });

    it('rawText が空文字のとき Phase2ExtensionsDomainError をスローする', () => {
      // Arrange / Act / Assert
      expect(() => Pointer.create({ type: 'file-path', rawText: '', target: 'docs/design.md' })).toThrow(
        Phase2ExtensionsDomainError,
      );
    });
  });

  context('isFilePath() / isUrl()', () => {
    it('file-path ポインタに対して isFilePath() は true を返す', () => {
      // Arrange
      const pointer = createFilePathPointer();
      // Act
      const actual = pointer.isFilePath();
      // Assert
      expect(actual).toBe(true);
    });

    it('url ポインタに対して isUrl() は true を返す', () => {
      // Arrange
      const pointer = createUrlPointer();
      // Act
      const actual = pointer.isUrl();
      // Assert
      expect(actual).toBe(true);
    });
  });
});
