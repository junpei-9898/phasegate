// @layer test
import { beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { ValidatePointersHandler } from '../../../phase2-extensions/presentation/handlers/validate-pointers-handler.js';

target('IT-P2-009 ValidatePointersHandler', () => {
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: ValidatePointersHandler;

  beforeEach(() => {
    useCaseMock = { execute: vi.fn() };
    handler = new ValidatePointersHandler(useCaseMock as never);
  });

  context('handle(args)', () => {
    it('passed=true のとき exitCode=0 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { totalDocuments: 0, totalPointers: 0, brokenPointers: 0, skippedUrlPointers: 0 },
        passed: true,
        errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it('--include-urls が UseCase の includeUrlPointers=true に渡される', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { totalDocuments: 0, totalPointers: 0, brokenPointers: 0, skippedUrlPointers: 0 },
        passed: true,
        errors: [],
      });
      // Act
      await handler.handle(['--include-urls']);
      // Assert
      expect(useCaseMock.execute).toHaveBeenCalledWith(expect.objectContaining({ includeUrlPointers: true }));
    });
  });
});
