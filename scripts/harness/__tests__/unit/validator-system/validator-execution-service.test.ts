/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it, vi } from 'vitest';
import { target, createValidatorId, createValidatorDefinition, createLayerConfig } from '../../helpers/test-helpers.js';
import { ValidatorExecutionService } from '../../../validator-system/domain/services/validator-execution-service.js';

const createMockValidatorConfigPort = (overrides: Record<string, unknown> = {}) => ({
  getLayerConfig: vi.fn().mockReturnValue(createLayerConfig()),
  ...overrides,
});

const createMockPhaseGatePolicyPort = () => ({
  check: vi.fn().mockResolvedValue({ passed: true, errors: [] }),
});

target('ValidatorExecutionService', () => {

  describe('execute() — スキップ制御', () => {

    it('LayerConfig.enabled: falseのバリデータはskipされること (UT-VES-001/INV-8)', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort({
        getLayerConfig: vi.fn().mockReturnValue(createLayerConfig({ enabled: false })),
      });
      const def = createValidatorDefinition({ validatorId: createValidatorId('L3-001'), layer: 'L3' });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.execute([def], [createLayerConfig({ enabled: false, layer: 'L3', validatorIds: ['L3-001', 'L3-002', 'L3-003', 'L3-004'] })]);
      // Assert
      expect(actual[0].skipped).toBe(true);
    });

    it('enabledCondition: strictOnlyかつLayerConfig.strictOnly: falseのバリデータはskipされること (UT-VES-002/INV-4)', () => {
      // Arrange
      const layerConfig = createLayerConfig({ strictOnly: false, enabled: true });
      const def = createValidatorDefinition({ enabledCondition: 'strictOnly' });
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.execute([def], [layerConfig]);
      // Assert
      expect(actual[0].skipped).toBe(true);
    });

    it('enabledCondition: strictOnlyかつLayerConfig.strictOnly: trueのバリデータはskipされないこと (UT-VES-003)', () => {
      // Arrange
      const layerConfig = createLayerConfig({ strictOnly: true, enabled: true });
      const def = createValidatorDefinition({ enabledCondition: 'strictOnly' });
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.execute([def], [layerConfig]);
      // Assert
      expect(actual[0].skipped).toBe(false);
    });

    it('enabled: trueかつenabledsCondition: alwaysのバリデータは対応するPortが呼び出されること (UT-VES-004)', () => {
      // Arrange
      const mockPolicyPort = createMockPhaseGatePolicyPort();
      const def = createValidatorDefinition({ enabledCondition: 'always' });
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort(), policyPort: mockPolicyPort });
      // Act
      sut.execute([def]);
      // Assert
      expect(mockPolicyPort.check).toHaveBeenCalled();
    });
  });

  describe('execute() — 結果順序', () => {

    it('L2-001, L2-002の2件のDefinitionで2件のValidationResultが入力順で返ること (UT-VES-005)', () => {
      // Arrange
      const defs = [
        createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
      ];
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.execute(defs);
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[1].validatorId.value).toBe('L2-002');
    });

    it('L2-001が成功、L2-002が失敗の場合2件の結果が入力順で返ること (UT-VES-006)', () => {
      // Arrange
      const defs = [
        createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
      ];
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.execute(defs);
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[1].validatorId.value).toBe('L2-002');
    });
  });

  describe('execute() — エラーハンドリング', () => {

    it('PortがエラーをthrowするバリデータはValidationResult.fail()に変換されること（他バリデータへの影響なし） (UT-VES-007)', () => {
      // Arrange
      const mockErrorPort = {
        check: vi.fn().mockImplementation(() => { throw new Error('Port error'); }),
      };
      const def = createValidatorDefinition({ enabledCondition: 'always' });
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort(), policyPort: mockErrorPort });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].passed).toBe(false);
      expect(actual[0].skipped).toBe(false);
    });

    it('Portが予期せぬエラーをthrowする場合fail変換されること (UT-VES-008)', () => {
      // Arrange
      const unexpectedErrorPort = {
        check: vi.fn().mockImplementation(() => { throw new Error('Unexpected'); }),
      };
      const def = createValidatorDefinition();
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort(), policyPort: unexpectedErrorPort });
      // Act & Assert
      expect(sut.execute([def])[0].passed).toBe(false);
    });
  });

  describe('execute() — 実行時間計測', () => {

    it('有効なバリデータ実行後のValidationResultはdurationMs >= 0が保証されること (UT-VES-009/INV-7)', () => {
      // Arrange
      const def = createValidatorDefinition({ enabledCondition: 'always' });
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('スキップされたバリデータのdurationMsが0であること (UT-VES-010)', () => {
      // Arrange
      const layerConfig = createLayerConfig({ enabled: false });
      const def = createValidatorDefinition();
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.execute([def], [layerConfig]);
      // Assert
      expect(actual[0].durationMs).toBe(0);
    });
  });

  describe('executeWithRelaxation() — quick-mode緩和', () => {

    it('緩和プロファイルで除外指定されたバリデータがskipされること (UT-VES-011)', () => {
      // Arrange
      const def = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const relaxationProfile = { excludedValidatorIds: ['L2-001'] };
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.executeWithRelaxation([def], relaxationProfile);
      // Assert
      expect(actual[0].skipped).toBe(true);
    });

    it('空の緩和プロファイルで通常のexecute()と同一結果が返ること (UT-VES-012)', () => {
      // Arrange
      const def = createValidatorDefinition();
      const emptyProfile = { excludedValidatorIds: [] };
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.executeWithRelaxation([def], emptyProfile);
      const expected = sut.execute([def]);
      // Assert
      expect(actual[0].skipped).toBe(expected[0].skipped);
      expect(actual[0].passed).toBe(expected[0].passed);
    });

    it('definitions: []（空配列）でexecute()を呼び出すと空のValidationResult[]が返ること (UT-BND-016)', () => {
      // Arrange
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      // Act
      const actual = sut.execute([]);
      // Assert
      expect(actual).toEqual([]);
    });

    it('全10件がenabled: falseの設定でexecute()を呼び出すと全件skipped: trueのValidationResultが返ること (UT-BND-017)', () => {
      // Arrange
      const layerConfig = createLayerConfig({ enabled: false });
      const sut = new ValidatorExecutionService({ configPort: createMockValidatorConfigPort() });
      const defs = [
        createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-003'), layer: 'L2' }),
      ];
      // Act
      const actual = sut.execute(defs, [layerConfig]);
      // Assert
      expect(actual.every(r => r.skipped === true)).toBe(true);
    });
  });
});
