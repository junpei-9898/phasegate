// @layer test
/**
 * T-042: L0 バリデータ E2E検証
 * validate --layer L0 がバリデータを実行すること
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { createValidatorSystemModule } from '../../../validator-system/composition-root.js';

target('L0 Validator E2E検証', () => {
  context('5層防御モデル', () => {
    it('T-042-01 レジストリにL0-L4の全バリデータが登録されていること', () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const allDefs = mod.registry.getAllDefinitions();
      // Assert — L0(1) + L2(3) + L3(4) + L4(3) = 11
      expect(allDefs).toHaveLength(11);
      const layers = new Set(allDefs.map((d) => d.validatorId.layer));
      expect(layers.has('L0')).toBe(true);
      expect(layers.has('L2')).toBe(true);
      expect(layers.has('L3')).toBe(true);
      expect(layers.has('L4')).toBe(true);
    });

    it('T-042-02 L0バリデータが実行可能であること', async () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const results = await mod.runL0ValidatorsUseCase.execute({});
      // Assert
      expect(results).toHaveLength(1);
      expect(results.every((r) => r.validatorId.startsWith('L0-'))).toBe(true);
    });

    it('T-042-03 L0無効化時にフォールバック（L1-L4のみ）が機能すること', async () => {
      // Arrange
      const mod = createValidatorSystemModule({
        preset: 'standard',
        layers: {
          L0: { enabled: false, validators: ['L0-001'] },
          L2: { enabled: true, validators: ['L2-001', 'L2-002', 'L2-003'] },
          L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'] },
          L4: { enabled: true, validators: ['L4-001', 'L4-002', 'L4-003'] },
        },
      });
      // Act
      const l0Results = await mod.runL0ValidatorsUseCase.execute({});
      // Assert — L0 disabled returns empty
      expect(l0Results).toHaveLength(0);
      // L2 still works
      const l2Defs = mod.registry.listByLayer('L2');
      expect(l2Defs).toHaveLength(3);
    });
  });

  context('RunValidatorsHandler L0サポート', () => {
    it('T-042-04 ハンドラがL0レイヤーをサポートすること', async () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const result = await mod.handlers.runValidators.execute({
        layer: 'L0',
        format: 'agent',
      });
      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(0);
    });
  });
});
