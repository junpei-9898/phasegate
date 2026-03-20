/**
 * @layer test
 * @unit validator-system
 * @story H08-05
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AggregateValidationResultsUseCase } from '../../../../validator-system/application/use-cases/aggregate-validation-results-usecase.js';
import { createValidationResultContract } from '../helpers.js';

target('AggregateValidationResultsUseCase', () => {

  describe('全バリデータ通過の集約', () => {

    it('全件passed=trueのresultsを渡すとoverallPassed: trueのレポートが返る (IT-UC-Agg-001)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({ validatorId: 'L2-001', passed: true }),
        createValidationResultContract({ validatorId: 'L2-002', passed: true }),
        createValidationResultContract({ validatorId: 'L3-001', passed: true }),
      ];
      // Act
      const actual = usecase.execute({ results });
      // Assert
      expect(actual.overallPassed).toBe(true);
      expect(actual.passedValidators).toBe(3);
      expect(actual.failedValidators).toBe(0);
    });

    it('results: []（空）を渡すとoverallPassed: trueのレポートが返る (IT-UC-Agg-002)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      // Act
      const actual = usecase.execute({ results: [] });
      // Assert
      expect(actual.overallPassed).toBe(true);
      expect(actual.totalValidators).toBe(0);
    });
  });

  describe('失敗バリデータを含む集約', () => {

    it('1件failのresultsを渡すとoverallPassed: falseのレポートが返る (IT-UC-Agg-003)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({ validatorId: 'L2-001', passed: true }),
        createValidationResultContract({
          validatorId: 'L2-002',
          passed: false,
          errors: [{ code: 'L2-002', severity: 'error', message: 'error', suggestion: 'fix' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results });
      // Assert
      expect(actual.overallPassed).toBe(false);
      expect(actual.failedValidators).toBe(1);
    });

    it('errorsByLayerにL2エラー件数が正しく集計されること (IT-UC-Agg-004)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L2-002',
          passed: false,
          errors: [{ code: 'L2-002', severity: 'error', message: 'e', suggestion: 's' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results });
      // Assert
      expect(actual.summary.errorsByLayer.L2).toBe(1);
      expect(actual.summary.errorsByLayer.L3).toBe(0);
      expect(actual.summary.errorsByLayer.L4).toBe(0);
    });
  });

  describe('skipped結果の集約', () => {

    it('skipped=trueのresultsはskippedValidatorsとして計上されること (IT-UC-Agg-005)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({ validatorId: 'L3-002', passed: true, skipped: true }),
        createValidationResultContract({ validatorId: 'L2-001', passed: true }),
      ];
      // Act
      const actual = usecase.execute({ results });
      // Assert
      expect(actual.skippedValidators).toBe(1);
      expect(actual.passedValidators).toBe(1);
    });
  });

  describe('failOnWarning オプション', () => {

    it('failOnWarning: trueかつwarningが含まれる場合failedValidatorsに計上されること (IT-UC-Agg-006)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L3-001',
          passed: true,
          errors: [{ code: 'L3-001', severity: 'warning', message: 'warn', suggestion: 'fix' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: true });
      // Assert
      expect(actual.failedValidators).toBe(1);
      expect(actual.overallPassed).toBe(false);
    });

    it('failOnWarning: falseかつwarningが含まれる場合passedValidatorsに計上されること (IT-UC-Agg-007)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L3-001',
          passed: true,
          errors: [{ code: 'L3-001', severity: 'warning', message: 'warn', suggestion: 'fix' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: false });
      // Assert
      expect(actual.passedValidators).toBe(1);
      expect(actual.overallPassed).toBe(true);
    });
  });

  it('返却されるレポートはObject.freeze()で凍結されていること (IT-UC-Agg-008)', () => {
    // Arrange
    const usecase = new AggregateValidationResultsUseCase();
    // Act
    const actual = usecase.execute({ results: [] });
    // Assert
    expect(Object.isFrozen(actual)).toBe(true);
  });
});
