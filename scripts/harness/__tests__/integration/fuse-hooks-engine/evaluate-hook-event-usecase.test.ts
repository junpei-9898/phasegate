import { describe, expect, it, vi } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { createPreWriteHookDefinition } from '../../unit/fuse-hooks-engine/factories.js';
import { EvaluateHookEventUseCase } from '../../../fuse-hooks-engine/application/usecases/evaluate-hook-event-usecase.js';
import { HookEvaluationService } from '../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';

target('EvaluateHookEventUseCase', () => {
  it('IT-HF-006 mounted状態でblock-writeにマッチするとblocked=trueが返ること', async () => {
    // Arrange
    const shellWrapperPort = { execute: vi.fn() };
    const fallbackHandlerPort = { handlePreWrite: vi.fn(), handlePreRead: vi.fn() };
    const sut = new EvaluateHookEventUseCase(
      fallbackHandlerPort as never,
      shellWrapperPort as never,
      new HookEvaluationService(),
    );
    // Act
    const actual = await sut.execute({
      filePath: '.env',
      eventType: 'write',
      mountStatus: 'mounted',
      definitions: [createPreWriteHookDefinition({ includePatterns: ['**/*.env'] })],
    });
    // Assert
    expect(actual.blocked).toBe(true);
    expect(actual.actions).toHaveLength(1);
    expect(actual.errors).toHaveLength(0);
  });
});
