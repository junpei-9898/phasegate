import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckReadyResult } from '../../../harness-api/domain/value-objects/check-ready-result.js';

target('CheckReadyResult', () => {
  describe('正常系: 有効な引数でCheckReadyResultを生成する', () => {
    // UT-CRR-001
    it('全stories passed=trueかつallPassed=trueでCheckReadyResultが生成されること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: true }],
        allPassed: true,
      };
      // Act
      const actual = CheckReadyResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
      expect(actual.stories).toHaveLength(2);
    });

    // UT-CRR-002
    it('一部stories passed=falseかつallPassed=falseでCheckReadyResultが生成されること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: false }],
        allPassed: false,
      };
      // Act
      const actual = CheckReadyResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(false);
    });

    // UT-CRR-003
    it('stories=[]（空）でCheckReadyResultが生成されること', () => {
      // Arrange
      const input = { stories: [], allPassed: true };
      // Act
      const actual = CheckReadyResult.create(input);
      // Assert
      expect(actual.stories).toHaveLength(0);
    });
  });

  describe('不変条件テスト', () => {
    // UT-CRR-004
    it('storiesにpassed=falseがあるのにallPassed=trueでエラーをthrowすること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: false }],
        allPassed: true,
      };
      // Act
      const actual = () => CheckReadyResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CRR-005
    it('全stories passed=trueなのにallPassed=falseでエラーをthrowすること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: true }],
        allPassed: false,
      };
      // Act
      const actual = () => CheckReadyResult.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
