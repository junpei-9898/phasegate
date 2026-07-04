/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { NyquistAcCoveragePolicyAdapter } from '../../../../validator-system/infrastructure/adapters/nyquist-ac-coverage-policy-adapter.js';

target('NyquistAcCoveragePolicyAdapter', () => {
  describe('checkCoverage', () => {
    context('matrixFilePathを省略して呼ぶ場合', () => {
      it('例外なく呼び出せること (IT-REPO-Nyquist-001)', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkCoverage({ matrixFilePath: undefined });

        // Assert
        expect(typeof actual.passed).toBe('boolean');
        expect(Array.isArray(actual.errors)).toBe(true);
      });
    });

    context('存在しないmatrixFilePathを渡す場合（FAIL-CLOSED）', () => {
      it('検査失敗をpassed=falseとして扱いエラーを1件以上返すこと (IT-REPO-Nyquist-002)', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkCoverage({ matrixFilePath: '/path/to/missing-matrix.json' });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(actual.errors[0]?.code.value).toBe('L3-004');
      });
    });
  });
});
