import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { MagicFile } from '../../../../fuse-hooks-engine/domain/value-objects/magic-file.js';

target('MagicFile', () => {
  describe('生成', () => {
    it('UT-HF-032 相対パスで生成できること', () => {
      // Arrange / Act
      const actual = MagicFile.create('.harness/done/HF1-05.done', ['status']);
      // Assert
      expect(actual.isOk()).toBe(true);
    });

    it('UT-HF-033 絶対パスでResult.failが返ること', () => {
      // Arrange / Act
      const actual = MagicFile.create('/tmp/HF1-05.done');
      // Assert
      expect(actual.isErr()).toBe(true);
      expect(actual._unsafeUnwrapErr().code).toBe('MAGIC_FILE_ABSOLUTE_PATH');
    });
  });
});
