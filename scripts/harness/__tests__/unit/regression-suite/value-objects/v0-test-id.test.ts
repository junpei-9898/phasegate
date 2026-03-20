import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { V0TestId } from '../../../../regression-suite/domain/value-objects/v0-test-id.js';

target('V0TestId', () => {
  // UT-RS-130
  describe('create: 有効なv0テストパスの場合', () => {
    context('scripts/__tests__/unit/harness-error.test.ts が渡された場合', () => {
      it('正常に生成される', () => {
        const actual = V0TestId.create('scripts/__tests__/unit/harness-error.test.ts');
        expect(actual.value).toBe('scripts/__tests__/unit/harness-error.test.ts');
      });
    });
  });

  // UT-RS-131
  describe("create: path='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() => V0TestId.create('')).toThrow();
    });
  });

  // UT-RS-132
  describe('equals: 同一パスのV0TestIdを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = V0TestId.create('scripts/__tests__/unit/harness-error.test.ts');
      const b = V0TestId.create('scripts/__tests__/unit/harness-error.test.ts');
      expect(a.equals(b)).toBe(true);
    });
  });
});
