// @layer test
// @unit validator-system
// @story H08-01
/**
 * T-042: L0 runtime hook 案内 E2E検証
 * validate --layer L0 が legacy validator ではなく runtime hook 案内を返すこと
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { createValidatorSystemModule } from '../../../validator-system/composition-root.js';

target('L0 Runtime Hook E2E検証', () => {
  context('5層防御モデル', () => {
    it('T-042-01 レジストリにL2-L4のバリデータのみが登録されていること', () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const actual = mod.registry.getAllDefinitions();
      // Assert — L2(5) + L3(4) + L4(5) = 14
      expect(actual).toHaveLength(14);
      const layers = new Set(actual.map((d) => d.validatorId.layer));
      expect(layers.has('L0')).toBe(false);
      expect(layers.has('L2')).toBe(true);
      expect(layers.has('L3')).toBe(true);
      expect(layers.has('L4')).toBe(true);
    });

    it('T-042-02 L2-L4バリデータが引き続き登録されていること', () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const actual = {
        l2Defs: mod.registry.listByLayer('L2'),
        l3Defs: mod.registry.listByLayer('L3'),
        l4Defs: mod.registry.listByLayer('L4'),
      };
      // Assert
      expect(actual.l2Defs).toHaveLength(5);
      expect(actual.l3Defs).toHaveLength(4);
      expect(actual.l4Defs).toHaveLength(5);
    });

    it('T-042-03 L0設定がなくてもL2-L4が機能すること', () => {
      // Arrange
      const mod = createValidatorSystemModule({
        preset: 'standard',
        layers: {
          L2: { enabled: true, validators: ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014'] },
          L3: { enabled: true, validators: ['L3-001', 'L3-002', 'L3-003', 'L3-004'] },
          L4: { enabled: true, validators: ['L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005'] },
        },
      });
      // Act
      const actual = mod.registry.listByLayer('L2');
      // Assert — L0 disabled returns empty
      expect(actual).toHaveLength(5);
    });
  });

  context('RunValidatorsHandler L0案内', () => {
    it('T-042-04 ハンドラがruntime hook案内を返すこと', async () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const actual = await mod.handlers.runValidators.execute({
        layer: 'L0',
        format: 'agent',
      });
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.output).toContain('L0 validator execution has been retired');
      expect(actual.output).toContain('agent-integration hooks');
      expect(actual.output).not.toContain('L0-001');
    });
  });
});
