// @layer test
// @unit quick-mode
// @story H10-01
import { describe, expect, it } from 'vitest';
import { target, context, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { QuickModeConfig, QuickModeConfigError } from '../../../../../quick-mode/domain/value-objects/quick-mode-config.js';

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
        expect(actual).toThrowError(QuickModeConfigError);
        expect(actual).toThrowError('allowedCategories must not be empty');
      });
    });

    context('生成後にObject.freeze()が適用されている場合', () => {
      // UT-QMC-014
      it('プロパティへの再代入が無視（またはエラー）となること', () => {
        // Arrange
        const sut = createQuickModeConfig({ allowedCategories: ['bugfix'] });
        // Act
        const actual = () => {
          (sut as unknown as Record<string, unknown>)['allowedCategories'] = ['other'];
        };
        // Assert
        expect(actual).toThrowError(TypeError);
        expect(sut.allowedCategories).toEqual(['bugfix']);
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

      // UT-QMC-021（レイヤー名エントリのプレフィックスマッチ回帰）
      it("maintainedLayersにレイヤー名'L2'が含まれる場合にそのレイヤーの個別ID'L2-002'に対してtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ maintainedLayers: ['L1', 'L2'] });
        // Act
        const actual = sut.isMaintained('L2-002');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-022（ID完全一致の後方互換）
      it("maintainedLayersにID完全一致'L2-002'が含まれる場合に'L2-002'に対してtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ maintainedLayers: ['L2-002'] });
        // Act
        const actual = sut.isMaintained('L2-002');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-023（別レイヤーには波及しない）
      it("maintainedLayersにレイヤー名'L2'のみが含まれる場合に別レイヤーの'L3-001'に対してfalseが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ maintainedLayers: ['L1', 'L2'] });
        // Act
        const actual = sut.isMaintained('L3-001');
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

      // UT-QMC-020（H10-05）
      it('fullModeRequiredWhenが異なる2つのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeConfig({
          fullModeRequiredWhen: { mixedCategories: true, newDomainFile: true, apiContractChange: true },
        });
        const other = createQuickModeConfig({
          fullModeRequiredWhen: { mixedCategories: false, newDomainFile: true, apiContractChange: true },
        });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('fullModeRequiredWhen (H10-05)', () => {
    describe('未指定時はデフォルト値（全 true）が設定される', () => {
      // UT-QMC-015
      it('fullModeRequiredWhenを省略した場合にmixedCategories/newDomainFile/apiContractChangeが全てtrueとなること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix'],
          maintainedLayers: ['L1'],
          relaxedGates: [],
        };
        // Act
        const actual = QuickModeConfig.create(input);
        // Assert
        expect(actual.fullModeRequiredWhen.mixedCategories).toBe(true);
        expect(actual.fullModeRequiredWhen.newDomainFile).toBe(true);
        expect(actual.fullModeRequiredWhen.apiContractChange).toBe(true);
      });
    });

    describe('明示指定された値が保持される', () => {
      // UT-QMC-016
      it('fullModeRequiredWhen={mixedCategories:false, newDomainFile:true, apiContractChange:false}が保持されること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix'],
          maintainedLayers: ['L1'],
          relaxedGates: [],
          fullModeRequiredWhen: {
            mixedCategories: false,
            newDomainFile: true,
            apiContractChange: false,
          },
        };
        // Act
        const actual = QuickModeConfig.create(input);
        // Assert
        expect(actual.fullModeRequiredWhen.mixedCategories).toBe(false);
        expect(actual.fullModeRequiredWhen.newDomainFile).toBe(true);
        expect(actual.fullModeRequiredWhen.apiContractChange).toBe(false);
      });
    });

    target('isFullModeRequiredFor', () => {
      describe('指定ルールのfullModeRequired判定', () => {
        // UT-QMC-017
        it("fullModeRequiredWhen.mixedCategories=trueかつrule='mixedCategories'の場合にtrueが返ること", () => {
          // Arrange
          const sut = createQuickModeConfig({
            fullModeRequiredWhen: { mixedCategories: true, newDomainFile: false, apiContractChange: false },
          });
          // Act
          const actual = sut.isFullModeRequiredFor('mixedCategories');
          // Assert
          expect(actual).toBe(true);
        });

        // UT-QMC-018
        it("fullModeRequiredWhen.newDomainFile=falseかつrule='newDomainFile'の場合にfalseが返ること", () => {
          // Arrange
          const sut = createQuickModeConfig({
            fullModeRequiredWhen: { mixedCategories: true, newDomainFile: false, apiContractChange: true },
          });
          // Act
          const actual = sut.isFullModeRequiredFor('newDomainFile');
          // Assert
          expect(actual).toBe(false);
        });

        // UT-QMC-019
        it("fullModeRequiredWhen.apiContractChange=trueかつrule='apiContractChange'の場合にtrueが返ること", () => {
          // Arrange
          const sut = createQuickModeConfig({
            fullModeRequiredWhen: { mixedCategories: false, newDomainFile: false, apiContractChange: true },
          });
          // Act
          const actual = sut.isFullModeRequiredFor('apiContractChange');
          // Assert
          expect(actual).toBe(true);
        });
      });
    });
  });

  // @work-item-id WI-372
  target('categoryOverrides', () => {
    context('categoryOverrides が未指定の場合', () => {
      // UT-QMC-018 (WI-372)
      it('空の CategoryOverrideRules が設定されること', () => {
        // Arrange
        const input = { allowedCategories: ['bugfix'], maintainedLayers: ['L1'], relaxedGates: [] };
        // Act
        const actual = QuickModeConfig.create(input);
        // Assert
        expect(actual.categoryOverrides.isEmpty()).toBe(true);
      });
    });

    context('categoryOverrides が指定された場合', () => {
      // UT-QMC-019 (WI-372)
      it('指定された glob ルールが保持されること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix'],
          maintainedLayers: ['L1'],
          relaxedGates: [],
          categoryOverrides: { docs: ['results/**'] },
        };
        // Act
        const actual = QuickModeConfig.create(input);
        // Assert
        expect(actual.categoryOverrides.resolve('results/a.md')?.toString()).toBe('docs');
      });
    });

    describe('equals は categoryOverrides の差分を検出する', () => {
      // UT-QMC-023 (WI-372)
      it('categoryOverrides だけが異なる場合に false が返ること', () => {
        // Arrange
        const sut = createQuickModeConfig({ categoryOverrides: { docs: ['results/**'] } });
        const other = createQuickModeConfig({ categoryOverrides: { docs: ['notes/**'] } });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // @work-item-id WI-373
  target('allowedCategories の enum 検証', () => {
    context('allowedCategories に未知のカテゴリが含まれる場合', () => {
      // UT-QMC-020
      it('QuickModeConfigError が発生すること', () => {
        // Arrange
        const input = { allowedCategories: ['bugfix', 'typoo'], maintainedLayers: ['L1'], relaxedGates: [] };
        // Act
        const actual = () => QuickModeConfig.create(input);
        // Assert
        expect(actual).toThrowError(QuickModeConfigError);
        expect(actual).toThrowError('allowedCategories contains unknown category "typoo"');
      });
    });

    context('allowedCategories に大文字混じりの値が含まれる場合', () => {
      // UT-QMC-021
      it('正規化されず QuickModeConfigError が発生すること', () => {
        // Arrange
        const input = { allowedCategories: ['Docs'], maintainedLayers: ['L1'], relaxedGates: [] };
        // Act
        const actual = () => QuickModeConfig.create(input);
        // Assert
        expect(actual).toThrowError(QuickModeConfigError);
      });
    });

    describe('ChangeCategory 7 値はすべて受理される', () => {
      // UT-QMC-022
      it('bugfix/docs/test/config/feature/domain/api を指定しても例外が発生しないこと', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'feature', 'domain', 'api'],
          maintainedLayers: ['L1'],
          relaxedGates: [],
        };
        // Act
        const actual = QuickModeConfig.create(input);
        // Assert
        expect(actual.allowedCategories).toHaveLength(7);
      });
    });
  });
});
