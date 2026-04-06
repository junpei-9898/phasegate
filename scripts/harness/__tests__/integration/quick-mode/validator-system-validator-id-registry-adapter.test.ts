// @layer test
import { describe, it, expect } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ValidatorSystemValidatorIdRegistryAdapter } from '../../../quick-mode/infrastructure/adapters/validator-system-validator-id-registry-adapter.js';

target('ValidatorSystemValidatorIdRegistryAdapter', () => {
  describe('IDレジストリ検証', () => {
    // IT-REPO-Registry-001
    it('getAllValidatorIdsがintegration_contract.md §9の全ID（L1-001〜L4-003）を返すこと', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();
      // Act
      const actual = adapter.getAllValidatorIds();
      // Assert
      const expected = [
        'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
        'L2-001', 'L2-002', 'L2-003',
        'L3-001', 'L3-002', 'L3-003', 'L3-004',
        'L4-001', 'L4-002', 'L4-003',
      ];
      expect(actual).toEqual(expect.arrayContaining(expected));
      expect(actual).toHaveLength(18);
    });

    // IT-REPO-Registry-002
    it('L1 IDが8件（L1-001〜L1-008）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();
      // Act
      const actual = adapter.getAllValidatorIds();
      // Assert
      expect(actual.filter((id: string) => id.startsWith('L1'))).toHaveLength(8);
    });

    // IT-REPO-Registry-003
    it('L2 IDが3件（L2-001〜L2-003）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();
      // Act
      const actual = adapter.getAllValidatorIds();
      // Assert
      expect(actual.filter((id: string) => id.startsWith('L2'))).toHaveLength(3);
    });

    // IT-REPO-Registry-004
    it('L3 IDが4件（L3-001〜L3-004）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();
      // Act
      const actual = adapter.getAllValidatorIds();
      // Assert
      expect(actual.filter((id: string) => id.startsWith('L3'))).toHaveLength(4);
    });

    // IT-REPO-Registry-005
    it('L4 IDが3件（L4-001〜L4-003）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();
      // Act
      const actual = adapter.getAllValidatorIds();
      // Assert
      expect(actual.filter((id: string) => id.startsWith('L4'))).toHaveLength(3);
    });

    // IT-REPO-Registry-006
    it('返却値がreadonly配列であること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();
      // Act
      const actual = adapter.getAllValidatorIds();
      // Assert
      expect(() => {
        (actual as string[]).push('INVALID-ID');
      }).toThrow();
    });
  });
});
