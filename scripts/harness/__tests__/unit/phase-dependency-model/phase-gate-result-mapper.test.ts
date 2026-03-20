import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { PhaseGateResultMapper } from '../../../phase-dependency-model/application/services/phase-gate-result-mapper.js';
import { PhaseGateResult } from '../../../phase-dependency-model/domain/values/phase-gate-result.js';

target('PhaseGateResultMapper', () => {
  describe('map', () => {
    context('監査記録が不要な結果を変換する場合', () => {
      it('PhaseGateResultDtoへ写像すること', () => {
        // Arrange
        const sut = new PhaseGateResultMapper();
        const result = PhaseGateResult.create({
          passed: true,
          blockers: [],
          warnings: ['警告があります'],
        });

        // Act
        const actual = sut.map(result, {
          targetLevel: 2,
          auditRecorded: false,
        });

        // Assert
        expect(actual).toEqual({
          passed: true,
          targetLevel: 2,
          blockers: [],
          warnings: ['警告があります'],
          auditRecorded: false,
        });
      });
    });

    context('監査記録済みの結果を変換する場合', () => {
      it('auditRecorded=trueを保持すること', () => {
        // Arrange
        const sut = new PhaseGateResultMapper();
        const result = PhaseGateResult.create({
          passed: true,
          blockers: [],
          auditPayload: {
            appliedRules: ['1:unit-designer->2:unit-test-logic-designer'],
          },
        });

        // Act
        const actual = sut.map(result, {
          targetLevel: 3,
          auditRecorded: true,
        });

        // Assert
        expect(actual.auditRecorded).toBe(true);
        expect(actual.targetLevel).toBe(3);
      });
    });
  });
});
