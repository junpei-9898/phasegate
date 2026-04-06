// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { SuiteId } from '../../../../regression-suite/domain/value-objects/suite-id.js';
import { CiGateConfig } from '../../../../regression-suite/domain/value-objects/ci-gate-config.js';

const createSuiteId = (v: 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence' = 'k-requirements') =>
  SuiteId.create(v);

target('CiGateConfig', () => {
  // UT-RS-088
  describe('create: requiredSuiteIds・coverageThreshold=90・executionMode=parallel で生成する場合', () => {
    it('正常に生成される', () => {
      const actual = CiGateConfig.create({
        requiredSuiteIds: [createSuiteId('k-requirements')],
        coverageThreshold: 90,
        executionMode: 'parallel',
      });
      expect(actual.coverageThreshold).toBe(90);
      expect(actual.executionMode).toBe('parallel');
    });
  });

  // UT-RS-089
  describe('create: coverageThreshold=100 の場合（INV-8 境界値）', () => {
    it('正常に生成される', () => {
      const actual = CiGateConfig.create({
        requiredSuiteIds: [createSuiteId()],
        coverageThreshold: 100,
        executionMode: 'sequential',
      });
      expect(actual.coverageThreshold).toBe(100);
    });
  });

  // UT-RS-090
  describe('create: coverageThreshold=0.1 の場合（INV-8 境界値）', () => {
    it('正常に生成される', () => {
      const actual = CiGateConfig.create({
        requiredSuiteIds: [createSuiteId()],
        coverageThreshold: 0.1,
        executionMode: 'parallel',
      });
      expect(actual.coverageThreshold).toBe(0.1);
    });
  });

  // UT-RS-091
  describe('create: coverageThreshold=0 の場合（INV-8 範囲外）', () => {
    context('coverageThresholdが0の場合', () => {
      it('InvalidCoverageThresholdError をスロー', () => {
        expect(() =>
          CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 0, executionMode: 'parallel' })
        ).toThrow('InvalidCoverageThresholdError');
      });
    });
  });

  // UT-RS-092
  describe('create: coverageThreshold=101 の場合（INV-8 範囲外）', () => {
    it('InvalidCoverageThresholdError をスロー', () => {
      expect(() =>
        CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 101, executionMode: 'parallel' })
      ).toThrow('InvalidCoverageThresholdError');
    });
  });

  // UT-RS-093
  describe('create: coverageThreshold=-1 の場合（INV-8 範囲外）', () => {
    it('InvalidCoverageThresholdError をスロー', () => {
      expect(() =>
        CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: -1, executionMode: 'parallel' })
      ).toThrow('InvalidCoverageThresholdError');
    });
  });

  // UT-RS-094
  describe('isRequired: requiredSuiteIdsに含まれるSuiteIdの場合', () => {
    it('true を返す', () => {
      const config = CiGateConfig.create({
        requiredSuiteIds: [createSuiteId('k-requirements'), createSuiteId('gng-gate')],
        coverageThreshold: 90,
        executionMode: 'parallel',
      });
      expect(config.isRequired(createSuiteId('k-requirements'))).toBe(true);
    });
  });

  // UT-RS-095
  describe('isRequired: requiredSuiteIdsに含まれないSuiteIdの場合', () => {
    it('false を返す', () => {
      const config = CiGateConfig.create({
        requiredSuiteIds: [createSuiteId('k-requirements')],
        coverageThreshold: 90,
        executionMode: 'parallel',
      });
      expect(config.isRequired(createSuiteId('gng-gate'))).toBe(false);
    });
  });

  // UT-RS-096
  describe('equals: 同一値のCiGateConfigを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 90, executionMode: 'parallel' });
      const b = CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 90, executionMode: 'parallel' });
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-097
  describe('equals: 異なるcoverageThresholdのCiGateConfigを比較する場合', () => {
    it('非等価', () => {
      const a = CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 90, executionMode: 'parallel' });
      const b = CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 80, executionMode: 'parallel' });
      expect(a.equals(b)).toBe(false);
    });
  });

  // UT-RS-098
  describe('immutable: requiredSuiteIdsの変更が反映されない', () => {
    it('ReadonlyArray により変更されない', () => {
      const config = CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 90, executionMode: 'parallel' });
      const originalLength = config.requiredSuiteIds.length;
      try { (config.requiredSuiteIds as unknown[]).push(createSuiteId('gng-gate')); } catch (_) { /* no-op */ }
      expect(config.requiredSuiteIds.length).toBe(originalLength);
    });
  });

  // UT-RS-099
  describe('create: executionMode=sequential の場合', () => {
    it('正常に生成される', () => {
      const actual = CiGateConfig.create({ requiredSuiteIds: [createSuiteId()], coverageThreshold: 90, executionMode: 'sequential' });
      expect(actual.executionMode).toBe('sequential');
    });
  });
});
