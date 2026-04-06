// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { TddCycle } from '../../../skill-quality/domain/value-objects/tdd-cycle.js';

target('TddCycle', () => {

  describe('create: 各 phase で正常生成されること', () => {
    context("phase='RED', passed=false の場合", () => {
      it('正常に生成される', () => {
        const actual = TddCycle.create('RED', false);
        expect(actual.phase).toBe('RED');
      });
    });
  });

  describe('create: phase=GREEN で正常生成されること', () => {
    context("phase='GREEN', passed=true の場合", () => {
      it('正常に生成される', () => {
        const actual = TddCycle.create('GREEN', true);
        expect(actual.phase).toBe('GREEN');
      });
    });
  });

  describe('create: phase=REFACTOR で正常生成されること', () => {
    context("phase='REFACTOR', passed=true の場合", () => {
      it('正常に生成される', () => {
        const actual = TddCycle.create('REFACTOR', true);
        expect(actual.phase).toBe('REFACTOR');
      });
    });
  });

  describe('isReadyForCommit: REFACTOR+passed=true で true を返すこと', () => {
    context("phase='REFACTOR', passed=true の場合", () => {
      it('isReadyForCommit() が true を返す', () => {
        const cycle = TddCycle.create('REFACTOR', true);
        const actual = cycle.isReadyForCommit();
        expect(actual).toBe(true);
      });
    });
  });

  describe('isReadyForCommit: REFACTOR+passed=false で false を返すこと', () => {
    context("phase='REFACTOR', passed=false の場合", () => {
      it('isReadyForCommit() が false を返す', () => {
        const actual = TddCycle.create('REFACTOR', false).isReadyForCommit();
        expect(actual).toBe(false);
      });
    });
  });

  describe('isReadyForCommit: GREEN+passed=true で false を返すこと', () => {
    context("phase='GREEN', passed=true の場合", () => {
      it('isReadyForCommit() が false を返す', () => {
        const actual = TddCycle.create('GREEN', true).isReadyForCommit();
        expect(actual).toBe(false);
      });
    });
  });

  describe('isReadyForCommit: RED+passed=false で false を返すこと', () => {
    context("phase='RED', passed=false の場合", () => {
      it('isReadyForCommit() が false を返す', () => {
        const actual = TddCycle.create('RED', false).isReadyForCommit();
        expect(actual).toBe(false);
      });
    });
  });

  describe('equals: 同一 phase/passed は等値', () => {
    context('同一 phase/passed を持つ 2 つの TddCycle の場合', () => {
      it('equals() が true を返す', () => {
        const a = TddCycle.create('REFACTOR', true);
        const b = TddCycle.create('REFACTOR', true);
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });
  });

  describe('equals: phase が異なれば非等値', () => {
    context('phase が異なる 2 つの TddCycle の場合', () => {
      it('equals() が false を返す', () => {
        const actual = TddCycle.create('RED', false).equals(TddCycle.create('GREEN', false));
        expect(actual).toBe(false);
      });
    });
  });

});
