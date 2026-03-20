import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { TestExecutionSummary } from '../../../../regression-suite/domain/value-objects/test-execution-summary.js';
import { CoverageRate } from '../../../../regression-suite/domain/value-objects/coverage-rate.js';
import { TestFailureDetail } from '../../../../regression-suite/domain/value-objects/test-failure-detail.js';

const createCoverageRate = (v = 90) => CoverageRate.create(v);
const createFailure = (testCaseId = 'K1', errorMessage = 'assertion failed') =>
  TestFailureDetail.create({ testCaseId, errorMessage });

target('TestExecutionSummary', () => {
  // UT-RS-104
  describe('create: passed=10・failed=0・skipped=0・total=10 で生成する場合（INV-9）', () => {
    it('正常に生成される', () => {
      const actual = TestExecutionSummary.create({
        passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10,
        coverageRate: createCoverageRate(90), failures: [],
      });
      expect(actual.passedCount).toBe(10);
      expect(actual.totalCount).toBe(10);
    });
  });

  // UT-RS-105
  describe('create: passed=8・failed=2・skipped=0・total=10 で生成する場合', () => {
    it('正常に生成される', () => {
      const actual = TestExecutionSummary.create({
        passedCount: 8, failedCount: 2, skippedCount: 0, totalCount: 10,
        coverageRate: null,
        failures: [createFailure('K1'), createFailure('K2')],
      });
      expect(actual.failedCount).toBe(2);
      expect(actual.failures).toHaveLength(2);
    });
  });

  // UT-RS-106
  describe('create: passed=5・failed=3・skipped=2・total=10 で生成する場合', () => {
    it('正常に生成される', () => {
      const actual = TestExecutionSummary.create({
        passedCount: 5, failedCount: 3, skippedCount: 2, totalCount: 10,
        coverageRate: createCoverageRate(85), failures: [createFailure(), createFailure('K2'), createFailure('K3')],
      });
      expect(actual.skippedCount).toBe(2);
      expect(actual.totalCount).toBe(10);
    });
  });

  // UT-RS-107
  describe('create: passed+failed+skipped !== total の場合（INV-9 違反）', () => {
    context('合計が不一致の場合', () => {
      it('TestCountIntegrityError をスロー', () => {
        expect(() =>
          TestExecutionSummary.create({
            passedCount: 5, failedCount: 3, skippedCount: 0, totalCount: 10,
            coverageRate: null, failures: [],
          })
        ).toThrow('TestCountIntegrityError');
      });
    });
  });

  // UT-RS-108
  describe('create: totalCount=0 の場合', () => {
    it('正常に生成される（空スイート）', () => {
      const actual = TestExecutionSummary.create({
        passedCount: 0, failedCount: 0, skippedCount: 0, totalCount: 0,
        coverageRate: null, failures: [],
      });
      expect(actual.totalCount).toBe(0);
    });
  });

  // UT-RS-109
  describe('isPassedGate: failedCount=0・coverageRate=91・threshold=90 の場合', () => {
    it('true を返す', () => {
      const summary = TestExecutionSummary.create({
        passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10,
        coverageRate: createCoverageRate(91), failures: [],
      });
      expect(summary.isPassedGate(90)).toBe(true);
    });
  });

  // UT-RS-110
  describe('isPassedGate: failedCount=1・threshold=90 の場合', () => {
    it('false を返す（failedCountが1以上）', () => {
      const summary = TestExecutionSummary.create({
        passedCount: 9, failedCount: 1, skippedCount: 0, totalCount: 10,
        coverageRate: createCoverageRate(95), failures: [createFailure()],
      });
      expect(summary.isPassedGate(90)).toBe(false);
    });
  });

  // UT-RS-111
  describe('isPassedGate: coverageRate=85・threshold=90 の場合', () => {
    it('false を返す（カバレッジ閾値未達）', () => {
      const summary = TestExecutionSummary.create({
        passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10,
        coverageRate: createCoverageRate(85), failures: [],
      });
      expect(summary.isPassedGate(90)).toBe(false);
    });
  });

  // UT-RS-112
  describe('equals: 同一値のTestExecutionSummaryを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = TestExecutionSummary.create({ passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10, coverageRate: null, failures: [] });
      const b = TestExecutionSummary.create({ passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10, coverageRate: null, failures: [] });
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-113
  describe('immutable: failuresの変更が反映されない', () => {
    it('ReadonlyArray により変更されない', () => {
      const summary = TestExecutionSummary.create({ passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10, coverageRate: null, failures: [] });
      const originalLength = summary.failures.length;
      try { (summary.failures as unknown[]).push(createFailure()); } catch (_) { /* no-op */ }
      expect(summary.failures.length).toBe(originalLength);
    });
  });
});
