// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { GngConditionTest } from '../../../../regression-suite/domain/value-objects/gng-condition-test.js';

target('GngConditionTest', () => {
  // UT-RS-055
  describe("create: gngNumber='GNG-4'・targetUnit・verificationCondition が有効な場合", () => {
    it('正常に生成される', () => {
      const actual = GngConditionTest.create({ gngNumber: 'GNG-4', targetUnit: 'harness-api', verificationCondition: '条件が満たされること' });
      expect(actual.gngNumber).toBe('GNG-4');
    });
  });

  // UT-RS-056
  describe("create: gngNumber='GNG-5' の場合", () => {
    it('正常に生成される', () => {
      const actual = GngConditionTest.create({ gngNumber: 'GNG-5', targetUnit: 'harness-api', verificationCondition: '条件が満たされること' });
      expect(actual.gngNumber).toBe('GNG-5');
    });
  });

  // UT-RS-057
  describe("create: gngNumber='GNG-8' の場合", () => {
    it('正常に生成される', () => {
      const actual = GngConditionTest.create({ gngNumber: 'GNG-8', targetUnit: 'harness-api', verificationCondition: '条件が満たされること' });
      expect(actual.gngNumber).toBe('GNG-8');
    });
  });

  // UT-RS-058
  describe("create: gngNumber='GNG-1' の場合（INV-12 スコープ外）", () => {
    context('スコープ外のGNG番号が渡された場合', () => {
      it('InvalidGngNumberError をスロー', () => {
        expect(() =>
          GngConditionTest.create({ gngNumber: 'GNG-1', targetUnit: 'unit', verificationCondition: '条件' })
        ).toThrow('InvalidGngNumberError');
      });
    });
  });

  // UT-RS-059
  describe("create: gngNumber='' の場合", () => {
    it('InvalidGngNumberError をスロー', () => {
      expect(() =>
        GngConditionTest.create({ gngNumber: '', targetUnit: 'unit', verificationCondition: '条件' })
      ).toThrow('InvalidGngNumberError');
    });
  });

  // UT-RS-060
  describe("create: gngNumber='GNG-9' の場合（INV-12 スコープ外）", () => {
    it('InvalidGngNumberError をスロー', () => {
      expect(() =>
        GngConditionTest.create({ gngNumber: 'GNG-9', targetUnit: 'unit', verificationCondition: '条件' })
      ).toThrow('InvalidGngNumberError');
    });
  });

  // UT-RS-061
  describe("create: targetUnit='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() =>
        GngConditionTest.create({ gngNumber: 'GNG-4', targetUnit: '', verificationCondition: '条件' })
      ).toThrow();
    });
  });

  // UT-RS-062
  describe('equals: 同一値のGngConditionTestを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = GngConditionTest.create({ gngNumber: 'GNG-4', targetUnit: 'unit', verificationCondition: '条件' });
      const b = GngConditionTest.create({ gngNumber: 'GNG-4', targetUnit: 'unit', verificationCondition: '条件' });
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-063
  describe('equals: 異なるgngNumberのGngConditionTestを比較する場合', () => {
    it('非等価', () => {
      const a = GngConditionTest.create({ gngNumber: 'GNG-4', targetUnit: 'unit', verificationCondition: '条件' });
      const b = GngConditionTest.create({ gngNumber: 'GNG-5', targetUnit: 'unit', verificationCondition: '条件' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
