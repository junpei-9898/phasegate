// @unit agent-integration
// @layer application
// @story H11-04

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HandleStopUseCase } from '../../../agent-integration/application/usecases/handle-stop-usecase.js';

function createHandleStopUseCase(ports: {
  reentryGuardStatePort: {
    readActive: ReturnType<typeof vi.fn>;
    writeActive: ReturnType<typeof vi.fn>;
    clearActive: ReturnType<typeof vi.fn>;
  };
  cliExecutorPort: { execute: ReturnType<typeof vi.fn> };
}) {
  const configQueryPort = {
    isHookEnabled: vi.fn().mockResolvedValue(true),
    getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
  };
  const cliCommandRegistryPort = {
    hasCommand: vi.fn().mockResolvedValue(true),
    listCommands: vi.fn().mockResolvedValue([]),
  };
  return new HandleStopUseCase({
    reentryGuardStatePort: ports.reentryGuardStatePort,
    cliExecutorPort: ports.cliExecutorPort,
    configQueryPort,
    cliCommandRegistryPort,
  });
}

function buildHandleStopInput(overrides: Partial<{ sessionId: string }> = {}) {
  return {
    sessionId: 'session-001',
    ...overrides,
  };
}

target('HandleStopUseCase.execute', () => {
  describe('Stop Hook の ReentryGuard ライフサイクルと CLI 実行を管理する', () => {
    context('ReentryGuard が非アクティブな場合（通常フロー）', () => {
      // IT-UC-HandleStop-001
      it('ReentryGuardが非アクティブな場合、phasegate:complete-checkが実行されること', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false }),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-001' });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.skipReason).toBeUndefined();
        expect(actual.cliResult?.exitCode).toBe(0);
      });

      // IT-UC-HandleStop-002
      it('complete-check成功後にdeactivateが呼ばれること（フラグがクリアされること）', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false }),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-002' });

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockReentryGuardStatePort.clearActive).toHaveBeenCalledOnce();
      });
    });

    context('ReentryGuard がアクティブな場合（再入フロー）', () => {
      // IT-UC-HandleStop-003
      it('ReentryGuardがアクティブな場合（再入）、REENTRY_DETECTEDでスキップされること', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(true),
          writeActive: vi.fn(),
          clearActive: vi.fn(),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-003' });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(false);
        expect(actual.skipReason).toBe('REENTRY_DETECTED');
      });
    });

    context('CLI が exitCode=1 で終了した場合（finally 保証）', () => {
      // IT-UC-HandleStop-004
      it('complete-checkがFail（exitCode=1）でも、deactivateが必ず呼ばれること（try/finally保証）', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: '', timedOut: false }),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-004' });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.cliResult?.exitCode).toBe(1);
        expect(mockReentryGuardStatePort.clearActive).toHaveBeenCalledOnce();
      });
    });

    context('CLI 実行中に例外が発生した場合（finally 保証）', () => {
      // IT-UC-HandleStop-005
      it('CLI実行中に例外が発生した場合でも、deactivateが必ず呼ばれること（finally保証）', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockRejectedValue(new Error('unexpected CLI error')),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-005' });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('unexpected CLI error');
        expect(mockReentryGuardStatePort.clearActive).toHaveBeenCalledOnce();
      });
    });

    context('sessionId が空文字の場合', () => {
      // IT-UC-HandleStop-006
      it('sessionIdが空文字の場合、バリデーションエラーになること', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn(),
          writeActive: vi.fn(),
          clearActive: vi.fn(),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: '' });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow();
      });
    });

    context('writeActive（activate）が失敗した場合', () => {
      // IT-UC-HandleStop-007
      it('writeActive（activate）が失敗した場合、エラーが伝播してdeactivateは呼ばれないこと', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockRejectedValue(new Error('write failed')),
          clearActive: vi.fn(),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-007' });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('write failed');
        expect(mockReentryGuardStatePort.clearActive).not.toHaveBeenCalled();
      });
    });
  });
});
