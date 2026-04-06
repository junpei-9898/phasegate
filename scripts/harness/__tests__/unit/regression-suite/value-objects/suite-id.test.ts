// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { SuiteId } from '../../../../regression-suite/domain/value-objects/suite-id.js';

target('SuiteId', () => {
  // UT-RS-020
  describe("create: raw='k-requirements' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        const actual = SuiteId.create('k-requirements');
        expect(actual.value).toBe('k-requirements');
      });
    });
  });

  // UT-RS-021
  describe("create: raw='gng-gate' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        const actual = SuiteId.create('gng-gate');
        expect(actual.value).toBe('gng-gate');
      });
    });
  });

  // UT-RS-022
  describe("create: raw='v0-migration' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        const actual = SuiteId.create('v0-migration');
        expect(actual.value).toBe('v0-migration');
      });
    });
  });

  // UT-RS-023
  describe("create: raw='agent-independence' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        const actual = SuiteId.create('agent-independence');
        expect(actual.value).toBe('agent-independence');
      });
    });
  });

  // UT-RS-024
  describe("create: raw='unknown-suite' の場合（INV-7）", () => {
    context('無効なSuiteId文字列が渡された場合', () => {
      it('InvalidSuiteIdError をスロー', () => {
        expect(() => SuiteId.create('unknown-suite' as never)).toThrow('InvalidSuiteIdError');
      });
    });
  });

  // UT-RS-025
  describe("create: raw='' の場合", () => {
    context('空文字列が渡された場合', () => {
      it('InvalidSuiteIdError をスロー', () => {
        expect(() => SuiteId.create('' as never)).toThrow('InvalidSuiteIdError');
      });
    });
  });

  // UT-RS-026
  describe("create: raw='K-REQUIREMENTS'（大文字）の場合", () => {
    context('大文字のSuiteId文字列が渡された場合', () => {
      it('InvalidSuiteIdError をスロー', () => {
        expect(() => SuiteId.create('K-REQUIREMENTS' as never)).toThrow('InvalidSuiteIdError');
      });
    });
  });

  // UT-RS-027
  describe("equals: SuiteId('k-requirements') と SuiteId('k-requirements') を比較する場合", () => {
    context('同一値のSuiteIdを比較した場合', () => {
      it('等価（値等価性）', () => {
        const a = SuiteId.create('k-requirements');
        const b = SuiteId.create('k-requirements');
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });
  });

  // UT-RS-028
  describe("equals: SuiteId('k-requirements') と SuiteId('gng-gate') を比較する場合", () => {
    context('異なる値のSuiteIdを比較した場合', () => {
      it('非等価', () => {
        const a = SuiteId.create('k-requirements');
        const b = SuiteId.create('gng-gate');
        const actual = a.equals(b);
        expect(actual).toBe(false);
      });
    });
  });

  // UT-RS-029
  describe('immutable: 生成後の value プロパティへの直接変更は反映されない', () => {
    context('Object.freeze により生成後の変更は反映されない', () => {
      it('変更が反映されない（immutable）', () => {
        const suiteId = SuiteId.create('k-requirements');
        try { (suiteId as unknown as Record<string, unknown>)['value'] = 'gng-gate'; } catch (_) { /* no-op */ }
        const actual = suiteId.value;
        expect(actual).toBe('k-requirements');
      });
    });
  });
});
