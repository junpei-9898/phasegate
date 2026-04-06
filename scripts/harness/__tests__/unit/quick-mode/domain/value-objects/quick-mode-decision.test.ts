// @layer test
import { describe, expect, it } from 'vitest';
import { target, context, createQuickModeEligibility, createValidatorRelaxationProfile, createQuickModeDecision } from '../../../../helpers/test-helpers.js';
import { QuickModeDecision } from '../../../../../quick-mode/domain/value-objects/quick-mode-decision.js';

target('QuickModeDecision', () => {
  target('approved', () => {
    describe('承認済みQuickModeDecisionを生成する', () => {
      // UT-QMD-001
      it('eligibility=trueとrelaxationProfileが渡された場合にrelaxationProfileが設定されたQuickModeDecisionが生成されること', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(true);
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = QuickModeDecision.approved(eligibility, profile);
        // Assert
        expect(actual.isApproved()).toBe(true);
        expect(actual.relaxationProfile).toBeDefined();
      });
    });

    context('eligible=falseのeligibilityが渡された場合', () => {
      // UT-QMD-003
      it('エラーが発生すること（INV-D2の逆保証）', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(false);
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = () => QuickModeDecision.approved(eligibility, profile);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('rejected', () => {
    describe('拒否済みQuickModeDecisionを生成する', () => {
      // UT-QMD-002
      it('eligibility=falseが渡された場合にrelaxationProfile=undefinedのQuickModeDecisionが生成されること（INV-D1）', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(false);
        // Act
        const actual = QuickModeDecision.rejected(eligibility);
        // Assert
        expect(actual.isApproved()).toBe(false);
        expect(actual.relaxationProfile).toBeUndefined();
      });
    });
  });

  target('isApproved', () => {
    describe('Quick Mode承認状態を返す', () => {
      // UT-QMD-004
      it('approved()で生成したインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(true);
        // Act
        const actual = sut.isApproved();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMD-005
      it('rejected()で生成したインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(false);
        // Act
        const actual = sut.isApproved();
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのQuickModeDecisionの値等価性を判定する', () => {
      // UT-QMD-006
      it('同一eligibility/relaxationProfileを持つ場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(true);
        const other = createQuickModeDecision(true);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMD-007
      it('relaxationProfileの有無が異なる場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(true);
        const other = createQuickModeDecision(false);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // UT-QMD-008: INV-D1確認
  it('INV-D1: rejected()の戻り値のrelaxationProfileがundefinedであること', () => {
    // Arrange
    const eligibility = createQuickModeEligibility(false);
    // Act
    const actual = QuickModeDecision.rejected(eligibility);
    // Assert
    expect(actual.relaxationProfile).toBeUndefined();
  });
});
