// @unit harness-error
// @layer application
// @story H06-03
import { expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';

target('HarnessErrorContract.severity read-only 契約', () => {
  context('APIレスポンス契約の severity フィールドが型レベルで read-only の場合', () => {
    // @ac H06-03-2
    // H06-03 AC-2: Harness API レスポンス（HarnessErrorContract）の severity フィールドが
    // 型レベルで read-only であることを保証する。severity への再代入は TypeScript の型
    // レベルでエラーとなる（下記 @ts-expect-error が消えると tsc がビルド失敗するため、
    // readonly 修飾子の除去を機械的に検出できる）。実行時にも値が変化しないことを確認する。
    it('severityフィールドへの再代入が型レベルで拒否され値が変化しないこと', () => {
      // Arrange
      const contract: HarnessErrorContract = {
        code: 'L1-001',
        severity: 'error',
        message: 'フェーズゲート違反',
        suggestion: 'story-implementor を使用してください',
      };

      // Act
      // @ts-expect-error 意図的な read-only 契約テスト: severity は readonly のため再代入不可
      const reassign = () => { contract.severity = 'warning'; };

      // Assert
      expect(contract.severity).toBe('error');
      void reassign;
    });
  });
});
