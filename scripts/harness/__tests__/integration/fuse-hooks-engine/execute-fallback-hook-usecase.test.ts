import { describe, expect, it, vi } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ExecuteFallbackHookUseCase } from '../../../fuse-hooks-engine/application/usecases/execute-fallback-hook-usecase.js';

target('ExecuteFallbackHookUseCase', () => {
  it('IT-HF-018 L1のwriteイベントでfallback handlerが呼ばれること', async () => {
    // Arrange
    const fallbackPort = {
      handlePreWrite: vi.fn().mockResolvedValue(null),
      handlePreRead: vi.fn().mockResolvedValue(null),
    };
    const sut = new ExecuteFallbackHookUseCase(fallbackPort as never);
    // Act
    const actual = await sut.execute({
      filePath: 'src/app.ts',
      eventType: 'write',
      fallbackMode: 'L1',
    });
    // Assert
    expect(actual.action).toBeNull();
    expect(fallbackPort.handlePreWrite).toHaveBeenCalled();
  });
});
