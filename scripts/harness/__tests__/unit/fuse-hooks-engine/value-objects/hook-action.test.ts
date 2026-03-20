import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { HookAction } from '../../../../fuse-hooks-engine/domain/value-objects/hook-action.js';

target('HookAction', () => {
  describe('生成', () => {
    it('UT-HF-024 block-writeアクションを生成できること', () => {
      // Arrange / Act
      const actual = HookAction.create('block-write', {
        reason: 'Protected file',
        notifyUser: true,
      });
      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual._unsafeUnwrap().actionType).toBe('block-write');
    });

    it('UT-HF-027 不正なactionTypeでResult.failが返ること', () => {
      // Arrange / Act
      const actual = HookAction.create('invalid', {});
      // Assert
      expect(actual.isErr()).toBe(true);
      expect(actual._unsafeUnwrapErr().code).toBe('HOOK_INVALID_ACTION_TYPE');
    });
  });
});
