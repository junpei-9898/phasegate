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

    it('failOnWarning: true で passed=false + warning-only fail は failedValidators に計上 (IT-UC-Agg-006)', () => {
      // Arrange — ADR-017 後は passed=false + warning が現実的ケース (L4-001 drift 等)
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L3-001',
          passed: false,
          errors: [{ code: 'L3-001', severity: 'warning', message: 'warn', suggestion: 'fix' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: true });
      // Assert
      expect(actual.failedValidators).toBe(1);
      expect(actual.overallPassed).toBe(false);
    });

    it('failOnWarning: false で passed=true は passedValidators に計上 (IT-UC-Agg-007)', () => {
      // Arrange — passed=true は errors=[] (INV-5)。warning なし正常ケース
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L3-001',
          passed: true,
          errors: [],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: false });
      // Assert
      expect(actual.passedValidators).toBe(1);
      expect(actual.overallPassed).toBe(true);
    });
  });

  // WI-094 / ADR-017: warning-only validator fail のセマンティクス
  describe('warning-severity validator fail のセマンティクス (ADR-017)', () => {

    it('passed=false かつ warning-only errors の場合、failOnWarning=false (default) では passedValidators に計上され overallPassed=true (IT-UC-Agg-009)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L4-001',
          passed: false,
          errors: [{ code: 'L4-001', severity: 'warning', message: 'drift detected', suggestion: 'sync design' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: false });
      // Assert
      expect(actual.passedValidators).toBe(1);
      expect(actual.failedValidators).toBe(0);
      expect(actual.overallPassed).toBe(true);
      expect(actual.summary.totalWarnings).toBe(1);
      expect(actual.summary.totalErrors).toBe(0);
    });

    it('passed=false かつ error-severity errors の場合、failOnWarning=false でも failedValidators に計上され overallPassed=false (IT-UC-Agg-010)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L2-001',
          passed: false,
          errors: [{ code: 'L2-001', severity: 'error', message: 'phase-gate violation', suggestion: 'add design doc' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: false });
      // Assert
      expect(actual.failedValidators).toBe(1);
      expect(actual.overallPassed).toBe(false);
      expect(actual.summary.totalErrors).toBe(1);
      expect(actual.summary.totalWarnings).toBe(0);
    });

    it('passed=false かつ warning + error が混在する場合、failOnWarning=false でも failedValidators に計上され overallPassed=false (IT-UC-Agg-011)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L3-001',
          passed: false,
          errors: [
            { code: 'L3-001', severity: 'warning', message: 'perf hint', suggestion: 'optimize' },
            { code: 'L3-002', severity: 'error', message: 'security issue', suggestion: 'patch' },
          ],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: false });
      // Assert
      expect(actual.failedValidators).toBe(1);
      expect(actual.overallPassed).toBe(false);
      expect(actual.summary.totalErrors).toBe(1);
      expect(actual.summary.totalWarnings).toBe(1);
    });

    it('passed=false かつ warning-only errors の場合、failOnWarning=true では failedValidators に計上され overallPassed=false (IT-UC-Agg-012)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L4-001',
          passed: false,
          errors: [{ code: 'L4-001', severity: 'warning', message: 'drift detected', suggestion: 'sync design' }],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: true });
      // Assert
      expect(actual.failedValidators).toBe(1);
      expect(actual.overallPassed).toBe(false);
      expect(actual.summary.totalWarnings).toBe(1);
    });

    it('passed=false かつ errors=[] (防御的ケース) では failedValidators に計上され overallPassed=false (IT-UC-Agg-013)', () => {
      // Arrange
      const usecase = new AggregateValidationResultsUseCase();
      const results = [
        createValidationResultContract({
          validatorId: 'L2-001',
          passed: false,
          errors: [],
        }),
      ];
      // Act
      const actual = usecase.execute({ results, failOnWarning: false });
      // Assert
      expect(actual.failedValidators).toBe(1);
      expect(actual.overallPassed).toBe(false);
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
