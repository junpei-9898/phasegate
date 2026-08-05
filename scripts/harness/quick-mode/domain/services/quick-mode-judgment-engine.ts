/**
 * @layer domain
 * @unit quick-mode
 * @work-item-id WI-204
 * @work-item-id WI-349
 *
 * ChangedFile[]をChangeClassificationに変換し、3拒否ルールを評価してQuickModeEligibilityを返すドメインサービス
 */

import { ChangeCategory } from "../value-objects/change-category.js";
import { ChangeClassification } from "../value-objects/change-classification.js";
import type { ChangedFile } from "../value-objects/changed-file.js";
import type { QuickModeConfig } from "../value-objects/quick-mode-config.js";
import { QuickModeEligibility } from "../value-objects/quick-mode-eligibility.js";
import { isCommentOnlyDiff } from "./comment-only-diff-detector.js";

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
    filePath.endsWith(".config.json") ||
    filePath.endsWith(".config.ts") ||
    filePath.endsWith("phasegate.config.json")
  ) {
    return ChangeCategory.fromString("config");
  }

  // config: .github/workflows/ 配下の CI workflow（.yml / .yaml）。
  // CI workflow は unit を持たない構成ファイルであり、CREATE でも config に分類する。
  // 内容レベルの防御は L3-006 injection scanner と integrity pin が担う
  // （WI-261 の skills/**/*.md → docs 分類と同型の判断）。
  // MODIFY がフォールバックで bugfix として quick を通過する現状との整合も取る。
  // .github/ 全体には広げず workflows/ 配下の yml/yaml に限定し、
  // それ以外の .github/ 配下は従来どおりフォールバック（fail-closed）を維持する。
  // @work-item-id WI-334
  if (filePath.startsWith(".github/workflows/") && (filePath.endsWith(".yml") || filePath.endsWith(".yaml"))) {
    return ChangeCategory.fromString("config");
  }

  if (isCommentOnlyDiff(file)) {
    return ChangeCategory.fromString("docs");
  }

  // api: *port.ts or *adapter.ts（最高優先度）
  if (filePath.endsWith("port.ts") || filePath.endsWith("adapter.ts")) {
    return ChangeCategory.fromString("api");
  }

  // test: __tests__/ 配下 or *.test.ts or *.spec.ts（domainより優先）
  if (filePath.includes("__tests__/") || filePath.endsWith(".test.ts") || filePath.endsWith(".spec.ts")) {
    return ChangeCategory.fromString("test");
  }

  // domain: domain/ 配下
  if (filePath.includes("/domain/") || filePath.startsWith("domain/")) {
    return ChangeCategory.fromString("domain");
  }

  // docs: docs/ 配下
  if (filePath.startsWith("docs/") || filePath.includes("/docs/")) {
    return ChangeCategory.fromString("docs");
  }

  // docs: skills/ 配下の .md（指示文書。SKILL.md / references/*.md 等）は
  // ソースコードのフェーズゲート対象外とし docs に分類する。品質・完全性は
  // 専用防御（skill-quality corpus 適合テスト・advisory allowlist pin・
  // integrity pin(WI-254)・L3-006 injection scanner(WI-259)）が担う。
  // skills/ 配下の非 .md は下の feature/bugfix フォールバックに落ちて fail-closed を維持する。
  // @work-item-id WI-261
  if (filePath.startsWith("skills/") && filePath.endsWith(".md")) {
    return ChangeCategory.fromString("docs");
  }

  // feature: domain/ 以外の CREATE
  if (changeKind === "CREATE") {
    return ChangeCategory.fromString("feature");
  }

  // bugfix: domain/ 以外の MODIFY/DELETE
  return ChangeCategory.fromString("bugfix");
}

/**
 * WI-349: 遮断理由に判定根拠（分類カテゴリと変更種別）を含める。
 *
 * 従来はパス列挙のみだったため「なぜそのパスが不許可なのか」が読み取れず、
 * 利用者が「ワークツリーの無関係な変更のせいでブロックされている」と
 * 誤認する原因になっていた（issue #41 症状②）。
 */
function describeChangedFile(file: ChangedFile, category: string): string {
  return `${file.filePath} (category=${category}, changeKind=${file.changeKind})`;
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
    if (config.isFullModeRequiredFor("mixedCategories")) {
      const notAllowedFiles: ChangedFile[] = [];
      const notAllowedDescriptions: string[] = [];
      classification.categorizedFiles.forEach((files, categoryKey) => {
        if (!config.isAllowed(categoryKey)) {
          notAllowedFiles.push(...files);
          for (const file of files) {
            notAllowedDescriptions.push(describeChangedFile(file, categoryKey));
          }
        }
      });

      if (notAllowedFiles.length > 0) {
        return QuickModeEligibility.rejected(
          "MIXED_CHANGES",
          notAllowedFiles,
          `allowedCategories外のファイルが含まれています: ${notAllowedDescriptions.join(", ")}`,
        );
      }
    }

    // 2. NEW_DOMAIN評価: domain/ 配下かつ changeKind=CREATE
    if (config.isFullModeRequiredFor("newDomainFile")) {
      const newDomainFiles = changedFiles.filter(
        (f) => (f.filePath.includes("/domain/") || f.filePath.startsWith("domain/")) && f.changeKind === "CREATE",
      );

      if (newDomainFiles.length > 0) {
        return QuickModeEligibility.rejected(
          "NEW_DOMAIN",
          newDomainFiles,
          `domain/配下に新規ファイルが追加されています: ${newDomainFiles
            .map((f) => describeChangedFile(f, categorizeFile(f).toString()))
            .join(", ")}`,
        );
      }
    }

    // 3. API_CONTRACT評価: *port.ts / *adapter.ts の変更
    if (config.isFullModeRequiredFor("apiContractChange")) {
      const apiContractFiles = changedFiles.filter(
        (f) => (f.filePath.endsWith("port.ts") || f.filePath.endsWith("adapter.ts")) && !isCommentOnlyDiff(f),
      );

      if (apiContractFiles.length > 0) {
        return QuickModeEligibility.rejected(
          "API_CONTRACT",
          apiContractFiles,
          `Port/Adapterインターフェースファイルの変更が含まれています: ${apiContractFiles
            .map((f) => describeChangedFile(f, categorizeFile(f).toString()))
            .join(", ")}`,
        );
      }
    }

    return QuickModeEligibility.eligible("すべてのファイルが許可カテゴリ内です");
  }
}
