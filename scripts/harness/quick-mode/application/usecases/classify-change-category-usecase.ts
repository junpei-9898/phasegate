/**
 * @layer application
 * @unit quick-mode
 * @story H10-05
 *
 * paths から変更カテゴリを分類し fullModeRequired 判定と理由を返す UseCase
 */

import { ChangedFile } from '../../domain/value-objects/changed-file.js';
import { QuickModeJudgmentEngine } from '../../domain/services/quick-mode-judgment-engine.js';
import type { QuickModeConfigPort } from '../ports/quick-mode-config-port.js';
import type { ChangeCategoryClassificationContract, ChangeCategoryPerFile } from '../dto/change-category-classification-contract.js';

export interface ClassifyChangeCategoryUseCaseInput {
  readonly paths: readonly string[];
  readonly targetChanges?: readonly {
    readonly filePath: string;
    readonly beforeContent?: string | null;
    readonly afterContent?: string | null;
  }[];
}

export interface ClassifyChangeCategoryUseCaseDeps {
  quickModeConfigPort: QuickModeConfigPort;
  judgmentEngine?: QuickModeJudgmentEngine;
}

export class ClassifyChangeCategoryUseCase {
  private readonly quickModeConfigPort: QuickModeConfigPort;
  private readonly judgmentEngine: QuickModeJudgmentEngine;

  constructor(deps: ClassifyChangeCategoryUseCaseDeps) {
    this.quickModeConfigPort = deps.quickModeConfigPort;
    this.judgmentEngine = deps.judgmentEngine ?? new QuickModeJudgmentEngine();
  }

  async execute(
    input: ClassifyChangeCategoryUseCaseInput
  ): Promise<Readonly<ChangeCategoryClassificationContract>> {
    const config = await this.quickModeConfigPort.getConfig();

    if (input.paths.length === 0) {
      return Object.freeze({
        dominantCategory: null,
        perFile: [],
        fullModeRequired: false,
      });
    }

    const targetChanges = new Map((input.targetChanges ?? []).map((change) => [change.filePath, change]));
    const changedFiles = input.paths.map((p) => {
      const targetChange = targetChanges.get(p);
      return ChangedFile.create({
        filePath: p,
        changeKind: 'MODIFY',
        beforeContent: targetChange?.beforeContent ?? null,
        afterContent: targetChange?.afterContent ?? null,
      });
    });

    const classification = this.judgmentEngine.classify(changedFiles, config);
    const eligibility = this.judgmentEngine.judge(changedFiles, config);

    const perFile: ChangeCategoryPerFile[] = [];
    for (const path of input.paths) {
      const match = changedFiles.find((f) => f.filePath === path);
      if (!match) continue;
      let categoryForFile: string | null = null;
      classification.categorizedFiles.forEach((files, categoryKey) => {
        if (files.some((f) => f.filePath === path)) {
          categoryForFile = categoryKey;
        }
      });
      perFile.push({ path, category: categoryForFile ?? 'unknown' });
    }

    const fullModeRequired = !eligibility.isEligible();

    const contract: ChangeCategoryClassificationContract = fullModeRequired
      ? {
          dominantCategory: classification.dominantCategory?.toString() ?? null,
          perFile,
          fullModeRequired: true,
          rejectionRule: eligibility.rejectionRule,
          rejectionReason: eligibility.reason,
        }
      : {
          dominantCategory: classification.dominantCategory?.toString() ?? null,
          perFile,
          fullModeRequired: false,
        };

    return Object.freeze(contract);
  }
}
