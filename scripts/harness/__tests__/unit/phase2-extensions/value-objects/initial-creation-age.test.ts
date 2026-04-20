// @layer test
// @unit phase2-extensions
// @story HF2-04
import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { Phase2ExtensionsDomainError } from '../../../../phase2-extensions/domain/errors/phase2-extensions-domain-error.js';
import {
  InitialCreationAge,
  type InitialCreationAgeSource,
} from '../../../../phase2-extensions/domain/value-objects/initial-creation-age.js';

target('UT-P2-079〜082 InitialCreationAge', () => {
  context('create()', () => {
    it('正常値で生成される', () => {
      // Arrange
      const input = { ageInDays: 30, commitCount: 3, source: 'git-log' as const };

      // Act
      const actual = InitialCreationAge.create(input);

      // Assert
      expect(actual.ageInDays).toBe(30);
      expect(actual.commitCount).toBe(3);
      expect(actual.source).toBe('git-log');
    });

    it('ageInDays=-1 は Phase2ExtensionsDomainError をスローする', () => {
      // Arrange
      const input = { ageInDays: -1, commitCount: 1, source: 'git-log' as const };

      // Act
      const actual = () => InitialCreationAge.create(input);

      // Assert
      expect(actual).toThrow(Phase2ExtensionsDomainError);
    });

    it('commitCount=0 は Phase2ExtensionsDomainError をスローする', () => {
      // Arrange
      const input = { ageInDays: 0, commitCount: 0, source: 'git-log' as const };

      // Act
      const actual = () => InitialCreationAge.create(input);

      // Assert
      expect(actual).toThrow(Phase2ExtensionsDomainError);
    });

    it('source が不正な値のとき Phase2ExtensionsDomainError をスローする', () => {
      // Arrange
      const input = {
        ageInDays: 0,
        commitCount: 1,
        source: 'invalid' as unknown as InitialCreationAgeSource,
      };

      // Act
      const actual = () => InitialCreationAge.create(input);

      // Assert
      expect(actual).toThrow(Phase2ExtensionsDomainError);
    });
  });
});
