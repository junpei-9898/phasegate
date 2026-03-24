import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AnalyzeImpactHandler } from '../../../../nyquist-validation/presentation/handlers/analyze-impact-handler.js';

target('AnalyzeImpactHandler', () => {
  context('正常系を検証する場合', () => {
    it('存在するstoryIdではテスト参照一覧とexitCode=0を返すこと', async () => {
      // Arrange
      const handler = new AnalyzeImpactHandler({
        analyzeImpactUseCase: {
          execute: vi.fn().mockResolvedValue({
            found: true,
            storyId: 'H07-01',
            directTests: [
              { filePath: 'specs/h07-01.spec.ts', testType: 'it' },
              { filePath: 'specs/h07-01.unit.ts', testType: 'unit' },
            ],
            directMappingOnly: true,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/valid.json', storyId: 'H07-01', format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.output).toContain('specs/h07-01.spec.ts');
    });

    it('json形式ではAnalyzeImpactOutput JSONが返ること', async () => {
      // Arrange
      const handler = new AnalyzeImpactHandler({
        analyzeImpactUseCase: {
          execute: vi.fn().mockResolvedValue({
            found: true,
            storyId: 'H07-01',
            directTests: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it' }],
            directMappingOnly: true,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/valid.json', storyId: 'H07-01', format: 'json' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.output)).toMatchObject({ found: true });
    });

    it('存在しないstoryIdではexitCode=1を返すこと', async () => {
      // Arrange
      const handler = new AnalyzeImpactHandler({
        analyzeImpactUseCase: {
          execute: vi.fn().mockResolvedValue({
            found: false,
            storyId: 'H99-99',
            directTests: [],
            directMappingOnly: true,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/valid.json', storyId: 'H99-99', format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.output).toMatch(/No tests found|story not found/);
    });
  });

  context('異常系を検証する場合', () => {
    it('storyId書式エラー相当の例外ではexitCode=2を返すこと', async () => {
      // Arrange
      const handler = new AnalyzeImpactHandler({
        analyzeImpactUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('Invalid storyId format: invalid-format')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/valid.json', storyId: 'invalid-format', format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('Invalid storyId format');
    });

    it('I/OエラーではexitCode=2を返すこと', async () => {
      // Arrange
      const handler = new AnalyzeImpactHandler({
        analyzeImpactUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/not-found.json', storyId: 'H07-01', format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('ENOENT');
    });

    it('storyId引数不足相当の例外ではexitCode=2を返すこと', async () => {
      // Arrange
      const handler = new AnalyzeImpactHandler({
        analyzeImpactUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('storyId is required')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/valid.json', storyId: undefined as never, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('storyId is required');
    });
  });
});

// @story-id H08-07