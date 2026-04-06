// @layer test
import { describe, expect, it } from 'vitest';
import { target, context, createChangedFile, createQuickModeEligibility } from '../../../../helpers/test-helpers.js';
import { QuickModeEligibility } from '../../../../../quick-mode/domain/value-objects/quick-mode-eligibility.js';

target('QuickModeEligibility', () => {
  target('eligible', () => {
    describe('eligible=trueのQuickModeEligibilityを生成する', () => {
      // UT-QME-001
      it('正常なreason文字列が渡された場合にeligible=true、rejectionRule=undefined、rejectedFiles=undefinedのインスタンスが生成されること', () => {
        // Arrange
        const reason = 'allowedCategories内のみ';
        // Act
        const actual = QuickModeEligibility.eligible(reason);
        // Assert
        expect(actual.isEligible()).toBe(true);
        expect(actual.rejectionRule).toBeUndefined();
        expect(actual.rejectedFiles).toBeUndefined();
      });
    });

    context('reasonが空文字の場合', () => {
      // UT-QME-002
      it('エラーが発生すること（INV-E3）', () => {
        // Arrange
        const reason = '';
        // Act
        const actual = () => QuickModeEligibility.eligible(reason);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('rejected', () => {
    describe('eligible=falseのQuickModeEligibilityを生成する', () => {
      // UT-QME-003
      it('rejectionRuleとrejectedFilesが渡された場合にeligible=false、rejectionRule非undefined、rejectedFiles非undefinedのインスタンスが生成されること', () => {
        // Arrange
        const rejectionRule = 'MIXED_CHANGES' as const;
        const rejectedFiles = [createChangedFile()];
        const reason = 'domain カテゴリが含まれる';
        // Act
        const actual = QuickModeEligibility.rejected(rejectionRule, rejectedFiles, reason);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
        expect(actual.rejectedFiles).toHaveLength(1);
      });
    });

    context('rejectedFilesが空配列の場合', () => {
      // UT-QME-004
      it('エラーが発生すること（INV-E2）', () => {
        // Arrange
        const rejectedFiles: never[] = [];
        // Act
        const actual = () =>
          QuickModeEligibility.rejected('MIXED_CHANGES', rejectedFiles, 'reason');
        // Assert
        expect(actual).toThrowError();
      });
    });

    context('reasonが空文字の場合', () => {
      // UT-QME-005
      it('エラーが発生すること（INV-E3）', () => {
        // Arrange
        const rejectedFiles = [createChangedFile()];
        // Act
        const actual = () =>
          QuickModeEligibility.rejected('MIXED_CHANGES', rejectedFiles, '');
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isEligible', () => {
    describe('Quick Mode適用可否を返す', () => {
      // UT-QME-006
      it('eligible=trueのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeEligibility(true);
        // Act
        const actual = sut.isEligible();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QME-007
      it('eligible=falseのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeEligibility(false);
        // Act
        const actual = sut.isEligible();
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのQuickModeEligibilityの値等価性を判定する', () => {
      // UT-QME-008
      it('同一eligible/reason/rejectionRuleを持つ場合にtrueが返ること', () => {
        // Arrange
        const sut = QuickModeEligibility.eligible('allowedCategories内のみ');
        const other = QuickModeEligibility.eligible('allowedCategories内のみ');
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QME-009
      it('eligibleが異なる場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeEligibility(true);
        const other = createQuickModeEligibility(false);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // 不変条件の組み合わせテスト
  // UT-QME-010
  it('INV-E1: eligible=trueのときrejectionRuleがundefinedであること', () => {
    // Arrange
    const sut = createQuickModeEligibility(true);
    // Act
    const actual = sut.rejectionRule;
    // Assert
    expect(actual).toBeUndefined();
  });

  // UT-QME-011
  it('INV-E1: eligible=trueのときrejectedFilesがundefinedであること', () => {
    // Arrange
    const sut = createQuickModeEligibility(true);
    // Act
    const actual = sut.rejectedFiles;
    // Assert
    expect(actual).toBeUndefined();
  });

  // UT-QME-012
  it('INV-E2: rejected()で1件のrejectedFilesを渡した場合にrejectedFilesが1件含まれること', () => {
    // Arrange
    const rejectedFiles = [createChangedFile()];
    const sut = QuickModeEligibility.rejected('MIXED_CHANGES', rejectedFiles, 'reason');
    // Act
    const actual = sut.rejectedFiles;
    // Assert
    expect(actual).toHaveLength(1);
  });
});
