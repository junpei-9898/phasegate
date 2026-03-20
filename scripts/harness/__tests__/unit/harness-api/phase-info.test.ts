import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PhaseInfo } from '../../../harness-api/domain/value-objects/phase-info.js';

target('PhaseInfo', () => {
  describe('正常系: 有効な引数でPhaseInfoを生成する', () => {
    // UT-PHI-001
    it('unitId=harness-error, currentLevel=1, completedGates=[]でPhaseInfoが生成されること', () => {
      // Arrange
      const input = {
        unitId: 'harness-error',
        currentLevel: 1,
        currentPhase: 'construction',
        completedGates: [],
      };
      // Act
      const actual = PhaseInfo.create(input);
      // Assert
      expect(actual.unitId).toBe('harness-error');
      expect(actual.currentLevel).toBe(1);
    });

    // UT-PHI-002
    it('currentLevel=4, completedGates=[L1,L2,L3]でPhaseInfoが生成されること', () => {
      // Arrange
      const input = {
        unitId: 'config-foundation',
        currentLevel: 4,
        currentPhase: 'construction',
        completedGates: ['L1', 'L2', 'L3'],
      };
      // Act
      const actual = PhaseInfo.create(input);
      // Assert
      expect(actual.completedGates).toEqual(['L1', 'L2', 'L3']);
    });
  });

  context('unitIdが空文字列の場合', () => {
    // UT-PHI-003
    it('エラーをthrowすること', () => {
      // Arrange
      const input = { unitId: '', currentLevel: 1, currentPhase: 'construction', completedGates: [] };
      // Act
      const actual = () => PhaseInfo.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('currentLevelが0（正数でない）の場合', () => {
    // UT-PHI-004
    it('エラーをthrowすること', () => {
      // Arrange
      const input = { unitId: 'harness-error', currentLevel: 0, currentPhase: 'construction', completedGates: [] };
      // Act
      const actual = () => PhaseInfo.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  // UT-BND-012
  it('UT-BND-012: currentLevel=-1（負数）でエラーをthrowすること', () => {
    // Arrange
    const input = { unitId: 'harness-error', currentLevel: -1, currentPhase: 'construction', completedGates: [] };
    // Act
    const actual = () => PhaseInfo.create(input);
    // Assert
    expect(actual).toThrow();
  });
});
