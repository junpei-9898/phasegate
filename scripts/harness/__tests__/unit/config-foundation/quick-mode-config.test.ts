// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { QuickModeConfig } from '../../../config-foundation/domain/value-objects/quick-mode-config.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('QuickModeConfig', () => {
  describe('生成する', () => {
    // UT-CF-093
    context('各配列に重複がない場合', () => {
      it('生成できる', () => {
        // Arrange
        const input = {
          allowedCategories: ['a'],
          maintainedLayers: ['L1'],
          relaxedGates: ['g1'],
        };

        // Act
        const actual = new QuickModeConfig(input);

        // Assert
        expect(actual.allowedCategories).toEqual(['a']);
        expect(actual.maintainedLayers).toEqual(['L1']);
        expect(actual.relaxedGates).toEqual(['g1']);
      });
    });

    // UT-CF-094
    context('allowedCategoriesに重複がある場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          allowedCategories: ['a', 'a'],
          maintainedLayers: ['L1'],
          relaxedGates: ['g1'],
        };

        // Act
        const actual = () => new QuickModeConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-095
    context('maintainedLayersに重複がある場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          allowedCategories: ['a'],
          maintainedLayers: ['L1', 'L1'],
          relaxedGates: ['g1'],
        };

        // Act
        const actual = () => new QuickModeConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-096
    context('relaxedGatesに重複がある場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          allowedCategories: ['a'],
          maintainedLayers: ['L1'],
          relaxedGates: ['g1', 'g1'],
        };

        // Act
        const actual = () => new QuickModeConfig(input);

        // Assert
        expect(actual).toThrowError(ConfigValidationError);
      });
    });

    // UT-CF-097
    context('入力配列が未ソートの場合', () => {
      it('順序を保持する', () => {
        // Arrange
        const input = {
          allowedCategories: ['c', 'a', 'b'],
          maintainedLayers: ['L2', 'L1'],
          relaxedGates: ['g2', 'g1'],
        };

        // Act
        const actual = new QuickModeConfig(input);

        // Assert
        expect(actual.allowedCategories).toEqual(['c', 'a', 'b']);
      });
    });
  });

  describe('等値性を判定する', () => {
    // UT-CF-098
    context('同じ配列内容を比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const props = {
          allowedCategories: ['a', 'b'],
          maintainedLayers: ['L1'],
          relaxedGates: ['g1'],
        };
        const left = new QuickModeConfig(props);
        const right = new QuickModeConfig(props);

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-099
    context('allowedCategoriesが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const base = { maintainedLayers: ['L1'], relaxedGates: ['g1'] };
        const left = new QuickModeConfig({ ...base, allowedCategories: ['a'] });
        const right = new QuickModeConfig({ ...base, allowedCategories: ['b'] });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('許可カテゴリと維持レイヤーを判定する', () => {
    // UT-CF-100
    context('含まれるカテゴリを指定する場合', () => {
      it('allowsがtrueを返す', () => {
        // Arrange
        const quickModeConfig = new QuickModeConfig({
          allowedCategories: ['a', 'b'],
          maintainedLayers: ['L1'],
          relaxedGates: ['g1'],
        });

        // Act
        const actual = quickModeConfig.allows('a');

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-101
    context('含まれないカテゴリを指定する場合', () => {
      it('allowsがfalseを返す', () => {
        // Arrange
        const quickModeConfig = new QuickModeConfig({
          allowedCategories: ['a', 'b'],
          maintainedLayers: ['L1'],
          relaxedGates: ['g1'],
        });

        // Act
        const actual = quickModeConfig.allows('c');

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-CF-102
    context('含まれるレイヤーを指定する場合', () => {
      it('maintainsがtrueを返す', () => {
        // Arrange
        const quickModeConfig = new QuickModeConfig({
          allowedCategories: ['a'],
          maintainedLayers: ['L1', 'L2'],
          relaxedGates: ['g1'],
        });

        // Act
        const actual = quickModeConfig.maintains('L1');

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-CF-103
    context('含まれないレイヤーを指定する場合', () => {
      it('maintainsがfalseを返す', () => {
        // Arrange
        const quickModeConfig = new QuickModeConfig({
          allowedCategories: ['a'],
          maintainedLayers: ['L1', 'L2'],
          relaxedGates: ['g1'],
        });

        // Act
        const actual = quickModeConfig.maintains('L3');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
