// @layer test
import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CheckAcCoverageGateHandler } from '../../../../nyquist-validation/presentation/handlers/check-ac-coverage-gate-handler.js';
import { createValidFullCoverageMatrixData } from '../nyquist-validation-test-fixtures.js';

target('CheckAcCoverageGateHandler', () => {
  context('正常系を検証する場合', () => {
    it('全AC網羅済みのmatrixではexitCode=0を返すこと', async () => {
      // Arrange
      const handler = new CheckAcCoverageGateHandler({
        checkAcCoverageGateUseCase: {
          execute: vi.fn().mockResolvedValue({
            passed: true,
            errors: [],
            matrix: createValidFullCoverageMatrixData(),
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/full-coverage.json', format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.output).toContain('passed');
    });

    it('json形式ではJSON文字列が返ること', async () => {
      // Arrange
      const handler = new CheckAcCoverageGateHandler({
        checkAcCoverageGateUseCase: {
          execute: vi.fn().mockResolvedValue({
            passed: true,
            errors: [],
            matrix: createValidFullCoverageMatrixData(),
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/full.json', format: 'json' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.output)).toMatchObject({ passed: true });
    });
  });

  context('異常系を検証する場合', () => {
    it('未カバーACがある場合、exitCode=1を返すこと', async () => {
      // Arrange
      const handler = new CheckAcCoverageGateHandler({
        checkAcCoverageGateUseCase: {
          execute: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: 'L3-004', message: 'AC not covered: H07-01.AC-4', severity: 'error' }],
            matrix: null,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/partial-coverage.json', format: 'json' });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(JSON.parse(actual.output)).toMatchObject({ passed: false });
    });

    it('UseCaseが例外を投げた場合、exitCode=2を返すこと', async () => {
      // Arrange
      const handler = new CheckAcCoverageGateHandler({
        checkAcCoverageGateUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/not-found.json', format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('ENOENT');
    });

    it('スキーマエラーがある場合、exitCode=1を返すこと', async () => {
      // Arrange
      const handler = new CheckAcCoverageGateHandler({
        checkAcCoverageGateUseCase: {
          execute: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: 'L3-004', message: 'schema error', severity: 'error' }],
            matrix: null,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/invalid-schema.json', format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.output).toContain('L3-004');
    });
  });
});

// @story-id H08-07