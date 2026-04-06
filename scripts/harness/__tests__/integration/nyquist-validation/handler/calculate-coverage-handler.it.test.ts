// @layer test
import { expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CalculateCoverageHandler } from '../../../../nyquist-validation/presentation/handlers/calculate-coverage-handler.js';

target('CalculateCoverageHandler', () => {
  context('正常系を検証する場合', () => {
    it('網羅率出力ではexitCode=0を返すこと', async () => {
      // Arrange
      const handler = new CalculateCoverageHandler({
        calculateCoverageUseCase: {
          execute: vi.fn().mockResolvedValue({
            ratePercent: 75,
            coveredAcCount: 3,
            totalAcCount: 4,
            uncoveredAcIds: ['H07-01.AC-4'],
            threshold: null,
            meetsThreshold: null,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/partial.json', checkThreshold: false, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.output).toContain('75');
    });

    it('閾値充足時はexitCode=0を返すこと', async () => {
      // Arrange
      const handler = new CalculateCoverageHandler({
        calculateCoverageUseCase: {
          execute: vi.fn().mockResolvedValue({
            ratePercent: 100,
            coveredAcCount: 3,
            totalAcCount: 3,
            uncoveredAcIds: [],
            threshold: 0.9,
            meetsThreshold: true,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/full.json', checkThreshold: true, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it('json形式ではCalculateCoverageOutput JSONが返ること', async () => {
      // Arrange
      const outputData = {
        ratePercent: 75,
        coveredAcCount: 3,
        totalAcCount: 4,
        uncoveredAcIds: ['H07-01.AC-4'],
        threshold: null,
        meetsThreshold: null,
      };
      const handler = new CalculateCoverageHandler({
        calculateCoverageUseCase: { execute: vi.fn().mockResolvedValue(outputData) } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/partial.json', checkThreshold: false, format: 'json' });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(JSON.parse(actual.output)).toMatchObject({ ratePercent: 75 });
    });
  });

  context('異常系を検証する場合', () => {
    it('閾値未達ではexitCode=1を返すこと', async () => {
      // Arrange
      const handler = new CalculateCoverageHandler({
        calculateCoverageUseCase: {
          execute: vi.fn().mockResolvedValue({
            ratePercent: 60,
            coveredAcCount: 3,
            totalAcCount: 5,
            uncoveredAcIds: ['H07-01.AC-3', 'H07-01.AC-4'],
            threshold: 0.9,
            meetsThreshold: false,
          }),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/low-coverage.json', checkThreshold: true, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.output).toContain('threshold');
    });

    it('UseCaseが例外を投げた場合、exitCode=2を返すこと', async () => {
      // Arrange
      const handler = new CalculateCoverageHandler({
        calculateCoverageUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/not-found.json', checkThreshold: false, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('ENOENT');
    });

    it('スキーマエラー相当の例外ではexitCode=2を返すこと', async () => {
      // Arrange
      const handler = new CalculateCoverageHandler({
        calculateCoverageUseCase: {
          execute: vi.fn().mockRejectedValue(new Error('schema validation failed')),
        } as never,
      });

      // Act
      const actual = await handler.execute({ matrixFilePath: '/invalid-schema.json', checkThreshold: true, format: 'human' });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.output).toContain('schema validation failed');
    });
  });
});

// @story-id H08-07