import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import {
  createAllowReadAction,
  createBlockWriteAction,
  createFilePattern,
  createHookType,
  createTriggerCompletionAction,
} from '../factories.js';
import { HookDefinition } from '../../../../fuse-hooks-engine/domain/aggregates/hook-definition.js';

target('HookDefinition', () => {
  describe('生成', () => {
    it('UT-HF-059 pre-readにblock-writeを割り当てると失敗すること', () => {
      // Arrange / Act
      const actual = HookDefinition.create(
        createHookType('pre-read'),
        createFilePattern(),
        createBlockWriteAction(),
      );
      // Assert
      expect(actual.isErr()).toBe(true);
      expect(actual._unsafeUnwrapErr().code).toBe('HOOK_ACTION_TYPE_MISMATCH');
    });

    it('UT-HF-060 on-completeにtrigger-completion-checkを割り当てると生成できること', () => {
      // Arrange / Act
      const actual = HookDefinition.create(
        createHookType('on-complete'),
        createFilePattern({ includePatterns: ['.harness/done/*.done'] }),
        createTriggerCompletionAction(),
      );
      // Assert
      expect(actual.isOk()).toBe(true);
    });
  });

  describe('matches', () => {
    it('UT-HF-064 eventTypeとfilePathの両方が一致するとtrueを返すこと', () => {
      // Arrange
      const sut = HookDefinition.create(
        createHookType('pre-read'),
        createFilePattern({ includePatterns: ['docs/**'] }),
        createAllowReadAction(),
      )._unsafeUnwrap();
      // Act
      const actual = sut.matches('docs/spec.md', 'read');
      // Assert
      expect(actual).toBe(true);
    });
  });
});
