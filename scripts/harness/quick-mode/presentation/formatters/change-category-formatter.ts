/**
 * @layer presentation
 * @unit quick-mode
 * @story H10-05
 *
 * ClassifyChangeCategoryUseCase の出力を human / json フォーマットで整形する
 */

import type { ChangeCategoryClassificationContract } from '../../application/dto/change-category-classification-contract.js';

export type ChangeCategoryOutputFormat = 'human' | 'json';

export class ChangeCategoryFormatter {
  format(
    contract: ChangeCategoryClassificationContract,
    format: ChangeCategoryOutputFormat = 'human'
  ): string {
    if (format === 'json') {
      return JSON.stringify(contract, null, 2) + '\n';
    }

    const lines: string[] = [];
    lines.push(`dominantCategory: ${contract.dominantCategory ?? '(none)'}`);
    lines.push(`fullModeRequired: ${contract.fullModeRequired}`);

    if (contract.fullModeRequired) {
      lines.push(`rejectionRule: ${contract.rejectionRule ?? ''}`);
      if (contract.rejectionReason) {
        lines.push(`rejectionReason: ${contract.rejectionReason}`);
      }
    }

    if (contract.perFile.length > 0) {
      lines.push('perFile:');
      for (const entry of contract.perFile) {
        lines.push(`  ${entry.path} -> ${entry.category}`);
      }
    }

    return lines.join('\n') + '\n';
  }
}
