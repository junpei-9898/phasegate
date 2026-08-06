/**
 * @layer domain
 * @unit quick-mode
 * @work-item-id WI-204
 * @work-item-id WI-349
 * @work-item-id WI-352
 * @work-item-id WI-372
 *
 * ChangedFile[]をChangeClassificationに変換し、3拒否ルールを評価してQuickModeEligibilityを返すドメインサービス
 */

import { CategoryOverrideRules } from "../value-objects/category-override-rules.js";
import { ChangeCategory } from "../value-objects/change-category.js";
import { ChangeClassification } from "../value-objects/change-classification.js";
import type { ChangedFile } from "../value-objects/changed-file.js";
import type { QuickModeConfig } from "../value-objects/quick-mode-config.js";
import { QuickModeEligibility } from "../value-objects/quick-mode-eligibility.js";
import { isCommentOnlyDiff } from "./comment-only-diff-detector.js";

// config: リポジトリ直下の bootstrap 設定ファイル（列挙型 allowlist）。
// これらは unit を持たず、CREATE だと feature に落ちて allowedCategories に
// 入れる手段がないため greenfield な初期セットアップが恒久的にブロックされていた。
// ワイルドカード（.github/** 等）には広げず、実在する bootstrap ファイル名のみを
// 列挙して fail-closed を維持する（WI-334 の .github/workflows、
// WI-261 の skills/**/*.md と同型の判断）。
// package.json は protected-file 経路で別途保護されるためここには含めない。
// @work-item-id WI-352
const ROOT_BOOTSTRAP_CONFIG_FILES: ReadonlySet<string> = new Set([
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".npmrc",
  ".nvmrc",
  "tsconfig.json",
]);

const HUSKY_DIRECTORY_PREFIX = ".husky/";

function isRootBootstrapConfigFile(filePath: string): boolean {
  if (ROOT_BOOTSTRAP_CONFIG_FILES.has(filePath)) {
    return true;
  }
  // tsconfig.*.json（tsconfig.build.json / tsconfig.test.json 等）もルート直下のみ許可
  if (/^tsconfig\.[^/]+\.json$/.test(filePath)) {
    return true;
  }
  // .husky/ 配下の hook スクリプト（L0 の runtime 定義）
  return filePath.startsWith(HUSKY_DIRECTORY_PREFIX) && filePath.slice(HUSKY_DIRECTORY_PREFIX.length).length > 0;
}

function categorizeFileByBuiltInRules(file: ChangedFile): ChangeCategory {
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

  // config: リポジトリ直下の bootstrap 設定ファイル（WI-352）
  if (isRootBootstrapConfigFile(filePath)) {
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

// 組み込み判定が構造的に高リスク（domain / api）のカテゴリは override で降格できない。
// @work-item-id WI-372
const NON_DOWNGRADABLE_BUILT_IN_CATEGORIES: ReadonlySet<string> = new Set(["domain", "api"]);

/**
 * WI-372: `quickMode.categoryOverrides` を反映したカテゴリ判定。
 *
 * override は「このパスはこの種類の変更である」という利用者の明示宣言なので、
 * 組み込みルールより **先** に評価する（DD-1）。組み込みの後段に置くと
 * `notes/x.config.json` のような偶発的な組み込みマッチに常に負け、
 * 「設定したのに効かない」不可解な挙動になるため。
 *
 * ただし組み込み判定が `domain` / `api` のファイルは override で降格できない（DD-2）。
 * `judge()` の NEW_DOMAIN は CREATE のみ、API_CONTRACT は port/adapter のみを見るため、
 * ガードが無いと domain ファイルの MODIFY が `docs` として素通りしてしまう。
 * 降格は禁じるが昇格（domain → api 等）は許す。
 *
 * override 未設定時は組み込み分類と完全に一致する（後方互換）。
 */
function categorizeFile(file: ChangedFile, overrides: CategoryOverrideRules): ChangeCategory {
  const builtIn = categorizeFileByBuiltInRules(file);
  if (overrides.isEmpty()) {
    return builtIn;
  }

  const override = overrides.resolve(file.filePath);
  if (override === null) {
    return builtIn;
  }

  if (NON_DOWNGRADABLE_BUILT_IN_CATEGORIES.has(builtIn.toString())) {
    return override.riskPriority() > builtIn.riskPriority() ? override : builtIn;
  }

  return override;
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
  classify(changedFiles: readonly ChangedFile[], config?: QuickModeConfig): ChangeClassification {
    if (changedFiles.length === 0) {
      return new ChangeClassification(null, new Map(), 0);
    }

    const overrides = config?.categoryOverrides ?? CategoryOverrideRules.empty();
    const categorizedMap = new Map<string, ChangedFile[]>();
    let dominantCategory: ChangeCategory | null = null;
    let dominantPriority = -1;

    for (const file of changedFiles) {
      const category = categorizeFile(file, overrides);
      const key = category.toString();

      if (!categorizedMap.has(key)) {
        categorizedMap.set(key, []);
      }
      categorizedMap.get(key)!.push(file);

      const priority = category.riskPriority();
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
            .map((f) => describeChangedFile(f, categorizeFile(f, config.categoryOverrides).toString()))
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
            .map((f) => describeChangedFile(f, categorizeFile(f, config.categoryOverrides).toString()))
            .join(", ")}`,
        );
      }
    }

    return QuickModeEligibility.eligible("すべてのファイルが許可カテゴリ内です");
  }
}
