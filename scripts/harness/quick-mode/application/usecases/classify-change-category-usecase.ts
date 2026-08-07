/**
 * @layer application
 * @unit quick-mode
 * @story H10-05
 * @work-item-id WI-384
 *
 * paths から変更カテゴリを分類し fullModeRequired 判定と理由を返す UseCase
 */

import { QuickModeJudgmentEngine } from "../../domain/services/quick-mode-judgment-engine.js";
import type { ChangeKind } from "../../domain/types/change-kind.js";
import { ChangedFile } from "../../domain/value-objects/changed-file.js";
import type {
  ChangeCategoryClassificationContract,
  ChangeCategoryPerFile,
} from "../dto/change-category-classification-contract.js";
import type { FileExistencePort } from "../ports/file-existence-port.js";
import type { QuickModeConfigPort } from "../ports/quick-mode-config-port.js";

export interface ClassifyChangeCategoryUseCaseInput {
  readonly paths: readonly string[];
  readonly targetChanges?: readonly {
    readonly filePath: string;
    readonly changeKind?: ChangeKind;
    readonly beforeContent?: string | null;
    readonly afterContent?: string | null;
  }[];
}

export interface ClassifyChangeCategoryUseCaseDeps {
  quickModeConfigPort: QuickModeConfigPort;
  judgmentEngine?: QuickModeJudgmentEngine;
  fileExistencePort?: FileExistencePort;
}

export class ClassifyChangeCategoryUseCase {
  private readonly quickModeConfigPort: QuickModeConfigPort;
  private readonly judgmentEngine: QuickModeJudgmentEngine;
  private readonly fileExistencePort?: FileExistencePort;

  constructor(deps: ClassifyChangeCategoryUseCaseDeps) {
    this.quickModeConfigPort = deps.quickModeConfigPort;
    this.judgmentEngine = deps.judgmentEngine ?? new QuickModeJudgmentEngine();
    this.fileExistencePort = deps.fileExistencePort;
  }

  /**
   * targetChanges 引数自体が渡されない経路（CLI: check-change-category --paths）向けの
   * changeKind 推定。hook 経路は beforeContent=null → CREATE と判定するため、同一パスで
   * CLI=MODIFY(bugfix) / hook=CREATE(feature) に割れていた（WI-334）。
   * ファイルが存在しない場合は CREATE、存在する場合は MODIFY と推定して hook 判定と一致させる。
   * port 未注入・存在チェック失敗時は従来どおり MODIFY 既定（安全側）。
   * なお hook は targetChanges を常に配列（空を含む）で渡すため推定対象外となり、
   * Bash 抽出ターゲット等（配列にエントリが無いパス）の従来挙動は変えない。
   */
  private async inferChangeKind(filePath: string): Promise<ChangeKind> {
    if (this.fileExistencePort === undefined) {
      return "MODIFY";
    }
    try {
      return (await this.fileExistencePort.exists(filePath)) ? "MODIFY" : "CREATE";
    } catch {
      return "MODIFY";
    }
  }

  async execute(input: ClassifyChangeCategoryUseCaseInput): Promise<Readonly<ChangeCategoryClassificationContract>> {
    const config = await this.quickModeConfigPort.getConfig();

    if (input.paths.length === 0) {
      return Object.freeze({
        dominantCategory: null,
        perFile: [],
        fullModeRequired: false,
      });
    }

    const inferenceEnabled = input.targetChanges === undefined;
    const targetChanges = new Map((input.targetChanges ?? []).map((change) => [change.filePath, change]));
    const changedFiles = await Promise.all(
      input.paths.map(async (p) => {
        const targetChange = targetChanges.get(p);
        if (targetChange === undefined && inferenceEnabled) {
          // targetChanges 引数が渡されない経路（CLI）はファイル存在で CREATE/MODIFY を推定する（WI-334）
          return ChangedFile.create({
            filePath: p,
            changeKind: await this.inferChangeKind(p),
            beforeContent: null,
            afterContent: null,
          });
        }
        const beforeContent = targetChange?.beforeContent ?? null;
        const afterContent = targetChange?.afterContent ?? null;
        return ChangedFile.create({
          filePath: p,
          // 変更前の内容が無く変更後の内容がある場合は新規作成 (CREATE) とみなす。
          // 以前は無条件で MODIFY 固定だったため、新規 domain/ ファイルが
          // NEW_DOMAIN 判定を回避して quick mode をすり抜けていた。
          changeKind: targetChange?.changeKind ?? (beforeContent === null && afterContent !== null ? "CREATE" : "MODIFY"),
          beforeContent,
          afterContent,
        });
      }),
    );

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
      perFile.push({ path, category: categoryForFile ?? "unknown" });
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
