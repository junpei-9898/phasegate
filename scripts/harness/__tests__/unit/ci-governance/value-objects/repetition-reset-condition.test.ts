import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { RepetitionResetCondition } from '../../../../ci-governance/domain/value-objects/repetition-reset-condition.js';

target('RepetitionResetCondition', () => {
  describe('生成テスト', () => {
    // UT-RRC-001
    context('resetOnResolution=trueを渡した場合', () => {
      it('正常にRepetitionResetConditionが生成される', () => {
        const actual = RepetitionResetCondition.create({ resetOnResolution: true });
        expect(actual.resetOnResolution).toBe(true);
      });
    });

    // UT-RRC-002
    context('resetOnResolution=falseを渡した場合', () => {
      it('resetOnResolution=falseのRepetitionResetConditionが生成される', () => {
        const actual = RepetitionResetCondition.create({ resetOnResolution: false });
        expect(actual.resetOnResolution).toBe(false);
      });
    });
  });

  describe('等値性テスト', () => {
    // UT-RRC-003
    context('同一resetOnResolutionを持つ2つのRepetitionResetConditionを比較した場合', () => {
      it('equals()がtrueを返す', () => {
        const a = RepetitionResetCondition.create({ resetOnResolution: true });
        const b = RepetitionResetCondition.create({ resetOnResolution: true });
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });

    // UT-RRC-004
    context('resetOnResolutionが異なる2つのRepetitionResetConditionを比較した場合', () => {
      it('equals()がfalseを返す', () => {
        const a = RepetitionResetCondition.create({ resetOnResolution: true });
        const b = RepetitionResetCondition.create({ resetOnResolution: false });
        const actual = a.equals(b);
        expect(actual).toBe(false);
      });
    });
  });
});
