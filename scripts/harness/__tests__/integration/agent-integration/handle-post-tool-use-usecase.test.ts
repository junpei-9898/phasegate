// @unit agent-integration
// @layer application
// @story H11-03

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HandlePostToolUseUseCase } from '../../../agent-integration/application/usecases/handle-post-tool-use-usecase.js';
import { TimeoutError } from '../../../agent-integration/infrastructure/ports/cli-executor-port.js';

function createHandlePostToolUseUseCase(ports: {
  configQueryPort: { isHookEnabled: ReturnType<typeof vi.fn>; getProtectedFilePatterns: ReturnType<typeof vi.fn>; getProtectedFileExclusions: ReturnType<typeof vi.fn>; getProjectPaths: ReturnType<typeof vi.fn> };
  cliExecutorPort: { execute: ReturnType<typeof vi.fn> };
}) {
  const cliCommandRegistryPort = {
    hasCommand: vi.fn().mockResolvedValue(true),
    listCommands: vi.fn().mockResolvedValue([]),
  };
  return new HandlePostToolUseUseCase({
    configQueryPort: ports.configQueryPort,
    cliExecutorPort: ports.cliExecutorPort,
    cliCommandRegistryPort,
  });
}

function buildPostToolUseInput(overrides: Partial<{
  toolName: string;
  affectedFilePaths: string[];
}> = {}) {
  return {
    toolName: 'str_replace_editor',
    affectedFilePaths: ['src/index.ts'],
    ...overrides,
  };
}

target('HandlePostToolUseUseCase.execute', () => {
  describe('PostToolUse Hook の CLI 実行制御を行う', () => {
    context('Hook 有効かつ CLI が正常終了する場合', () => {
      // IT-UC-HandlePostToolUse-001
      it('PostToolUse Hookが有効な場合、phasegate:lint --fastが実行されること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
          getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
          getProjectPaths: vi.fn().mockReturnValue({ designDocs: 'docs/product/construction', inceptionDocs: 'docs/inception' }),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false }),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.skipReason).toBeUndefined();
        expect(actual.cliResult?.exitCode).toBe(0);
      });
    });

    context('Lint が失敗した場合（exitCode=1）', () => {
      // IT-UC-HandlePostToolUse-002
      it('Lintが失敗した場合（exitCode=1）、executed=trueでcliResult.exitCode=1が返ること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
          getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
          getProjectPaths: vi.fn().mockReturnValue({ designDocs: 'docs/product/construction', inceptionDocs: 'docs/inception' }),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: '', timedOut: false }),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({ toolName: 'str_replace_editor', affectedFilePaths: ['src/bad.ts'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.cliResult?.exitCode).toBe(1);
      });
    });

    context('Hook 無効設定の場合', () => {
      // IT-UC-HandlePostToolUse-003
      it('Hook無効設定の場合、HOOK_DISABLEDでスキップされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(false),
          getProtectedFilePatterns: vi.fn(),
          getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
          getProjectPaths: vi.fn().mockReturnValue({ designDocs: 'docs/product/construction', inceptionDocs: 'docs/inception' }),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(false);
        expect(actual.skipReason).toBe('HOOK_DISABLED');
      });
    });

    context('タイムアウト超過の場合', () => {
      // IT-UC-HandlePostToolUse-004
      it('タイムアウト超過（500ms以上）の場合、TIMEOUT_EXCEEDEDでスキップされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
          getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
          getProjectPaths: vi.fn().mockReturnValue({ designDocs: 'docs/product/construction', inceptionDocs: 'docs/inception' }),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockRejectedValue(new TimeoutError('phasegate:lint', 500)),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(false);
        expect(actual.skipReason).toBe('TIMEOUT_EXCEEDED');
      });
    });

    context('CliExecutorPort が実行エラーをスローした場合', () => {
      // IT-UC-HandlePostToolUse-005
      it('CliExecutorPortが実行エラーをthrowした場合、例外が伝播すること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
          getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
          getProjectPaths: vi.fn().mockReturnValue({ designDocs: 'docs/product/construction', inceptionDocs: 'docs/inception' }),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockRejectedValue(new Error('CLI process error')),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('CLI process error');
      });
    });

    context('affectedFilePathsが空配列の場合', () => {
      // IT-UC-HandlePostToolUse-006
      it('affectedFilePathsが空配列の場合、Hookが正常に実行されること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
          getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
          getProjectPaths: vi.fn().mockReturnValue({ designDocs: 'docs/product/construction', inceptionDocs: 'docs/inception' }),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false }),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({ toolName: 'str_replace_editor', affectedFilePaths: [] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
      });
    });
  });
});
