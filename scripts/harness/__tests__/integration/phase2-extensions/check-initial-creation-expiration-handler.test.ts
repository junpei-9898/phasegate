// @layer test
// @unit phase2-extensions
// @story HF2-04
import { beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { CheckInitialCreationExpirationHandler } from '../../../phase2-extensions/presentation/handlers/check-initial-creation-expiration-handler.js';

target('IT-P2-058〜061 CheckInitialCreationExpirationHandler', () => {
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: CheckInitialCreationExpirationHandler;

  beforeEach(() => {
    useCaseMock = { execute: vi.fn() };
    handler = new CheckInitialCreationExpirationHandler(useCaseMock as never);
  });

  context('handle(args)', () => {
    it('warn=0 のとき exitCode=0 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 1, ok: 1, warn: 0 },
        warnings: [],
        errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it('warn>=1 でも error=0 なら exitCode=0 (warn 固定)', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 3, ok: 0, warn: 3 },
        warnings: [
          { code: 'L4-231', severity: 'warning', message: 'm1', suggestion: 's' },
          { code: 'L4-231', severity: 'warning', message: 'm2', suggestion: 's' },
          { code: 'L4-231', severity: 'warning', message: 'm3', suggestion: 's' },
        ],
        errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it('UseCase が errors を返すとき exitCode=1', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warn: 0 },
        warnings: [],
        errors: [{ code: 'L4-299', severity: 'error', message: 'config broken', suggestion: 's' }],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(1);
    });

    it('--format=json で JSON 出力になる', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warn: 0 },
        warnings: [],
        errors: [],
      });
      // Act
      const actual = await handler.handle(['--format', 'json']);
      // Assert
      expect(() => JSON.parse(actual.stdout)).not.toThrow();
      const parsed = JSON.parse(actual.stdout);
      expect(parsed.summary).toBeDefined();
      expect(parsed.results).toEqual([]);
    });
  });
});
