// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CascadeUpdateResult } from '../../../skill-quality/domain/value-objects/cascade-update-result.js';

function createCascadeUpdateResult(overrides: Partial<{
  updatedCount: number;
  appliedStoryIds: string[];
  errors: string[];
}> = {}): CascadeUpdateResult {
  return CascadeUpdateResult.create({
    updatedCount: overrides.updatedCount ?? 3,
    appliedStoryIds: overrides.appliedStoryIds ?? ['@story-id H12-05'],
    errors: overrides.errors ?? [],
  });
}

target('CascadeUpdateResult', () => {

  describe('create: 有効な値で正常生成', () => {
    context('updatedCount=3 の場合', () => {
      it('正常に生成される', () => {
        expect(() => createCascadeUpdateResult()).not.toThrow();
      });
    });
  });

  describe('create: updatedCount=0 で正常生成（境界値）', () => {
    context('updatedCount=0 の場合', () => {
      it('正常に生成される', () => {
        expect(() => createCascadeUpdateResult({ updatedCount: 0 })).not.toThrow();
      });
    });
  });

  describe('create: updatedCount=-1 で INVALID_UPDATED_COUNT エラー', () => {
    context('updatedCount=-1 の場合', () => {
      it('HarnessError(INVALID_UPDATED_COUNT) がスローされる', () => {
        expect(() => CascadeUpdateResult.create({ updatedCount: -1, appliedStoryIds: [], errors: [] })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_UPDATED_COUNT') }),
        );
      });
    });
  });

  describe('hasErrors: errors=[] で false を返すこと', () => {
    context('errors=[] の場合', () => {
      it('hasErrors() が false を返す', () => {
        const actual = createCascadeUpdateResult({ errors: [] }).hasErrors();
        expect(actual).toBe(false);
      });
    });
  });

  describe('hasErrors: errors 非空で true を返すこと', () => {
    context("errors=['Failed to update foo.ts'] の場合", () => {
      it('hasErrors() が true を返す', () => {
        const actual = createCascadeUpdateResult({ errors: ['Failed to update foo.ts'] }).hasErrors();
        expect(actual).toBe(true);
      });
    });
  });

});
