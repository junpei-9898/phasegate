// @layer test
import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { createDocumentAge } from '../../../helpers/phase2-extensions-test-factories.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';
import { DocumentAge } from '../../../../phase2-extensions/domain/value-objects/document-age.js';

target('UT-P2-002 DocumentAge', () => {
  context('create()', () => {
    it('ageInDays=0, source="git-log" で正常に生成される', () => {
      // Arrange
      const input = { ageInDays: 0, source: 'git-log' as const };
      // Act
      const actual = DocumentAge.create(input);
      // Assert
      expect(actual.ageInDays).toBe(0);
      expect(actual.source).toBe('git-log');
    });

    it('ageInDays=-1 は Phase2ExtensionsDomainError をスローする', () => {
      // Arrange / Act / Assert
      expect(() => DocumentAge.create({ ageInDays: -1, source: 'git-log' })).toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('isOlderThan(days)', () => {
    it('ageInDays=20, threshold=14 のとき true を返す', () => {
      // Arrange
      const documentAge = createDocumentAge({ ageInDays: 20 });
      // Act
      const actual = documentAge.isOlderThan(14);
      // Assert
      expect(actual).toBe(true);
    });

    it('ageInDays=10, threshold=14 のとき false を返す', () => {
      // Arrange
      const documentAge = createDocumentAge({ ageInDays: 10 });
      // Act
      const actual = documentAge.isOlderThan(14);
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('equals()', () => {
    it('同一フィールドを持つ2つのインスタンスは等値である', () => {
      // Arrange
      const lhs = createDocumentAge();
      const rhs = createDocumentAge();
      // Act
      const actual = lhs.equals(rhs);
      // Assert
      expect(actual).toBe(true);
    });
  });
});
