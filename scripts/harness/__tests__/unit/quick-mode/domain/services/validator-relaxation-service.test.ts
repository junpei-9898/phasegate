// @layer test
// @unit quick-mode
// @story H10-02
import { describe, expect, it } from 'vitest';
import { target, context, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { ValidatorRelaxationService } from '../../../../../quick-mode/domain/services/validator-relaxation-service.js';

const service = new ValidatorRelaxationService();

// L1〜L4の全ValidatorId一覧（テスト用）
const ALL_VALIDATOR_IDS = [
  'L1-001', 'L1-002',
  'L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005', 'L4-006',
];

target('ValidatorRelaxationService', () => {
  target('build', () => {
    describe('QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する', () => {
      // UT-VRS-001
      it('デフォルト設定と全ValidatorId（L1-001〜L4-006）が渡された場合にデフォルト緩和プロファイルが生成されること', () => {
        // Arrange
        const config = createQuickModeConfig(); // relaxedGates: ['L2-001'], maintainedLayers includes L2-014
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l2.skipped).toContain('L2-001');
        expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003', 'L2-014']));
        expect(actual.l3.maintained).toContain('L3-001');
        expect(actual.l3.skipped).toEqual(expect.arrayContaining(['L3-002', 'L3-003', 'L3-004']));
      });

      // UT-VRS-002
      it('maintainedLayersにL2-001が含まれる設定が渡された場合にl2.maintainedにL2-001が含まれること', () => {
        // Arrange
        const config = createQuickModeConfig({
          maintainedLayers: ['L1', 'L2-001'],
          relaxedGates: [],
        });
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l2.maintained).toContain('L2-001');
      });

      // UT-VRS-003
      it('デフォルト維持対象外のL2がl2.skippedに含まれること', () => {
        // Arrange
        const config = createQuickModeConfig({ relaxedGates: ['L2-001'] });
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l2.skipped).toEqual(['L2-001', 'L2-013', 'L2-015']);
        expect(actual.l2.maintained).toContain('L2-014');
      });

      // UT-VRS-004
      it('L1の全IDが渡された場合にl1.all=trueが設定されること（INV-P2保証）', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l1.all).toBe(true);
      });

      // UT-VRS-005
      it('L4のIDが渡された場合にl4.all=falseが設定されること（INV-P3保証）、L4はスキップされること', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l4.all).toBe(false);
      });

      // UT-VRS-006
      it("allValidatorIdsに認識できないID（'X1-999'）が含まれる場合に無視されてエラーが発生しないこと", () => {
        // Arrange
        const config = createQuickModeConfig();
        const allValidatorIdsWithUnknown = [...ALL_VALIDATOR_IDS, 'X1-999'];
        // Act
        const actual = service.build(config, allValidatorIdsWithUnknown);
        // Assert
        expect(actual.l2).toEqual({
          maintained: ['L2-002', 'L2-003', 'L2-014'],
          skipped: ['L2-001', 'L2-013', 'L2-015'],
        });
      });

      // UT-VRS-007
      it('生成されたプロファイルのlevelDependencyRelaxedが常にfalseであること（INV-P1保証）', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
      });

      // UT-VRS-008
      it('生成されたプロファイルのphaseExecution.twoPhaseRequiredが常にfalseであること（INV-P4保証）', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      });
    });
  });
});
