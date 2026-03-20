import { describe, expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { HookType } from '../../../../fuse-hooks-engine/domain/value-objects/hook-type.js';

target('HookType', () => {
  describe('生成', () => {
    it('UT-HF-001 pre-writeで生成できること', () => {
      // Arrange / Act
      const actual = HookType.create('pre-write');
      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual._unsafeUnwrap().value).toBe('pre-write');
    });

    it('UT-HF-005 不正な値でResult.failが返ること', () => {
      // Arrange / Act
      const actual = HookType.create('invalid');
      // Assert
      expect(actual.isErr()).toBe(true);
      expect(actual._unsafeUnwrapErr().code).toBe('HOOK_INVALID_TYPE');
    });
  });

  describe('matchesEvent', () => {
    context('hookType=pre-readのとき', () => {
      it('UT-HF-009 readイベントにマッチすること', () => {
        // Arrange
        const sut = HookType.create('pre-read')._unsafeUnwrap();
        // Act
        const actual = sut.matchesEvent('read');
        // Assert
        expect(actual).toBe(true);
      });
    });

    context('hookType=on-completeのとき', () => {
      it('UT-HF-010 writeイベントにマッチすること', () => {
        // Arrange
        const sut = HookType.create('on-complete')._unsafeUnwrap();
        // Act
        const actual = sut.matchesEvent('write');
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
