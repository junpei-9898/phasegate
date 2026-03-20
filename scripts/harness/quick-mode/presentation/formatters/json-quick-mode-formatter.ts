/**
 * @layer presentation
 * @unit quick-mode
 *
 * JSON出力フォーマッター
 */

import type { QuickModeDecisionContract } from '../../application/dto/quick-mode-decision-contract.js';

export class JsonQuickModeFormatter {
  format(decision: QuickModeDecisionContract): string {
    return JSON.stringify(decision, null, 2) + '\n';
  }
}
