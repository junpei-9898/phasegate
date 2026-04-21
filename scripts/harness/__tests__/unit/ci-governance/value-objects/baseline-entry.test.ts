// @unit ci-governance
// @layer test
// @story H12-01

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { BaselineEntry } from '../../../../ci-governance/domain/value-objects/baseline-entry.js';

const VALID_SHA1 = 'a'.repeat(40);

target('BaselineEntry', () => {
  describe('生成テスト', () => {
    context('path と 40 桁 hex sha1 を渡した場合', () => {
      it('UT-CG-BE-001a: 正常に BaselineEntry が生成される', () => {
        const entry = BaselineEntry.create({ path: 'scripts/foo.ts', sha1: VALID_SHA1 });
        expect(entry.path).toBe('scripts/foo.ts');
        expect(entry.sha1).toBe(VALID_SHA1);
      });
    });

    context('path が空文字の場合', () => {
      it('UT-CG-BE-001b: エラーがスローされる', () => {
        expect(() => BaselineEntry.create({ path: '', sha1: VALID_SHA1 })).toThrow(
          /path must not be empty/,
        );
      });
    });

    context('sha1 が 40 桁 hex でない場合', () => {
      it('UT-CG-BE-001c: エラーがスローされる', () => {
        expect(() =>
          BaselineEntry.create({ path: 'foo.ts', sha1: 'not-hex' }),
        ).toThrow(/40 lowercase hex/);
      });
    });

    context('sha1 が 大文字を含む場合', () => {
      it('UT-CG-BE-001d: エラーがスローされる（小文字のみ許可）', () => {
        expect(() =>
          BaselineEntry.create({ path: 'foo.ts', sha1: 'A'.repeat(40) }),
        ).toThrow(/40 lowercase hex/);
      });
    });
  });

  describe('等値性テスト', () => {
    it('UT-CG-BE-001e: 同一 path + sha1 で equals=true', () => {
      const a = BaselineEntry.create({ path: 'foo.ts', sha1: VALID_SHA1 });
      const b = BaselineEntry.create({ path: 'foo.ts', sha1: VALID_SHA1 });
      expect(a.equals(b)).toBe(true);
    });

    it('UT-CG-BE-001f: path が異なれば equals=false', () => {
      const a = BaselineEntry.create({ path: 'foo.ts', sha1: VALID_SHA1 });
      const b = BaselineEntry.create({ path: 'bar.ts', sha1: VALID_SHA1 });
      expect(a.equals(b)).toBe(false);
    });
  });
});
