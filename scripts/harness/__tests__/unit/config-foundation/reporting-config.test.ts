import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ReportingConfig } from '../../../config-foundation/domain/value-objects/reporting-config.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('ReportingConfig', () => {
  describe('生成する', () => {
    // UT-CF-148
    context('formatとoutputDirが有効な場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = { format: 'json', outputDir: 'reports' };

        // Act
        const actual = new ReportingConfig(input);

        // Assert
        expect(actual.format).toBe('json');
        expect(actual.outputDir).toBe('reports');
      });
    });

    // UT-CF-149
    context('formatが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = { format: '', outputDir: 'reports' };

        // Act
        const actual = () => new ReportingConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-150
    context('outputDirが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = { format: 'json', outputDir: '' };

        // Act
        const actual = () => new ReportingConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-151
    context('formatとoutputDirが同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const props = { format: 'json', outputDir: 'reports' };
        const left = new ReportingConfig(props);
        const right = new ReportingConfig(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-152
    context('formatが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new ReportingConfig({ format: 'json', outputDir: 'reports' });
        const right = new ReportingConfig({ format: 'html', outputDir: 'reports' });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
