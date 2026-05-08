/**
 * @layer test
 * @unit validator-system
 * @story H08-05
 * @work-item-id WI-094
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { HumanValidationResultFormatter } from '../../../../validator-system/presentation/formatters/human-validation-result-formatter.js';
import type { AggregatedValidationReport } from '../../../../validator-system/application/dto/aggregated-validation-report.js';

function buildReport(overrides: Partial<AggregatedValidationReport>): AggregatedValidationReport {
  return {
    overallPassed: true,
    totalValidators: 1,
    passedValidators: 1,
    failedValidators: 0,
    skippedValidators: 0,
    allErrors: [],
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      errorsByLayer: { L2: 0, L3: 0, L4: 0 },
    },
    results: [],
    ...overrides,
  };
}

target('HumanValidationResultFormatter (WI-094 / ADR-017)', () => {
  describe('result-level severity 表示', () => {
    context('passed=false かつ warning-only errors の場合', () => {
      it('[WARN] ラベルで表示される', () => {
        // Arrange
        const report = buildReport({
          results: [
            {
              validatorId: 'L4-001',
              passed: false,
              errors: [
                { code: 'L4-001', severity: 'warning', message: 'drift detected', suggestion: 'sync design' },
              ],
              durationMs: 10,
              skipped: false,
            },
          ],
        });
        // Act
        const actual = new HumanValidationResultFormatter().format(report);
        // Assert
        expect(actual).toContain('[WARN] L4-001');
        expect(actual).not.toContain('[FAIL] L4-001');
      });
    });

    context('passed=false かつ error severity を含む場合', () => {
      it('[FAIL] ラベルで表示される', () => {
        // Arrange
        const report = buildReport({
          overallPassed: false,
          failedValidators: 1,
          passedValidators: 0,
          results: [
            {
              validatorId: 'L2-001',
              passed: false,
              errors: [
                { code: 'L2-001', severity: 'error', message: 'phase-gate violation', suggestion: 'add design doc' },
              ],
              durationMs: 5,
              skipped: false,
            },
          ],
        });
        // Act
        const actual = new HumanValidationResultFormatter().format(report);
        // Assert
        expect(actual).toContain('[FAIL] L2-001');
      });
    });

    context('passed=false かつ warning + error 混在の場合', () => {
      it('[FAIL] ラベルで表示される (error が優先)', () => {
        // Arrange
        const report = buildReport({
          overallPassed: false,
          failedValidators: 1,
          passedValidators: 0,
          results: [
            {
              validatorId: 'L3-001',
              passed: false,
              errors: [
                { code: 'L3-001', severity: 'warning', message: 'perf hint', suggestion: 'optimize' },
                { code: 'L3-002', severity: 'error', message: 'security issue', suggestion: 'patch' },
              ],
              durationMs: 8,
              skipped: false,
            },
          ],
        });
        // Act
        const actual = new HumanValidationResultFormatter().format(report);
        // Assert
        expect(actual).toContain('[FAIL] L3-001');
      });
    });

    context('passed=true の場合', () => {
      it('[PASS] ラベルで表示される', () => {
        // Arrange
        const report = buildReport({
          results: [
            {
              validatorId: 'L2-001',
              passed: true,
              errors: [],
              durationMs: 2,
              skipped: false,
            },
          ],
        });
        // Act
        const actual = new HumanValidationResultFormatter().format(report);
        // Assert
        expect(actual).toContain('[PASS] L2-001');
      });
    });

    context('skipped=true の場合', () => {
      it('[SKIP] ラベルで表示される', () => {
        // Arrange
        const report = buildReport({
          skippedValidators: 1,
          passedValidators: 0,
          results: [
            {
              validatorId: 'L4-002',
              passed: true,
              errors: [],
              durationMs: 0,
              skipped: true,
            },
          ],
        });
        // Act
        const actual = new HumanValidationResultFormatter().format(report);
        // Assert
        expect(actual).toContain('[SKIP] L4-002');
      });
    });
  });
});
