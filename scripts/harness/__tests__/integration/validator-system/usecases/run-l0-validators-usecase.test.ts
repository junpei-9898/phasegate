import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { createValidatorSystemModule } from '../../../../validator-system/composition-root.js';

target('RunL0ValidatorsUseCase', () => {
  context('L0バリデータ基本動作', () => {
    it('IT-VS-L0-001 L0バリデータがレジストリに登録されていること', () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const l0Defs = mod.registry.listByLayer('L0');
      // Assert
      expect(l0Defs).toHaveLength(1);
      expect(l0Defs[0].validatorId.value).toBe('L0-001');
    });

    it('IT-VS-L0-002 L0バリデータが実行されて結果が返されること', async () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const results = await mod.runL0ValidatorsUseCase.execute({});
      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].validatorId).toBe('L0-001');
    });

    it('IT-VS-L0-003 L0が無効の場合は空配列が返されること', async () => {
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
      const results = await mod.runL0ValidatorsUseCase.execute({});
      // Assert
      expect(results).toHaveLength(0);
    });

    it('IT-VS-L0-004 特定のバリデータIDを指定して実行できること', async () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const results = await mod.runL0ValidatorsUseCase.execute({
        validatorIds: ['L0-001'],
      });
      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].validatorId).toBe('L0-001');
    });
  });

  context('既存L2-L4への影響なし', () => {
    it('IT-VS-L0-005 L2バリデータが引き続き正常動作すること', async () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const l2Defs = mod.registry.listByLayer('L2');
      // Assert
      expect(l2Defs).toHaveLength(3);
      expect(l2Defs.map((d) => d.validatorId.value)).toEqual(['L2-001', 'L2-002', 'L2-003']);
    });
  });
});
