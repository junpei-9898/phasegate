import { describe, it, expect } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { HumanQuickModeFormatter } from '../../../../quick-mode/presentation/formatters/human-quick-mode-formatter.js';
import type { QuickModeDecisionContract } from '../../../../quick-mode/application/dto/quick-mode-decision-contract.js';

function createApprovedDecision(): QuickModeDecisionContract {
  return {
    eligibility: {
      eligible: true,
      reason: 'すべてのファイルが許可カテゴリ内です',
    },
    relaxationProfile: {
      levelDependencyRelaxed: false as const,
      l1: { all: true as const },
      l2: {
        maintained: ['L2-002', 'L2-003'],
        skipped: ['L2-001'],
      },
      l3: {
        maintained: ['L3-001'],
        skipped: ['L3-002', 'L3-003', 'L3-004'],
      },
      l4: { all: false as const },
      phaseExecution: { twoPhaseRequired: false as const },
    },
  };
}

function createRejectedDecision(rule: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT' = 'MIXED_CHANGES'): QuickModeDecisionContract {
  return {
    eligibility: {
      eligible: false,
      reason: `${rule} ルールにより拒否されました`,
      rejectionRule: rule,
      rejectedFiles: [{ filePath: 'src/domain/vo.ts', changeKind: 'MODIFY' }],
    },
    relaxationProfile: undefined,
  };
}

target('HumanQuickModeFormatter', () => {
  describe('eligible=trueの決定を人間可読形式にフォーマットする', () => {
    // IT-API-HumanFmt-001
    it('承認されたDecisionで"Quick Mode 判定: ✓ 承認"を含む文字列が返り、末尾に改行がある', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createApprovedDecision();
      // Act
      const actual = formatter.format(input);
      // Assert
      expect(actual).toContain('Quick Mode 判定');
      expect(actual).toContain('承認');
      expect(actual).toContain('L2-002');
      expect(actual).toContain('L2-003');
      expect(actual).toContain('L2-001');
      expect(actual).toContain('L3-001');
      expect(actual.endsWith('\n')).toBe(true);
    });
  });

  describe('eligible=falseの決定を人間可読形式にフォーマットする', () => {
    // IT-API-HumanFmt-002
    it('MIXED_CHANGESで拒否されたDecisionで"Quick Mode 判定: ✗ 拒否"と拒否ファイルが表示される', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input: QuickModeDecisionContract = {
        eligibility: {
          eligible: false,
          reason: 'MIXED_CHANGES ルールにより拒否されました',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
        },
        relaxationProfile: undefined,
      };
      // Act
      const actual = formatter.format(input);
      // Assert
      expect(actual).toContain('拒否');
      expect(actual).toContain('MIXED_CHANGES');
      expect(actual).toContain('src/x.ts');
      expect(actual.endsWith('\n')).toBe(true);
    });

    // IT-API-HumanFmt-003
    it('NEW_DOMAINで拒否されたDecisionで"NEW_DOMAIN"が出力に含まれる', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createRejectedDecision('NEW_DOMAIN');
      // Act
      const actual = formatter.format(input);
      // Assert
      expect(actual).toContain('NEW_DOMAIN');
    });

    // IT-API-HumanFmt-004
    it('API_CONTRACTで拒否されたDecisionで"API_CONTRACT"が出力に含まれる', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createRejectedDecision('API_CONTRACT');
      // Act
      const actual = formatter.format(input);
      // Assert
      expect(actual).toContain('API_CONTRACT');
    });
  });

  describe('決定論的出力', () => {
    // IT-API-HumanFmt-005
    it('同一入力に対して複数回呼び出しても同一の出力が返る', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createApprovedDecision();
      // Act
      const actual1 = formatter.format(input);
      const actual2 = formatter.format(input);
      // Assert
      expect(actual1).toEqual(actual2);
    });
  });
});
