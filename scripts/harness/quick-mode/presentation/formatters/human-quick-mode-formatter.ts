/**
 * @layer presentation
 * @unit quick-mode
 *
 * 開発者向けコンソール表示フォーマッター
 */

import type { QuickModeDecisionContract } from '../../application/dto/quick-mode-decision-contract.js';

export class HumanQuickModeFormatter {
  format(decision: QuickModeDecisionContract): string {
    const { eligibility, relaxationProfile } = decision;
    const lines: string[] = [];

    if (eligibility.eligible) {
      lines.push('Quick Mode 判定: ✓ 承認');

      if (relaxationProfile) {
        lines.push('緩和プロファイル:');
        lines.push('  L1: 全維持 (L1-001〜L1-008)');

        const l2Maintained = [...relaxationProfile.l2.maintained].join(', ');
        const l2Skipped = [...relaxationProfile.l2.skipped].join(', ');
        lines.push(`  L2: 維持=[${l2Maintained}] / スキップ=[${l2Skipped}]`);

        const l3Maintained = [...relaxationProfile.l3.maintained].join(', ');
        const l3Skipped = [...relaxationProfile.l3.skipped].join(', ');
        lines.push(`  L3: 維持=[${l3Maintained}] / スキップ=[${l3Skipped}]`);

        lines.push('  L4: 全スキップ');
        lines.push('  2-Phase Execution: 緩和済み');
      }
    } else {
      lines.push('Quick Mode 判定: ✗ 拒否');
      lines.push(`ルール: ${eligibility.rejectionRule ?? ''}`);
      lines.push(`理由: ${eligibility.reason}`);

      if (eligibility.rejectedFiles && eligibility.rejectedFiles.length > 0) {
        lines.push('拒否対象ファイル:');
        for (const file of eligibility.rejectedFiles) {
          lines.push(`  - ${file.filePath} (${file.changeKind})`);
        }
      }
    }

    return lines.join('\n') + '\n';
  }
}
