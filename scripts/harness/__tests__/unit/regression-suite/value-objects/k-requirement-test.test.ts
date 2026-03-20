import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { KRequirementTest } from '../../../../regression-suite/domain/value-objects/k-requirement-test.js';

target('KRequirementTest', () => {
  // UT-RS-040
  describe("create: kNumber='K1'・targetUnit='validator-system'・verificationCondition=非空文字列", () => {
    it('正常に生成される', () => {
      const actual = KRequirementTest.create({ kNumber: 'K1', targetUnit: 'validator-system', verificationCondition: '正しく動作すること' });
      expect(actual.kNumber).toBe('K1');
      expect(actual.targetUnit).toBe('validator-system');
    });
  });

  // UT-RS-041
  describe("create: kNumber='K3.5' の場合（INV-11）", () => {
    context('K3.5 が有効なK番号として認識される場合', () => {
      it('正常に生成される', () => {
        const actual = KRequirementTest.create({ kNumber: 'K3.5', targetUnit: 'traceability-model', verificationCondition: '正しく動作すること' });
        expect(actual.kNumber).toBe('K3.5');
      });
    });
  });

  // UT-RS-042
  describe("create: kNumber='K15' の場合（INV-11 境界値）", () => {
    it('正常に生成される', () => {
      const actual = KRequirementTest.create({ kNumber: 'K15', targetUnit: 'harness-api', verificationCondition: '正しく動作すること' });
      expect(actual.kNumber).toBe('K15');
    });
  });

  // UT-RS-043
  describe("create: kNumber='K16' の場合（INV-11 範囲外）", () => {
    context('K16以上は不正なK番号', () => {
      it('InvalidKNumberError をスロー', () => {
        expect(() =>
          KRequirementTest.create({ kNumber: 'K16', targetUnit: 'unit', verificationCondition: '条件' })
        ).toThrow('InvalidKNumberError');
      });
    });
  });

  // UT-RS-044
  describe("create: kNumber='K0' の場合（INV-11 範囲外）", () => {
    it('InvalidKNumberError をスロー', () => {
      expect(() =>
        KRequirementTest.create({ kNumber: 'K0', targetUnit: 'unit', verificationCondition: '条件' })
      ).toThrow('InvalidKNumberError');
    });
  });

  // UT-RS-045
  describe("create: kNumber='' の場合", () => {
    it('InvalidKNumberError をスロー', () => {
      expect(() =>
        KRequirementTest.create({ kNumber: '', targetUnit: 'unit', verificationCondition: '条件' })
      ).toThrow('InvalidKNumberError');
    });
  });

  // UT-RS-046
  describe("create: targetUnit='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() =>
        KRequirementTest.create({ kNumber: 'K1', targetUnit: '', verificationCondition: '条件' })
      ).toThrow();
    });
  });

  // UT-RS-047
  describe("create: verificationCondition='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() =>
        KRequirementTest.create({ kNumber: 'K1', targetUnit: 'unit', verificationCondition: '' })
      ).toThrow();
    });
  });

  // UT-RS-048
  describe('equals: 同一値のKRequirementTestを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = KRequirementTest.create({ kNumber: 'K1', targetUnit: 'unit', verificationCondition: '条件' });
      const b = KRequirementTest.create({ kNumber: 'K1', targetUnit: 'unit', verificationCondition: '条件' });
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-049
  describe('equals: 異なるkNumberのKRequirementTestを比較する場合', () => {
    it('非等価', () => {
      const a = KRequirementTest.create({ kNumber: 'K1', targetUnit: 'unit', verificationCondition: '条件' });
      const b = KRequirementTest.create({ kNumber: 'K2', targetUnit: 'unit', verificationCondition: '条件' });
      expect(a.equals(b)).toBe(false);
    });
  });

  // UT-RS-050
  describe('immutable: 生成後の値は変更されない', () => {
    it('kNumber が変更されない', () => {
      const test = KRequirementTest.create({ kNumber: 'K1', targetUnit: 'unit', verificationCondition: '条件' });
      try { (test as unknown as Record<string, unknown>)['kNumber'] = 'K2'; } catch (_) { /* no-op */ }
      expect(test.kNumber).toBe('K1');
    });
  });
});
