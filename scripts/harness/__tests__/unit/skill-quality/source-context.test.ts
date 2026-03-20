import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';

target('SourceContext', () => {

  describe('create: 有効な description で正常生成', () => {
    context("description='scripts/harness/foo.ts' の場合", () => {
      it('正常に生成される', () => {
        expect(() => SourceContext.create('scripts/harness/foo.ts')).not.toThrow();
      });
    });
  });

  describe("create: description='' で EMPTY_SOURCE_CONTEXT エラー", () => {
    context("description='' の場合", () => {
      it('HarnessError(EMPTY_SOURCE_CONTEXT) がスローされる', () => {
        expect(() => SourceContext.create('')).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_SOURCE_CONTEXT') }),
        );
      });
    });
  });

  describe('equals: 同一 description を持つ 2 つは等値', () => {
    context('同一 description の場合', () => {
      it('equals() が true を返す', () => {
        const a = SourceContext.create('scripts/harness/foo.ts');
        const b = SourceContext.create('scripts/harness/foo.ts');
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('equals: 異なる description を持つ 2 つは非等値', () => {
    context('異なる description の場合', () => {
      it('equals() が false を返す', () => {
        const a = SourceContext.create('scripts/harness/foo.ts');
        const b = SourceContext.create('scripts/harness/bar.ts');
        expect(a.equals(b)).toBe(false);
      });
    });
  });

});
