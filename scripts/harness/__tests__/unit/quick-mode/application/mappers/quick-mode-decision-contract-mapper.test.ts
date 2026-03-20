import { describe, expect, it } from 'vitest';
import { target, createChangedFile, createQuickModeEligibility, createValidatorRelaxationProfile, createQuickModeDecision } from '../../../../helpers/test-helpers.js';
import { QuickModeDecisionContractMapper } from '../../../../../quick-mode/application/mappers/quick-mode-decision-contract-mapper.js';
import { QuickModeEligibility } from '../../../../../quick-mode/domain/value-objects/quick-mode-eligibility.js';

const mapper = new QuickModeDecisionContractMapper();

target('QuickModeDecisionContractMapper', () => {
  target('toEligibilityContract', () => {
    describe('QuickModeEligibilityをDTOに変換する', () => {
      // UT-MAP-001
      it('eligible=trueのインスタンスが渡された場合にeligible=true、rejectionRule=undefined、rejectedFiles=undefinedのcontractが返ること', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(true);
        // Act
        const actual = mapper.toEligibilityContract(eligibility);
        // Assert
        expect(actual.eligible).toBe(true);
        expect(actual.rejectionRule).toBeUndefined();
        expect(actual.rejectedFiles).toBeUndefined();
      });

      // UT-MAP-002
      it('eligible=falseのインスタンスが渡された場合にeligible=false、rejectionRuleとrejectedFilesが設定されたcontractが返ること', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(false);
        // Act
        const actual = mapper.toEligibilityContract(eligibility);
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBeDefined();
        expect(actual.rejectedFiles).toBeDefined();
      });

      // UT-MAP-003
      it('rejectedFilesを含むインスタンスが渡された場合にrejectedFilesが{filePath, changeKind}の配列に変換されること', () => {
        // Arrange
        const rejectedFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const eligibility = QuickModeEligibility.rejected(
          'MIXED_CHANGES',
          [rejectedFile],
          'domain カテゴリが含まれる'
        );
        // Act
        const actual = mapper.toEligibilityContract(eligibility);
        // Assert
        expect(actual.rejectedFiles).toEqual([
          { filePath: rejectedFile.filePath, changeKind: rejectedFile.changeKind },
        ]);
      });
    });
  });

  target('toRelaxationProfileContract', () => {
    describe('ValidatorRelaxationProfileをDTOに変換する', () => {
      // UT-MAP-004
      it('デフォルトプロファイルが渡された場合にValidatorRelaxationProfileContractが返ること', () => {
        // Arrange
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = mapper.toRelaxationProfileContract(profile);
        // Assert
        expect(actual).toHaveProperty('l1');
        expect(actual).toHaveProperty('l2');
        expect(actual).toHaveProperty('l3');
        expect(actual).toHaveProperty('l4');
        expect(actual).toHaveProperty('levelDependencyRelaxed');
        expect(actual).toHaveProperty('phaseExecution');
      });

      // UT-MAP-005
      it('変換後のlevelDependencyRelaxedがfalseであること', () => {
        // Arrange
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = mapper.toRelaxationProfileContract(profile);
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
      });
    });
  });

  target('toDecisionContract', () => {
    describe('QuickModeDecisionを統合DTOに変換する', () => {
      // UT-MAP-006
      it('approved()のインスタンスが渡された場合にeligibilityとrelaxationProfileの両方が設定されたcontractが返ること', () => {
        // Arrange
        const decision = createQuickModeDecision(true);
        // Act
        const actual = mapper.toDecisionContract(decision);
        // Assert
        expect(actual.eligibility).toBeDefined();
        expect(actual.eligibility.eligible).toBe(true);
        expect(actual.relaxationProfile).toBeDefined();
      });

      // UT-MAP-007
      it('rejected()のインスタンスが渡された場合にrelaxationProfile=undefinedのcontractが返ること', () => {
        // Arrange
        const decision = createQuickModeDecision(false);
        // Act
        const actual = mapper.toDecisionContract(decision);
        // Assert
        expect(actual.eligibility.eligible).toBe(false);
        expect(actual.relaxationProfile).toBeUndefined();
      });

      // UT-MAP-008
      it('変換後のcontractがObject.freeze()されている場合にcontractが凍結されていること', () => {
        // Arrange
        const decision = createQuickModeDecision(true);
        // Act
        const actual = mapper.toDecisionContract(decision);
        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
