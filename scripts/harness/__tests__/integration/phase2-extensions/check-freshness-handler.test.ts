import { beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { CheckFreshnessHandler } from '../../../phase2-extensions/presentation/handlers/check-freshness-handler.js';

target('IT-P2-008 CheckFreshnessHandler', () => {
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: CheckFreshnessHandler;

  beforeEach(() => {
    useCaseMock = { execute: vi.fn() };
    handler = new CheckFreshnessHandler(useCaseMock as never);
  });

  context('handle(args)', () => {
    it('summary.error=0 のとき exitCode=0 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 1, ok: 1, warn: 0, error: 0 },
        errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it('--pattern 引数が UseCase の targetPattern に渡される', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warn: 0, error: 0 },
        errors: [],
      });
      // Act
      await handler.handle(['--pattern', 'docs/adr/**/*.md']);
      // Assert
      expect(useCaseMock.execute).toHaveBeenCalledWith(expect.objectContaining({ targetPattern: 'docs/adr/**/*.md' }));
    });
  });
});
