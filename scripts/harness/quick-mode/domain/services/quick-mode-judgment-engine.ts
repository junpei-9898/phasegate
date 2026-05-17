/**
 * @layer domain
 * @unit quick-mode
 * @work-item-id WI-204
 *
 * ChangedFile[]をChangeClassificationに変換し、3拒否ルールを評価してQuickModeEligibilityを返すドメインサービス
 */

import { ChangeCategory } from '../value-objects/change-category.js';
import { ChangeClassification } from '../value-objects/change-classification.js';
import { QuickModeEligibility } from '../value-objects/quick-mode-eligibility.js';
import { isCommentOnlyDiff } from './comment-only-diff-detector.js';
import type { ChangedFile } from '../value-objects/changed-file.js';
import type { QuickModeConfig } from '../value-objects/quick-mode-config.js';

// リスク順優先度（api > domain > feature > bugfix > test > config > docs）
const RISK_PRIORITY: Record<string, number> = {
  api: 6,
  domain: 5,
  feature: 4,
  bugfix: 3,
  test: 2,
  config: 1,
  docs: 0,
};

function categorizeFile(file: ChangedFile): ChangeCategory {
  const { filePath, changeKind } = file;

  // Config files must stay config even when Edit payload snippets look like
  // comment/whitespace-only diffs. Config recovery guidance depends on this.
  if (
    filePath.endsWith('.config.json') ||
    filePath.endsWith('.config.ts') ||
    filePath.endsWith('phasegate.config.json')
  ) {
    return ChangeCategory.fromString('config');
  }

  if (isCommentOnlyDiff(file)) {
    return ChangeCategory.fromString('docs');
  }

  // api: *port.ts or *adapter.ts（最高優先度）
  if (filePath.endsWith('port.ts') || filePath.endsWith('adapter.ts')) {
    return ChangeCategory.fromString('api');
  }

  // test: __tests__/ 配下 or *.test.ts or *.spec.ts（domainより優先）
  if (
    filePath.includes('__tests__/') ||
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.spec.ts')
  ) {
    return ChangeCategory.fromString('test');
  }

  // domain: domain/ 配下
  if (filePath.includes('/domain/') || filePath.startsWith('domain/')) {
    return ChangeCategory.fromString('domain');
  }

  // docs: docs/ 配下
  if (filePath.startsWith('docs/') || filePath.includes('/docs/')) {
    return ChangeCategory.fromString('docs');
  }

  // feature: domain/ 以外の CREATE
  if (changeKind === 'CREATE') {
    return ChangeCategory.fromString('feature');
  }

  // bugfix: domain/ 以外の MODIFY/DELETE
  return ChangeCategory.fromString('bugfix');
}

export class QuickModeJudgmentEngine {
  classify(changedFiles: readonly ChangedFile[], _config?: QuickModeConfig): ChangeClassification {
    if (changedFiles.length === 0) {
      return new ChangeClassification(null, new Map(), 0);
    }

    const categorizedMap = new Map<string, ChangedFile[]>();
    let dominantCategory: ChangeCategory | null = null;
    let dominantPriority = -1;

    for (const file of changedFiles) {
      const category = categorizeFile(file);
      const key = category.toString();

      if (!categorizedMap.has(key)) {
        categorizedMap.set(key, []);
      }
      categorizedMap.get(key)!.push(file);

      const priority = RISK_PRIORITY[key] ?? 0;
      if (priority > dominantPriority) {
        dominantPriority = priority;
        dominantCategory = category;
      }
    }

    return new ChangeClassification(dominantCategory, categorizedMap, changedFiles.length);
  }

  judge(changedFiles: readonly ChangedFile[], config: QuickModeConfig): QuickModeEligibility {
    const classification = this.classify(changedFiles, config);

    // 1. MIXED_CHANGES評価: allowedCategories 外のカテゴリが含まれる場合
    if (config.isFullModeRequiredFor('mixedCategories')) {
      const notAllowedFiles: ChangedFile[] = [];
      classification.categorizedFiles.forEach((files, categoryKey) => {
        if (!config.isAllowed(categoryKey)) {
          notAllowedFiles.push(...files);
        }
      });

      if (notAllowedFiles.length > 0) {
        return QuickModeEligibility.rejected(
          'MIXED_CHANGES',
          notAllowedFiles,
          `allowedCategories外のファイルが含まれています: ${notAllowedFiles.map((f) => f.filePath).join(', ')}`
        );
      }
    }

    // 2. NEW_DOMAIN評価: domain/ 配下かつ changeKind=CREATE
    if (config.isFullModeRequiredFor('newDomainFile')) {
      const newDomainFiles = changedFiles.filter(
        (f) =>
          (f.filePath.includes('/domain/') || f.filePath.startsWith('domain/')) &&
          f.changeKind === 'CREATE'
      );

      if (newDomainFiles.length > 0) {
        return QuickModeEligibility.rejected(
          'NEW_DOMAIN',
          newDomainFiles,
          `domain/配下に新規ファイルが追加されています: ${newDomainFiles.map((f) => f.filePath).join(', ')}`
        );
      }
    }

    // 3. API_CONTRACT評価: *port.ts / *adapter.ts の変更
    if (config.isFullModeRequiredFor('apiContractChange')) {
      const apiContractFiles = changedFiles.filter(
        (f) => (f.filePath.endsWith('port.ts') || f.filePath.endsWith('adapter.ts')) && !isCommentOnlyDiff(f)
      );

      if (apiContractFiles.length > 0) {
        return QuickModeEligibility.rejected(
          'API_CONTRACT',
          apiContractFiles,
          `Port/Adapterインターフェースファイルの変更が含まれています: ${apiContractFiles.map((f) => f.filePath).join(', ')}`
        );
      }
    }

    return QuickModeEligibility.eligible('すべてのファイルが許可カテゴリ内です');
  }
}
