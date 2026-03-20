import { describe, expect, it } from 'vitest';
import { target, context, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { QuickModeConfig } from '../../../../../quick-mode/domain/value-objects/quick-mode-config.js';

target('QuickModeConfig', () => {
  target('create', () => {
    describe('有効な設定でQuickModeConfigを生成する', () => {
      // UT-QMC-001
      it('allowedCategories/maintainedLayers/relaxedGatesが設定されたQuickModeConfigが生成されること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix', 'docs'],
          maintainedLayers: ['L1'],
          relaxedGates: ['L2-001'],
        };
        // Act
        const actual = QuickModeConfig.create(input);
        // Assert
        expect(actual.allowedCategories).toEqual(['bugfix', 'docs']);
        expect(actual.maintainedLayers).toEqual(['L1']);
        expect(actual.relaxedGates).toEqual(['L2-001']);
      });
    });

    context('allowedCategoriesに空配列が渡された場合', () => {
      // UT-QMC-002
      it('QuickModeConfigErrorが発生すること', () => {
        // Arrange
        const input = { allowedCategories: [], maintainedLayers: ['L1'], relaxedGates: [] };
        // Act
        const actual = () => QuickModeConfig.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context('生成後にObject.freeze()が適用されている場合', () => {
      // UT-QMC-014
      it('プロパティへの再代入が無視（またはエラー）となること', () => {
        // Arrange
        const sut = createQuickModeConfig();
        // Act
        const actual = () => {
          (sut as unknown as Record<string, unknown>)['allowedCategories'] = ['other'];
        };
        // Assert
        expect(Object.isFrozen(sut)).toBe(true);
      });
    });
  });

  target('isAllowed', () => {
    describe('指定カテゴリがallowedCategoriesに含まれるか判定する', () => {
      // UT-QMC-006
      it("allowedCategoriesに'bugfix'が含まれる場合にtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ allowedCategories: ['bugfix', 'docs'] });
        // Act
        const actual = sut.isAllowed('bugfix');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-007
      it("allowedCategoriesに'docs'が含まれない場合にfalseが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ allowedCategories: ['bugfix', 'test'] });
        // Act
        const actual = sut.isAllowed('docs');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('isMaintained', () => {
    describe('指定ValidatorIdがmaintainedLayersに含まれるか判定する', () => {
      // UT-QMC-008
      it("maintainedLayersに'L1'が含まれる場合にtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ maintainedLayers: ['L1'] });
        // Act
        const actual = sut.isMaintained('L1');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-009
      it("maintainedLayersに'L2-001'が含まれない場合にfalseが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ maintainedLayers: ['L1'] });
        // Act
        const actual = sut.isMaintained('L2-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('isRelaxed', () => {
    describe('指定ValidatorIdがrelaxedGatesに含まれるか判定する', () => {
      // UT-QMC-010
      it("relaxedGatesに'L2-001'が含まれる場合にtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ relaxedGates: ['L2-001'] });
        // Act
        const actual = sut.isRelaxed('L2-001');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-011
      it("relaxedGatesに'L3-001'が含まれない場合にfalseが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ relaxedGates: ['L2-001'] });
        // Act
        const actual = sut.isRelaxed('L3-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのQuickModeConfigの値等価性を判定する', () => {
      // UT-QMC-012
      it('同一の設定値を持つ2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeConfig();
        const other = createQuickModeConfig();
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-013
      it('allowedCategoriesが異なる2つのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeConfig({ allowedCategories: ['bugfix'] });
        const other = createQuickModeConfig({ allowedCategories: ['bugfix', 'docs'] });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
