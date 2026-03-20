/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { NyquistAcCoveragePolicyAdapter } from '../../../../validator-system/infrastructure/adapters/nyquist-ac-coverage-policy-adapter.js';

target('NyquistAcCoveragePolicyAdapter', () => {
  describe('getPolicy', () => {
    context('アダプタのgetPolicy()を呼んだ場合', () => {
      it('policy.checkメソッドが存在するインスタンスが返る (IT-REPO-Nyquist-001)', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();

        // Act
        const actual = await adapter.getPolicy();

        // Assert
        expect(typeof actual.check).toBe('function');
      });
    });

    context('返されたpolicyのcheck()でmatrixを渡す場合', () => {
      it('passed=trueかつerrors=[]が返る（stub実装） (IT-REPO-Nyquist-002)', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();
        const policy = await adapter.getPolicy();
        const matrix = { requirements: ['AC-001', 'AC-002'], coveredBy: ['test-1', 'test-2'] };

        // Act
        const actual = policy.check(matrix);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });
    });
  });
});
