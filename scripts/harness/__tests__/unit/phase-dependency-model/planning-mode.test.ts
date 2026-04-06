// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  PlanningMode,
} from '../../../phase-dependency-model/domain/values/planning-mode.js';

target('PlanningMode.equals', () => {
  describe('値等価性を判定する', () => {
    // UT-PD-069
    context('同一値のPlanningModeを比較する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = PlanningMode.create('embedded-qa');
        const right = PlanningMode.create('embedded-qa');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
