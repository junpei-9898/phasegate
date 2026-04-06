// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CiCheckResult } from '../../../harness-api/domain/value-objects/ci-check-result.js';

target('CiCheckResult', () => {
  describe('正常系: 有効な引数でCiCheckResultを生成する', () => {
    // UT-CCR-001
    it('validatorResults=[1件passed=true], allPassed=trueでCiCheckResultが生成されること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }],
        allPassed: true,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
    });

    // UT-CCR-002
    it('一部passed=falseを含む複数件でCiCheckResultが生成されること', () => {
      // Arrange
      const input = {
        validatorResults: [
          { validatorId: 'L2-001', passed: true },
          { validatorId: 'L2-002', passed: false },
        ],
        allPassed: false,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(false);
      expect(actual.validatorResults).toHaveLength(2);
    });
  });

  describe('不変条件テスト', () => {
    // UT-CCR-003 (INV-5: validatorResultsは1件以上)
    it('validatorResults=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { validatorResults: [], allPassed: true };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-004 (INV-6: allPassed !== 全件passed論理積)
    it('全件passed=trueなのにallPassed=falseでエラーをthrowすること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }, { validatorId: 'L2-002', passed: true }],
        allPassed: false,
      };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-005 (INV-6逆)
    it('passed=falseを含む結果でallPassed=trueでエラーをthrowすること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }, { validatorId: 'L2-002', passed: false }],
        allPassed: true,
      };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-006 (INV-6 正常系)
    it('全件passed=true, allPassed=trueで正常に生成されること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }, { validatorId: 'L2-002', passed: true }],
        allPassed: true,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
    });
  });
});
