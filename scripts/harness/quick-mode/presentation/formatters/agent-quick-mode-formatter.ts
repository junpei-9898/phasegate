/**
 * @layer presentation
 * @unit quick-mode
 *
 * AIエージェント向け詳細テキストフォーマッター
 */

import type { QuickModeDecisionContract } from '../../application/dto/quick-mode-decision-contract.js';

export class AgentQuickModeFormatter {
  format(decision: QuickModeDecisionContract): string {
    const { eligibility, relaxationProfile } = decision;
    const lines: string[] = [];

    lines.push(`## Quick Mode Decision`);
    lines.push(`eligible: ${eligibility.eligible}`);
    lines.push(`reason: ${eligibility.reason}`);

    if (!eligibility.eligible) {
      lines.push(`rejectionRule: ${eligibility.rejectionRule ?? ''}`);

      if (eligibility.rejectedFiles && eligibility.rejectedFiles.length > 0) {
        lines.push('');
        lines.push('### Rejected Files');
        for (const file of eligibility.rejectedFiles) {
          lines.push(`- ${file.filePath} [${file.changeKind}]`);
        }
      }
    } else if (relaxationProfile) {
      lines.push('');
      lines.push('### Relaxation Profile');
      lines.push(`levelDependencyRelaxed: ${relaxationProfile.levelDependencyRelaxed}`);
      lines.push(`L1: all=${relaxationProfile.l1.all}`);

      lines.push('');
      lines.push('#### L2 Validators');
      lines.push(`Maintained: ${[...relaxationProfile.l2.maintained].join(', ')}`);
      lines.push(`Skipped: ${[...relaxationProfile.l2.skipped].join(', ')}`);

      lines.push('');
      lines.push('#### L3 Validators');
      lines.push(`Maintained: ${[...relaxationProfile.l3.maintained].join(', ')}`);
      lines.push(`Skipped: ${[...relaxationProfile.l3.skipped].join(', ')}`);

      lines.push('');
      lines.push('#### L4 Validators');
      lines.push(`all: ${relaxationProfile.l4.all} (all skipped)`);

      lines.push('');
      lines.push('#### Phase Execution');
      lines.push(`twoPhaseRequired: ${relaxationProfile.phaseExecution.twoPhaseRequired}`);
    }

    return lines.join('\n') + '\n';
  }
}
