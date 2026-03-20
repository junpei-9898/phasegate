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
      expect(actual.drifts).toHaveLength(0);
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
      expect(actual).toThrow();
    });

    // UT-DRS-004 (INV-7逆)
    it('drifts=2件なのにtotalCount=0でエラーをthrowすること', () => {
      // Arrange
      const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002')];
      const input = { drifts, totalCount: 0 };
      // Act
      const actual = () => DriftReportSummary.create(input);
      // Assert
      expect(actual).toThrow();
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
    expect(actual).toThrow();
  });
});
