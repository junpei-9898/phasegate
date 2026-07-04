// @layer test
// @unit quick-mode
// @story H10-03
//
// H10-03「Quick Modeバリデータ緩和実行」の受け入れ基準を、実ドメインオブジェクト
// （ValidatorRelaxationService + QuickModeConfig + ValidatorRelaxationProfile）で検証する。
// ドメイン層のモックは使用しない（testing-rules 準拠）。
//
// 対応 AC:
// - AC-1: Quick Mode実行時にL1全ルールが実行される（緩和なし）
// - AC-2: L2の metadata / test-quality は実行され phase-gate はスキップされる
// - AC-3: L3は security のみ実行され、performance/coverage/nyquist はスキップされる
// - AC-4: L4バリデータは全てスキップされる
// - AC-5: 2-Phase Execution が緩和される（twoPhaseRequired=false / levelDependencyRelaxed=false）
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers.js';
import { ValidatorRelaxationService } from '../../../../../quick-mode/domain/services/validator-relaxation-service.js';
import { QuickModeConfig } from '../../../../../quick-mode/domain/value-objects/quick-mode-config.js';

// L1〜L4 の全 ValidatorId（配布 config の想定カタログ）
const ALL_VALIDATOR_IDS = [
  'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
  'L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005', 'L4-006',
];

// L2-002=metadata / L2-003=test-quality を維持、phase-gate 系(L2-001)をスキップ、
// L3-001=security のみ維持、L4 全スキップ、という H10-03 の緩和構成を表す実 config。
const createQuickModeRelaxationConfig = (): QuickModeConfig =>
  QuickModeConfig.create({
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L2-014', 'L3-001'],
    relaxedGates: ['L2-001', '2-phase-execution'],
  });

const service = new ValidatorRelaxationService();

target('H10-03 Quick Modeバリデータ緩和実行', () => {
  context('ValidatorRelaxationService が Quick Mode の緩和構成を生成する場合', () => {
    // AC-1
    describe('AC-1: L1全ルールが緩和なしで実行される', () => {
      it('生成プロファイルの l1.all が true になり L1 が緩和対象から除外されること', () => {
        // Arrange
        const config = createQuickModeRelaxationConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l1.all).toBe(true);
      });
    });

    // AC-2
    describe('AC-2: L2はmetadata/test-qualityを実行しphase-gateをスキップする', () => {
      it('l2.maintained に metadata(L2-002)/test-quality(L2-003) が含まれ、phase-gate系(L2-001)がskippedに入ること', () => {
        // Arrange
        const config = createQuickModeRelaxationConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
        expect(actual.l2.skipped).toContain('L2-001');
        expect(actual.l2.maintained).not.toContain('L2-001');
      });
    });

    // AC-3
    describe('AC-3: L3はsecurityのみ実行しperformance/coverage/nyquistをスキップする', () => {
      it('l3.maintained が security(L3-001) のみになり、残りL3が全てskippedに入ること', () => {
        // Arrange
        const config = createQuickModeRelaxationConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l3.maintained).toEqual(['L3-001']);
        expect([...actual.l3.skipped].sort()).toEqual(['L3-002', 'L3-003', 'L3-004']);
      });
    });

    // AC-4
    describe('AC-4: L4バリデータは全てスキップされる', () => {
      it('l4.all が false になり、L4がmaintained対象に含まれないこと', () => {
        // Arrange
        const config = createQuickModeRelaxationConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l4.all).toBe(false);
        expect(actual.l2.maintained.some((id) => id.startsWith('L4-'))).toBe(false);
        expect(actual.l3.maintained.some((id) => id.startsWith('L4-'))).toBe(false);
      });
    });

    // AC-5
    describe('AC-5: 2-Phase Executionが緩和される', () => {
      it('phaseExecution.twoPhaseRequired が false になり、levelDependencyRelaxed も false（レイヤー依存は不変）であること', () => {
        // Arrange
        const config = createQuickModeRelaxationConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
        expect(actual.levelDependencyRelaxed).toBe(false);
      });
    });
  });
});
