// @unit agent-integration
// @layer domain
// @story H11-02

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HookToCliTranslator } from '../../../agent-integration/domain/services/hook-to-cli-translator.js';
import { CommandNotRegisteredError } from '../../../agent-integration/domain/services/hook-to-cli-translator.js';
import {
  createPreToolUseEvent,
  createPostToolUseEvent,
  createStopEvent,
  createProtectedFileList,
} from '../../helpers/test-helpers.js';

/** ポートモックビルダー */
const buildTranslatorPorts = (overrides: {
  isEnabled?: boolean;
  isActive?: boolean;
  commandExists?: boolean;
  protectedPatterns?: string[];
} = {}) => {
  const {
    isEnabled = true,
    isActive = false,
    commandExists = true,
    protectedPatterns = ['biome.json', 'tsconfig.json'],
  } = overrides;

  const configQueryPort = {
    isEnabled: vi.fn().mockReturnValue(isEnabled),
    getProtectedFileList: vi.fn().mockReturnValue(createProtectedFileList(protectedPatterns)),
  };
  const reentryGuardStatePort = {
    isActive: vi.fn().mockReturnValue(isActive),
  };
  const cliCommandRegistryPort = {
    has: vi.fn().mockReturnValue(commandExists),
    get: vi.fn().mockReturnValue(commandExists ? 'harness:lint' : undefined),
  };

  return { configQueryPort, reentryGuardStatePort, cliCommandRegistryPort };
};

target('HookToCliTranslator', () => {
  target('translate()', () => {
    describe('PreToolUseEventを変換する', () => {
      // UT-HTC-001
      it('protectedファイルに一致するtargetFilePathsのとき shouldBlock=true を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ protectedPatterns: ['biome.json'] });
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: ['biome.json'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.cliCommand).toBeUndefined();
      });

      // UT-HTC-002
      it('protectedファイルに一致しないtargetFilePathsのとき shouldBlock=false を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ protectedPatterns: ['biome.json'] });
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: ['src/app.ts'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
      });

      // UT-HTC-003
      it('targetFilePathsの1件がprotectedに一致するとき shouldBlock=true を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ protectedPatterns: ['biome.json'] });
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: ['src/app.ts', 'biome.json'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(true);
      });

      // UT-HTC-004 / UT-BV-008
      it('targetFilePathsが空配列のとき shouldBlock=false を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts();
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: [] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
      });
    });

    describe('PostToolUseEventを変換する', () => {
      // UT-HTC-010
      it('hook有効のとき cliCommand=harness:lint のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isEnabled: true });
        const sut = new HookToCliTranslator(ports);
        const event = createPostToolUseEvent({ affectedFilePaths: ['src/app.ts'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.cliCommand).toBe('harness:lint');
        expect(actual.expectedExitCode).toBe(0);
      });

      // UT-HTC-011 / UT-BV-009
      it('hook無効のとき skipReason=HOOK_DISABLED のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isEnabled: false });
        const sut = new HookToCliTranslator(ports);
        const event = createPostToolUseEvent({ affectedFilePaths: ['src/app.ts'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.skipReason).toBe('HOOK_DISABLED');
      });
    });

    describe('StopEventを変換する', () => {
      // UT-HTC-020
      it('ReentryGuard非active時に cliCommand=harness:complete-check のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isActive: false });
        const sut = new HookToCliTranslator(ports);
        const event = createStopEvent('sess-001');
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.cliCommand).toBe('harness:complete-check');
        expect(actual.cliArgs).toEqual([]);
        expect(actual.expectedExitCode).toBe(0);
      });

      // UT-HTC-021 / UT-BV-010
      it('ReentryGuard active時に skipReason=REENTRY_DETECTED のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isActive: true });
        const sut = new HookToCliTranslator(ports);
        const event = createStopEvent('sess-001');
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.skipReason).toBe('REENTRY_DETECTED');
      });
    });

    context('CliCommandRegistryPortに未登録コマンドが指定された場合', () => {
      // UT-HTC-030
      it('HarnessErrorがthrowされること（コマンド未登録エラー）', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isEnabled: true, commandExists: false });
        const sut = new HookToCliTranslator(ports);
        const event = createPostToolUseEvent();
        // Act
        const actual = () => sut.translate(event);
        // Assert
        expect(actual).toThrow(CommandNotRegisteredError);
      });
    });
  });
});
