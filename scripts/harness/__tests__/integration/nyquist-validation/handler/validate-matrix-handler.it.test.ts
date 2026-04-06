// @layer test
import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ValidateMatrixHandler } from '../../../../nyquist-validation/presentation/handlers/validate-matrix-handler.js';
import { createValidFullCoverageMatrixData } from '../nyquist-validation-test-fixtures.js';

target('ValidateMatrixHandler', () => {
  context('正常系を検証する場合', () => {
    it('成功時はhuman形式の出力とexitCode=0を返すこと', async () => {
      // Arrange
      const handler = new ValidateMatrixHandler({
        validateMatrixUseCase: {
          execute: vi.fn().mockResolvedValue({
            passed: true,
            errors: [],
            schemaErrors: [],
            integrityErrors: [],
            validatedData: createValidFullCoverageMatrixData(),
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/valid.json', failFast: false, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.output).toContain('passed');
    });

    it('json形式を指定すると、JSON形式のValidateMatrixOutputが返ること', async () => {
      // Arrange
      const outputData = {
        passed: true,
        errors: [],
        schemaErrors: [],
        integrityErrors: [],
        validatedData: createValidFullCoverageMatrixData(),
      };
      const handler = new ValidateMatrixHandler({
        validateMatrixUseCase: { execute: vi.fn().mockResolvedValue(outputData) } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/valid.json', failFast: false, format: 'json' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.output)).toMatchObject({ passed: true });
    });
  });

  context('異常系を検証する場合', () => {
    it('スキーマエラーがある場合、エラー一覧とexitCode=1を返すこと', async () => {
      // Arrange
      const handler = new ValidateMatrixHandler({
        validateMatrixUseCase: {
          execute: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: 'L3-004', message: 'schema error', severity: 'error' }],
            schemaErrors: [{ code: 'L3-004', message: 'schema error', severity: 'error' }],
            integrityErrors: [],
            validatedData: null,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/invalid-schema.json', failFast: false, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.output).toContain('L3-004');
    });

    it('failFast=trueを渡すと、UseCaseへfailFast=trueが伝播すること', async () => {
      // Arrange
      const execute = vi.fn().mockResolvedValue({
        passed: false,
        errors: [{ code: 'L3-004', message: 'first schema error', severity: 'error' }],
        schemaErrors: [{ code: 'L3-004', message: 'first schema error', severity: 'error' }],
        integrityErrors: [],
        validatedData: null,
      });
      const handler = new ValidateMatrixHandler({ validateMatrixUseCase: { execute } as never });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/invalid.json', failFast: true, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(execute).toHaveBeenCalledWith(expect.objectContaining({ failFast: true }));
    });

    it('UseCaseが例外を投げた場合、実行エラーとexitCode=2を返すこと', async () => {
      // Arrange
      const handler = new ValidateMatrixHandler({
        validateMatrixUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/not-found.json', failFast: false, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('ENOENT');
    });

    it('引数不足でUseCaseが例外を投げた場合、exitCode=2を返すこと', async () => {
      // Arrange
      const handler = new ValidateMatrixHandler({
        validateMatrixUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('matrixFilePath is required')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: undefined as never, failFast: false, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('matrixFilePath is required');
    });
  });
});

// @story-id H08-07