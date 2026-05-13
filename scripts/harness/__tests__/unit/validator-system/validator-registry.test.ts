/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 * @work-item-id WI-156
 */
import { describe, expect, it } from 'vitest';
import { target, context, createValidatorId, createValidatorDefinition, createValidatorRegistry } from '../../helpers/test-helpers.js';
import { ValidatorRegistry, UnknownValidatorError } from '../../../validator-system/domain/services/validator-registry.js';

target('ValidatorRegistry', () => {

  describe('ValidatorDefinitionリストで初期化する', () => {

    it('15件の有効なValidatorDefinitionリストでValidatorRegistryが生成されること (UT-VRG-001)', () => {
      // Arrange
      const ids = ['L2-001','L2-002','L2-003','L2-014','L2-015','L3-001','L3-002','L3-003','L3-004','L4-001','L4-002','L4-003','L4-004','L4-005','L4-006'];
      const layers = ['L2','L2','L2','L2','L2','L3','L3','L3','L3','L4','L4','L4','L4','L4','L4'] as const;
      const defs = ids.map((id, i) =>
        createValidatorDefinition({ validatorId: createValidatorId(id), layer: layers[i] })
      );
      // Act
      const actual = new ValidatorRegistry(defs);
      // Assert
      expect(actual.getAllDefinitions().map((def) => def.validatorId.value)).toEqual([
        'L2-001','L2-002','L2-003','L2-014','L2-015','L3-001','L3-002','L3-003','L3-004','L4-001','L4-002','L4-003','L4-004','L4-005','L4-006',
      ]);
    });

    it('同一validatorIdを持つDefinitionが重複する場合エラーがthrowされること (UT-VRG-002)', () => {
      // Arrange
      const def1 = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const def2 = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      // Act
      const actual = () => new ValidatorRegistry([def1, def2]);
      // Assert
      expect(actual).toThrowError(/duplicate validatorId "L2-001"/);
    });

    it('空リストでValidatorRegistryが生成されること（定義0件） (UT-VRG-003)', () => {
      // Arrange & Act
      const actual = new ValidatorRegistry([]);
      // Assert
      expect(actual.getAllDefinitions()).toEqual([]);
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

    it('15件登録済みのRegistryからgetAllDefinitions()で15件全て返ること (UT-VRG-006/UT-BND-010)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      expect(actual.map((def) => def.validatorId.value)).toEqual([
        'L2-001','L2-002','L2-003','L2-014','L2-015','L3-001','L3-002','L3-003','L3-004','L4-001','L4-002','L4-003','L4-004','L4-005','L4-006',
      ]);
    });

    it('getAllDefinitions()の返却配列は外部から変更不能なreadonly配列であること (UT-VRG-007)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      expect(actual).toEqual([
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L2-001' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L2-002' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L2-003' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L2-014' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L2-015' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L3-001' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L3-002' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L3-003' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L3-004' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L4-001' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L4-002' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L4-003' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L4-004' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L4-005' }) }),
        expect.objectContaining({ validatorId: expect.objectContaining({ value: 'L4-006' }) }),
      ]);
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

    it('layer: L2を渡すとL2-001〜L2-015の5件がvalidatorId昇順で返ること (UT-VRG-008)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L2');
      // Assert
      expect(actual.map((def) => def.validatorId.value)).toEqual(['L2-001', 'L2-002', 'L2-003', 'L2-014', 'L2-015']);
    });

    it('layer: L3を渡すとL3-001〜L3-004の4件が返ること (UT-VRG-009)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L3');
      // Assert
      expect(actual.map((def) => def.validatorId.value)).toEqual(['L3-001', 'L3-002', 'L3-003', 'L3-004']);
    });

    it('layer: L4を渡すとL4-001〜L4-006の6件が返ること (UT-VRG-010)', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L4');
      // Assert
      expect(actual.map((def) => def.validatorId.value)).toEqual(['L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005', 'L4-006']);
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
      expect(actual.map((def) => def.validatorId.value)).toEqual(['L2-001', 'L3-003']);
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
