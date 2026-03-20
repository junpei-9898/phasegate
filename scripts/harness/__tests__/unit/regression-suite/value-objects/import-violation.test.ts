import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ImportViolation } from '../../../../regression-suite/domain/value-objects/import-violation.js';

target('ImportViolation', () => {
  // UT-RS-142
  describe('create: modulePath・forbiddenPackage・violationMessage が有効な場合', () => {
    context('全フィールドが非空文字列の場合', () => {
      it('正常に生成される', () => {
        const actual = ImportViolation.create({
          modulePath: 'scripts/harness/regression-suite/domain/services/regression-runner.ts',
          forbiddenPackage: '@anthropic-ai/claude-code',
          violationMessage: 'Forbidden import detected: @anthropic-ai/claude-code',
        });
        expect(actual.modulePath).toBe('scripts/harness/regression-suite/domain/services/regression-runner.ts');
        expect(actual.forbiddenPackage).toBe('@anthropic-ai/claude-code');
      });
    });
  });

  // UT-RS-143
  describe("create: modulePath='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() =>
        ImportViolation.create({ modulePath: '', forbiddenPackage: '@anthropic-ai/claude-code', violationMessage: 'msg' })
      ).toThrow();
    });
  });

  // UT-RS-144
  describe('equals: 同一modulePath/forbiddenPackageのImportViolationを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = ImportViolation.create({ modulePath: 'scripts/x.ts', forbiddenPackage: '@anthropic-ai/claude-code', violationMessage: 'msg' });
      const b = ImportViolation.create({ modulePath: 'scripts/x.ts', forbiddenPackage: '@anthropic-ai/claude-code', violationMessage: 'msg2' });
      expect(a.equals(b)).toBe(true);
    });
  });
});
