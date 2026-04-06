// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CoverageReport } from '../../../skill-quality/domain/value-objects/coverage-report.js';
import { RequirementCoverageResult } from '../../../skill-quality/domain/value-objects/requirement-coverage-result.js';
import { CodeCoverageResult } from '../../../skill-quality/domain/value-objects/code-coverage-result.js';

function createRequirementCoverageResult(overrides: Partial<{
  total: number;
  covered: number;
  uncoveredIds: string[];
}> = {}): RequirementCoverageResult {
  const total = overrides.total ?? 10;
  const covered = overrides.covered ?? 10;
  const uncoveredIds = overrides.uncoveredIds ?? [];
  return RequirementCoverageResult.create(total, covered, uncoveredIds);
}

function createCodeCoverageResult(overrides: Partial<{
  line: number;
  branch: number;
  fn: number;
}> = {}): CodeCoverageResult {
  return CodeCoverageResult.create(
    overrides.line ?? 85,
    overrides.branch ?? 80,
    overrides.fn ?? 90,
  );
}

function createCoverageReport(overrides: Partial<{
  requirementCoverage: RequirementCoverageResult;
  codeCoverage: CodeCoverageResult;
}> = {}): CoverageReport {
  return CoverageReport.create(
    overrides.requirementCoverage ?? createRequirementCoverageResult(),
    overrides.codeCoverage ?? createCodeCoverageResult(),
  );
}

target('CoverageReport', () => {

  describe('create: 有効な引数で正常生成（INV-12）', () => {
    context('有効な RequirementCoverageResult と CodeCoverageResult の場合', () => {
      it('正常に生成される', () => {
        expect(() => createCoverageReport()).not.toThrow();
      });
    });
  });

  describe('create: requirementCoverage=null で INVALID_COVERAGE_REPORT（INV-12）', () => {
    context('requirementCoverage=null の場合', () => {
      it('HarnessError(INVALID_COVERAGE_REPORT) がスローされる', () => {
        expect(() => CoverageReport.create(null as any, createCodeCoverageResult())).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_COVERAGE_REPORT') }),
        );
      });
    });
  });

  describe('create: codeCoverage=null で INVALID_COVERAGE_REPORT（INV-12）', () => {
    context('codeCoverage=null の場合', () => {
      it('HarnessError(INVALID_COVERAGE_REPORT) がスローされる', () => {
        expect(() => CoverageReport.create(createRequirementCoverageResult(), null as any)).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_COVERAGE_REPORT') }),
        );
      });
    });
  });

  describe('meetsThreshold: 要件100%+コード85% で threshold(100/80) 達成', () => {
    context('coverageRate=100%, lineCoverage=85% の場合', () => {
      it('meetsThreshold() が true を返す', () => {
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 10, covered: 10, uncoveredIds: [] }),
          codeCoverage: createCodeCoverageResult({ line: 85, branch: 70, fn: 90 }),
        });
        const actual = report.meetsThreshold(100, 80);
        expect(actual).toBe(true);
      });
    });
  });

  describe('meetsThreshold: 要件95% で threshold(100) 未達', () => {
    context('coverageRate=95%, lineCoverage=85% の場合', () => {
      it('meetsThreshold() が false を返す（要件カバレッジ未達）', () => {
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 20, covered: 19, uncoveredIds: ['REQ-20'] }),
          codeCoverage: createCodeCoverageResult({ line: 85, branch: 70, fn: 90 }),
        });
        const actual = report.meetsThreshold(100, 80);
        expect(actual).toBe(false);
      });
    });
  });

  describe('meetsThreshold: 要件100% + コード75% で threshold(100/80) 未達', () => {
    context('lineCoverage=75% の場合', () => {
      it('meetsThreshold() が false を返す（コードカバレッジ未達）', () => {
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 10, covered: 10, uncoveredIds: [] }),
          codeCoverage: createCodeCoverageResult({ line: 75, branch: 70, fn: 90 }),
        });
        const actual = report.meetsThreshold(100, 80);
        expect(actual).toBe(false);
      });
    });
  });

  describe('meetsThreshold: 要件100% + コード80% で threshold(100/80) 達成（境界値）', () => {
    context('lineCoverage=80%（閾値と同値）の場合', () => {
      it('meetsThreshold() が true を返す', () => {
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 10, covered: 10, uncoveredIds: [] }),
          codeCoverage: createCodeCoverageResult({ line: 80, branch: 70, fn: 90 }),
        });
        const actual = report.meetsThreshold(100, 80);
        expect(actual).toBe(true);
      });
    });
  });

  describe('equals: 同一 requirementCoverage/codeCoverage を持つ 2 つは等値', () => {
    context('同一内容の 2 つの CoverageReport を比較する場合', () => {
      it('equals() が true を返す', () => {
        const a = createCoverageReport();
        const b = createCoverageReport();
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });
  });

});
