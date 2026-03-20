// @unit agent-integration
// @layer domain
// @story H11-02

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  HookEvent,
  PreToolUseEvent,
  PostToolUseEvent,
  StopEvent,
} from '../../../agent-integration/domain/value-objects/hook-event.js';
import { createPreToolUseEvent, createPostToolUseEvent, createStopEvent } from '../../helpers/test-helpers.js';

target('HookEvent', () => {
  describe('各Unionバリアントを生成する', () => {
    // UT-HE-001
    it('hookType=pre-tool-useのときPreToolUseEventが生成されること', () => {
      // Arrange
      const input = { hookType: 'pre-tool-use' as const, toolName: 'Write', targetFilePaths: ['src/index.ts'] };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(PreToolUseEvent);
    });

    // UT-HE-002
    it('hookType=post-tool-useのときPostToolUseEventが生成されること', () => {
      // Arrange
      const input = { hookType: 'post-tool-use' as const, toolName: 'Write', affectedFilePaths: ['src/index.ts'] };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(PostToolUseEvent);
    });

    // UT-HE-003
    it('hookType=stopのときStopEventが生成されること', () => {
      // Arrange
      const input = { hookType: 'stop' as const, sessionId: 'sess-001' };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(StopEvent);
    });
  });

  describe('等値性を検証する', () => {
    // UT-HE-010
    it('同一プロパティを持つ2つのPreToolUseEventが等値であること', () => {
      // Arrange
      const a = createPreToolUseEvent({ targetFilePaths: ['src/index.ts'] });
      const b = createPreToolUseEvent({ targetFilePaths: ['src/index.ts'] });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-HE-011
    it('hookTypeが異なる2つのHookEventが非等値であること', () => {
      // Arrange
      const a = createPreToolUseEvent();
      const b = createStopEvent();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-HE-012
    it('targetFilePathsの順序が異なる2つのPreToolUseEventが非等値であること', () => {
      // Arrange
      const a = createPreToolUseEvent({ targetFilePaths: ['src/a.ts', 'src/b.ts'] });
      const b = createPreToolUseEvent({ targetFilePaths: ['src/b.ts', 'src/a.ts'] });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('未定義のhookTypeが渡された場合', () => {
    // UT-HE-020
    it('HarnessErrorまたは型エラーがthrowされること', () => {
      // Arrange
      const input = { hookType: 'unknown' };
      // Act
      const actual = () => HookEvent.create(input as never);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('PreToolUseEventのtargetFilePathsが空配列の場合', () => {
    // UT-HE-021
    it('生成が成功すること（空配列は許容）', () => {
      // Arrange
      const input = { hookType: 'pre-tool-use' as const, toolName: 'Write', targetFilePaths: [] };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(PreToolUseEvent);
    });
  });
});
