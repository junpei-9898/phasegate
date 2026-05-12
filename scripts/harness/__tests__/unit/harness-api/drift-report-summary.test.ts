// @layer test
// @unit harness-api
// @story H09-03
// @work-item-id WI-114
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { DriftReportSummary } from '../../../harness-api/domain/value-objects/drift-report-summary.js';
import type { DriftItem } from '../../../harness-api/domain/value-objects/drift-report-summary.js';

function buildDriftItem(id: string): DriftItem {
  return {
    direction: 'design-to-code',
    unit: id,
    element: 'TestElement',
    recommendation: 'テスト推奨事項',
  };
}

target('DriftReportSummary', () => {
  describe('正常系: 有効な引数でDriftReportSummaryを生成する', () => {
    // UT-DRS-001
    it('drifts=[], totalCount=0でDriftReportSummaryが生成されること', () => {
      // Arrange
      const input = { drifts: [], totalCount: 0 };
      // Act
      const actual = DriftReportSummary.create(input);
      // Assert
      expect(actual.totalCount).toBe(0);
      expect(actual.drifts).toEqual([]);
    });

    // UT-DRS-002
    it('drifts=[2件], totalCount=2でDriftReportSummaryが生成されること', () => {
      // Arrange
      const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002')];
      const input = { drifts, totalCount: 2 };
      // Act
      const actual = DriftReportSummary.create(input);
      // Assert
      expect(actual.totalCount).toBe(2);
    });

    it('fromDriftsがcategory/severity/nextActionとrepository scale向けの集約を返すこと', () => {
      // Arrange
      const drifts = [
        { direction: 'code→design', unit: 'validator-system', element: 'RunFullValidationUseCase', recommendation: 'Review design docs' },
        { direction: 'design→code', unit: 'harness-api', element: 'Status contract', recommendation: 'Implement missing code' },
        { direction: 'code→design', unit: 'traceability-model', element: 'Pointer contract', recommendation: 'Add @work-item-id pointer' },
      ];
      // Act
      const actual = DriftReportSummary.fromDrifts(drifts, 2);
      // Assert
      expect(actual.totalCount).toBe(3);
      expect(actual.rawDriftCount).toBe(3);
      expect(actual.drifts).toEqual([
        expect.objectContaining({ unit: 'validator-system' }),
        expect.objectContaining({ unit: 'harness-api' }),
      ]);
      expect(actual.truncated).toBe(true);
      expect(actual.drifts[0]).toMatchObject({
        category: 'code-missing-design',
        severity: 'warning',
        nextAction: 'Update the matching product/construction docs with the implementation contract.',
      });
      expect(actual.categorySummaries).toEqual([
        expect.objectContaining({ category: 'code-missing-design', count: 1 }),
        expect.objectContaining({ category: 'design-missing-code', count: 1 }),
        expect.objectContaining({ category: 'missing-pointer', count: 1 }),
      ]);
      expect(actual.actionPlan).toEqual([
        expect.objectContaining({ category: 'code-missing-design' }),
        expect.objectContaining({ category: 'design-missing-code' }),
        expect.objectContaining({ category: 'missing-pointer' }),
      ]);
    });
  });

  describe('不変条件テスト', () => {
    // UT-DRS-003 (INV-7: totalCount === drifts.length)
    it('drifts=2件なのにtotalCount=3でエラーをthrowすること', () => {
      // Arrange
      const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002')];
      const input = { drifts, totalCount: 3 };
      // Act
      const actual = () => DriftReportSummary.create(input);
      // Assert
      expect(actual).toThrow('totalCount=3 does not match drifts.length=2');
    });

    // UT-DRS-004 (INV-7逆)
    it('drifts=2件なのにtotalCount=0でエラーをthrowすること', () => {
      // Arrange
      const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002')];
      const input = { drifts, totalCount: 0 };
      // Act
      const actual = () => DriftReportSummary.create(input);
      // Assert
      expect(actual).toThrow('totalCount=0 does not match drifts.length=2');
    });
  });

  // UT-BND-005
  it('UT-BND-005: drifts=3件, totalCount=3で正常に生成されること', () => {
    // Arrange
    const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002'), buildDriftItem('D-003')];
    const input = { drifts, totalCount: 3 };
    // Act
    const actual = DriftReportSummary.create(input);
    // Assert
    expect(actual.totalCount).toBe(3);
  });

  // UT-BND-006
  it('UT-BND-006: drifts=3件, totalCount=4でエラーをthrowすること（INV-7違反）', () => {
    // Arrange
    const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002'), buildDriftItem('D-003')];
    const input = { drifts, totalCount: 4 };
    // Act
    const actual = () => DriftReportSummary.create(input);
    // Assert
    expect(actual).toThrow('totalCount=4 does not match drifts.length=3');
  });
});
