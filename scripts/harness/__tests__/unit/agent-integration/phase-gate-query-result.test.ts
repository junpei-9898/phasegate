// @unit agent-integration
// @layer domain

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  PhaseGateQueryResult,
  PhaseGateQueryResultInvariantError,
} from '../../../agent-integration/domain/value-objects/phase-gate-query-result.js';

const createPhaseGateQueryResult = (
  overrides: Partial<{ passed: boolean; blockers: string[]; warnings: string[] }> = {}
) =>
  PhaseGateQueryResult.create(
    overrides.passed ?? true,
    overrides.blockers ?? [],
    overrides.warnings ?? []
  );

target('PhaseGateQueryResult', () => {
  target('create()', () => {
    describe('正常な入力でPhaseGateQueryResultを生成する', () => {
      context('passed=true, blockers空, warnings空の場合', () => {
        // UT-PGQR-001
        it('PhaseGateQueryResultが正常に生成されること', () => {
          // Arrange
          const passed = true;
          const blockers: string[] = [];
          const warnings: string[] = [];

          // Act
          const actual = PhaseGateQueryResult.create(passed, blockers, warnings);

          // Assert
          expect(actual).toBeInstanceOf(PhaseGateQueryResult);
          expect(actual.hasPassed()).toBe(true);
          expect(actual.getBlockers()).toEqual([]);
          expect(actual.getWarnings()).toEqual([]);
        });
      });

      context('passed=false, blockersが1件, warnings空の場合', () => {
        // UT-PGQR-002
        it('ブロック状態のPhaseGateQueryResultが生成されること', () => {
          // Arrange
          const passed = false;
          const blockers = ['domain_model.md未作成'];
          const warnings: string[] = [];

          // Act
          const actual = PhaseGateQueryResult.create(passed, blockers, warnings);

          // Assert
          expect(actual.hasPassed()).toBe(false);
          expect(actual.getBlockers()).toEqual(['domain_model.md未作成']);
          expect(actual.getWarnings()).toEqual([]);
        });
      });

      context('passed=false, blockersとwarningsの両方がある場合', () => {
        // UT-PGQR-003
        it('blockersとwarningsを保持したPhaseGateQueryResultが生成されること', () => {
          // Arrange
          const passed = false;
          const blockers = ['logical_design.md未作成'];
          const warnings = ['unit_test_design.md推奨'];

          // Act
          const actual = PhaseGateQueryResult.create(passed, blockers, warnings);

          // Assert
          expect(actual.hasPassed()).toBe(false);
          expect(actual.getBlockers()).toEqual(['logical_design.md未作成']);
          expect(actual.getWarnings()).toEqual(['unit_test_design.md推奨']);
        });
      });

      context('passed=true, warningsがある場合', () => {
        // UT-PGQR-004
        it('warnings付きの通過結果が生成されること', () => {
          // Arrange
          const passed = true;
          const blockers: string[] = [];
          const warnings = ['推奨事項あり'];

          // Act
          const actual = PhaseGateQueryResult.create(passed, blockers, warnings);

          // Assert
          expect(actual.hasPassed()).toBe(true);
          expect(actual.getBlockers()).toEqual([]);
          expect(actual.getWarnings()).toEqual(['推奨事項あり']);
        });
      });
    });

    describe('不変条件を検証する', () => {
      context('passed=false かつ blockersが空の場合', () => {
        // UT-PGQR-010
        it('PhaseGateQueryResultInvariantErrorがthrowされること', () => {
          // Arrange
          const passed = false;
          const blockers: string[] = [];
          const warnings: string[] = [];

          // Act
          const actual = () => PhaseGateQueryResult.create(passed, blockers, warnings);

          // Assert
          expect(actual).toThrow(PhaseGateQueryResultInvariantError);
        });

        // UT-PGQR-011
        it('エラーメッセージに不変条件違反を識別できる文言が含まれること', () => {
          // Arrange
          const passed = false;
          const blockers: string[] = [];
          const warnings: string[] = [];
          let caughtError: Error | undefined;

          // Act
          try {
            PhaseGateQueryResult.create(passed, blockers, warnings);
          } catch (error) {
            caughtError = error as Error;
          }
          const actual = caughtError?.message ?? '';

          // Assert
          expect(actual).toMatch(/passed.*false.*blockers|blockers.*1件以上/);
        });
      });
    });
  });

  target('equals()', () => {
    describe('PhaseGateQueryResult同士を比較する', () => {
      context('すべての属性が同じ場合', () => {
        // UT-PGQR-020
        it('等値であること', () => {
          // Arrange
          const left = createPhaseGateQueryResult();
          const right = createPhaseGateQueryResult();

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(true);
        });
      });

      context('blockersが異なる場合', () => {
        // UT-PGQR-021
        it('非等値であること', () => {
          // Arrange
          const left = createPhaseGateQueryResult({ passed: false, blockers: ['err-a'] });
          const right = createPhaseGateQueryResult({ passed: false, blockers: ['err-b'] });

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(false);
        });
      });
    });
  });

  describe('境界値を検証する', () => {
    context('passed=false かつ blockersが0件の場合', () => {
      // UT-BV-021
      it('エラーがthrowされること', () => {
        // Arrange
        const passed = false;
        const blockers: string[] = [];
        const warnings: string[] = [];

        // Act
        const actual = () => PhaseGateQueryResult.create(passed, blockers, warnings);

        // Assert
        expect(actual).toThrow(PhaseGateQueryResultInvariantError);
      });
    });
  });
});
