// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CascadeUpdateTarget } from '../../../skill-quality/domain/value-objects/cascade-update-target.js';

function createCascadeUpdateTarget(overrides: Partial<{
  filePath: string;
  storyId: string;
}> = {}): CascadeUpdateTarget {
  return CascadeUpdateTarget.create(
    overrides.filePath ?? 'scripts/harness/config-foundation/domain/index.ts',
    overrides.storyId ?? 'H12-05',
  );
}

target('CascadeUpdateTarget', () => {

  describe('create: 有効な filePath と storyId で正常生成', () => {
    context("filePath='scripts/harness/foo.ts', storyId='H12-05' の場合", () => {
      it('正常に生成される', () => {
        expect(() => createCascadeUpdateTarget()).not.toThrow();
      });
    });
  });

  describe('create: storyIdTag が @story-id {storyId} 形式になること', () => {
    context("storyId='H12-05' の場合", () => {
      it("storyIdTag が '@story-id H12-05' になる", () => {
        const actual = createCascadeUpdateTarget({ storyId: 'H12-05' });
        expect(actual.storyIdTag).toBe('@story-id H12-05');
      });
    });
  });

  describe("create: filePath='' で EMPTY_FILE_PATH エラー", () => {
    context("filePath='' の場合", () => {
      it('HarnessError(EMPTY_FILE_PATH) がスローされる', () => {
        expect(() => CascadeUpdateTarget.create('', 'H12-05')).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_FILE_PATH') }),
        );
      });
    });
  });

  describe('equals: 同一 filePath/storyIdTag を持つ 2 つは等値', () => {
    context('同一引数で生成した 2 つの場合', () => {
      it('equals() が true を返す', () => {
        const a = createCascadeUpdateTarget();
        const b = createCascadeUpdateTarget();
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('equals: filePath が異なる場合は非等値', () => {
    context('filePath が異なる場合', () => {
      it('equals() が false を返す', () => {
        const a = createCascadeUpdateTarget({ filePath: 'scripts/harness/foo.ts' });
        const b = createCascadeUpdateTarget({ filePath: 'scripts/harness/bar.ts' });
        expect(a.equals(b)).toBe(false);
      });
    });
  });

});
