import { describe, expect, it, vi } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { CompletionGateHandler } from '../../../fuse-hooks-engine/presentation/handlers/completion-gate-handler.js';

target('CompletionGateHandler', () => {
  it('IT-HF-039 gate結果をJSONで返すこと', async () => {
    // Arrange
    const useCase = {
      execute: vi.fn().mockResolvedValue({
        gateStatus: 'passed',
        checkedAt: '2026-03-20T00:00:00.000Z',
        failureReason: null,
        errors: [],
      }),
    };
    const sut = new CompletionGateHandler(useCase as never);
    // Act
    const actual = await sut.handle(['HF1-05', '.harness/done/HF1-05.done']);
    // Assert
    expect(() => JSON.parse(actual.output)).not.toThrow();
  });
});
