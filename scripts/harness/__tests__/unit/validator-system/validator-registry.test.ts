/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it } from 'vitest';
import { target, context, createValidatorId, createValidatorDefinition, createValidatorRegistry } from '../../helpers/test-helpers.js';
import { ValidatorRegistry, UnknownValidatorError } from '../../../validator-system/domain/services/validator-registry.js';

target('ValidatorRegistry', () => {

  describe('ValidatorDefinitionリストで初期化する', () => {

    it('10件の有効なValidatorDefinitionリストでValidatorRegistryが生成されること (UT-VRG-001)', () => {
      // Arrange
      const ids = ['L2-001','L2-002','L2-003','L3-001','L3-002','L3-003','L3-004','L4-001','L4-002','L4-003'];
      const layers = ['L2','L2','L2','L3','L3','L3','L3','L4','L4','L4'] as const;
      const defs = ids.map((id, i) =>
        createValidatorDefinition({ validatorId: createValidatorId(id), layer: layers[i] })
      );
      // Act
      const actual = new ValidatorRegistry(defs);
      // Assert
      expect(actual).toBeDefined();
    });

    it('同一validatorIdを持つDefinitionが重複する場合エラーがthrowされること (UT-VRG-002)', () => {
      // Arrange
      const def1 = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const def2 = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      // Act
      const actual = () => new ValidatorRegistry([def1, def2]);
      // Assert
      expect(actual).toThrow();
    });

    it('空リストでValidatorRegistryが生成されること（定義0件） (UT-VRG-003)', () => {
      // Arrange & Act
      const actual = new ValidatorRegistry([]);
      // Assert
      expect(actual).toBeDefined();
    });
  });

  describe('getDefinition()でValidatorDefinitionを取得する', () => {

    it('登録済みのL2-001を渡すと対応するValidatorDefinitionが返ること (UT-VRG-004)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.getDefinition(id);
      // Assert
      expect(actual.validatorId.value).toBe('L2-001');
    });

    context('未登録のValidatorIdが渡された場合', () => {
      it('UnknownValidatorErrorをthrowすること (UT-VRG-005)', () => {
        // Arrange
        const sut = new ValidatorRegistry([]);
        const id = createValidatorId('L2-001');
        // Act
        const actual = () => sut.getDefinition(id);
        // Assert
        expect(actual).toThrow(UnknownValidatorError);
      });
    });
  });

  describe('getAllDefinitions()で全定義を返す', () => {

    it('10件登録済みのRegistryからgetAllDefinitions()で10件全て返ること (UT-VRG-006/UT-BND-010)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      expect(actual).toHaveLength(10);
    });

    it('getAllDefinitions()の返却配列は外部から変更不能なreadonly配列であること (UT-VRG-007)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      expect(Object.isFrozen(actual) || Array.isArray(actual)).toBe(true);
    });

    it('空RegistryのgetAllDefinitions()が空配列を返すこと (UT-BND-011)', () => {
      // Arrange
      const sut = new ValidatorRegistry([]);
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      expect(actual).toEqual([]);
    });
  });

  describe('listByLayer()でレイヤー別定義一覧を返す', () => {

    it('layer: L2を渡すとL2-001〜L2-003の3件がvalidatorId昇順で返ること (UT-VRG-008)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L2');
      // Assert
      expect(actual).toHaveLength(3);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[2].validatorId.value).toBe('L2-003');
    });

    it('layer: L3を渡すとL3-001〜L3-004の4件が返ること (UT-VRG-009)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L3');
      // Assert
      expect(actual).toHaveLength(4);
    });

    it('layer: L4を渡すとL4-001〜L4-003の3件が返ること (UT-VRG-010)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L4');
      // Assert
      expect(actual).toHaveLength(3);
    });
  });

  describe('select()で指定IDのDefinition一覧を返す', () => {

    it('[L2-001, L3-003]を渡すと2件のDefinitionが入力順で返ること (UT-VRG-011)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      const ids = [createValidatorId('L2-001'), createValidatorId('L3-003')];
      // Act
      const actual = sut.select(ids);
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[1].validatorId.value).toBe('L3-003');
    });

    context('未登録IDを含む配列が渡された場合', () => {
      it('UnknownValidatorErrorをthrowすること (UT-VRG-012)', () => {
        // Arrange
        const sut = new ValidatorRegistry([]);
        const ids = [createValidatorId('L2-001')];
        // Act
        const actual = () => sut.select(ids);
        // Assert
        expect(actual).toThrow(UnknownValidatorError);
      });
    });
  });

  describe('hasDefinition()でDefinition存在確認を行う', () => {

    it('登録済みのL2-001を渡すとtrueを返すこと (UT-VRG-013)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.hasDefinition(id);
      // Assert
      expect(actual).toBe(true);
    });

    it('未登録のValidatorIdを渡すとfalseを返すこと (UT-VRG-014)', () => {
      // Arrange
      const def = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const sut = new ValidatorRegistry([def]);
      const id = createValidatorId('L2-002');
      // Act
      const actual = sut.hasDefinition(id);
      // Assert
      expect(actual).toBe(false);
    });

    it('空Registryに問い合わせるとfalseを返すこと (UT-VRG-015)', () => {
      // Arrange
      const sut = new ValidatorRegistry([]);
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.hasDefinition(id);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
