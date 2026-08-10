// @unit quick-mode
// @layer test
// @story H10-06
// @work-item-id WI-204
// @work-item-id WI-390
import { describe, expect, it } from "vitest";
import { QuickModeJudgmentEngine } from "../../../../../quick-mode/domain/services/quick-mode-judgment-engine.js";
import { ChangedFile } from "../../../../../quick-mode/domain/value-objects/changed-file.js";
import { context, createChangedFile, createQuickModeConfig, target } from "../../../../helpers/test-helpers.js";

const engine = new QuickModeJudgmentEngine();

target("QuickModeJudgmentEngine", () => {
  target("classify", () => {
    describe("変更ファイル群をカテゴリに分類する", () => {
      // UT-JE-001
      it("空配列が渡された場合にdominantCategory=nullの空のChangeClassificationが返ること", () => {
        // Arrange
        const files: ChangedFile[] = [];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual).toMatchObject({
          dominantCategory: null,
          totalFiles: 0,
        });
        expect(actual.categorizedFiles.size).toBe(0);
      });

      // UT-JE-002
      it("'docs/'配下のfilePathを持つファイルが渡された場合に'docs'カテゴリに分類されること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: "docs/design/overview.md", changeKind: "MODIFY" })];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("docs")).toBe(true);
      });

      // UT-JE-003
      it("'__tests__/'配下のfilePathを持つファイルが渡された場合に'test'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/__tests__/unit/quick-mode/domain/some.test.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("test")).toBe(true);
      });

      // UT-JE-004
      it("'*.config.json'のfilePathを持つファイルが渡された場合に'config'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/phasegate.config.json",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("config")).toBe(true);
      });

      it("'phasegate.config.json' は content snippet が同一でも 'config' カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "phasegate.config.json",
            changeKind: "MODIFY",
            beforeContent: '"allowedCategories": [',
            afterContent: '"allowedCategories": [',
          }),
        ];
        const config = createQuickModeConfig({ allowedCategories: ["bugfix"] });

        // Act
        const actual = engine.classify(files, config);

        // Assert
        expect(actual.hasCategory("config")).toBe(true);
        expect(actual.hasCategory("docs")).toBe(false);
      });

      // UT-JE-005
      it("'domain/'配下のfilePathを持つファイルが渡された場合に'domain'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/value-objects/some-vo.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("domain")).toBe(true);
      });

      // UT-JE-006
      it("'*port.ts'のfilePathを持つファイルが渡された場合に'api'カテゴリに分類されること（domain/以下であっても'api'が優先）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/application/ports/changed-files-port.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("api")).toBe(true);
      });

      it("'*port.ts'のコメントのみ差分が渡された場合に'docs'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/application/ports/changed-files-port.ts",
            changeKind: "MODIFY",
            beforeContent: "export interface ChangedFilesPort {\n  getChangedFiles(): Promise<unknown[]>;\n}\n",
            afterContent: "// note\nexport interface ChangedFilesPort {\n  getChangedFiles(): Promise<unknown[]>;\n}\n",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("docs")).toBe(true);
        expect(actual.hasCategory("api")).toBe(false);
      });

      // UT-JE-007
      it("domain/以外のCREATEファイルが渡された場合に'feature'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/services/new-feature-service.ts",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("feature")).toBe(true);
      });

      it.each([
        "README.md",
        "CHANGELOG.mdx",
        "notes/release.md",
        "scripts/harness/quick-mode/domain/README.mdx",
      ])("場所に関係なく新規 Markdown %s を docs カテゴリに分類すること", (filePath) => {
        const files = [ChangedFile.create({ filePath, changeKind: "CREATE" })];

        const actual = engine.classify(files, createQuickModeConfig());

        expect(actual.hasCategory("docs")).toBe(true);
        expect(actual.hasCategory("domain")).toBe(false);
        expect(actual.hasCategory("feature")).toBe(false);
      });

      // UT-JE-025（WI-261）
      it("'skills/'配下の新規SKILL.md（CREATE）が渡された場合に'docs'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "skills/doc-health-checker/SKILL.md",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("docs")).toBe(true);
        expect(actual.hasCategory("feature")).toBe(false);
      });

      // UT-JE-026（WI-261）
      it("'skills/'配下のreferences配下.mdの新規作成（CREATE）が渡された場合に'docs'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "skills/story-writer/references/workflow.md",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("docs")).toBe(true);
        expect(actual.hasCategory("feature")).toBe(false);
      });

      // UT-JE-027（WI-261）
      it("'skills/'配下の非.mdファイルの新規作成（CREATE）は従来どおり'feature'カテゴリに分類されること（fail-closed維持）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "skills/some-skill/scripts/helper.ts",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("feature")).toBe(true);
        expect(actual.hasCategory("docs")).toBe(false);
      });

      // UT-JE-028（WI-334）
      it("'.github/workflows/'配下の新規CI workflow（.yml, CREATE）が渡された場合に'config'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: ".github/workflows/ci.yml",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("config")).toBe(true);
        expect(actual.hasCategory("feature")).toBe(false);
      });

      // UT-JE-029（WI-334）
      it("'.github/workflows/'配下のCI workflow（.yaml, MODIFY）が渡された場合に'config'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: ".github/workflows/release.yaml",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("config")).toBe(true);
        expect(actual.hasCategory("bugfix")).toBe(false);
      });

      // UT-JE-030（WI-334）
      it("'.github/'配下だがworkflows/外の'.github/dependabot.yml'の新規作成（CREATE）は従来どおり'feature'カテゴリに分類されること（fail-closed維持）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: ".github/dependabot.yml",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("feature")).toBe(true);
        expect(actual.hasCategory("config")).toBe(false);
      });

      // UT-JE-031（WI-334）
      it("'.github/workflows/'配下の非yml/yamlファイルの新規作成（CREATE）は従来どおり'feature'カテゴリに分類されること（fail-closed維持）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: ".github/workflows/helper-script.sh",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("feature")).toBe(true);
        expect(actual.hasCategory("config")).toBe(false);
      });

      // UT-JE-032（WI-352）
      it.each([
        [".gitignore"],
        [".gitattributes"],
        [".editorconfig"],
        [".npmrc"],
        [".nvmrc"],
        ["tsconfig.json"],
        ["tsconfig.build.json"],
        [".husky/pre-commit"],
      ])("ルート直下のbootstrap設定ファイル'%s'の新規作成（CREATE）が'config'カテゴリに分類されること", (filePath) => {
        // Arrange
        const files = [ChangedFile.create({ filePath, changeKind: "CREATE" })];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("config")).toBe(true);
        expect(actual.hasCategory("feature")).toBe(false);
      });

      // UT-JE-033（WI-352）
      it.each([
        [".gitignore"],
        [".gitattributes"],
        [".editorconfig"],
        [".npmrc"],
        [".nvmrc"],
        ["tsconfig.json"],
        ["tsconfig.build.json"],
        [".husky/pre-commit"],
      ])("ルート直下のbootstrap設定ファイル'%s'の変更（MODIFY）が'config'カテゴリに分類されること", (filePath) => {
        // Arrange
        const files = [ChangedFile.create({ filePath, changeKind: "MODIFY" })];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("config")).toBe(true);
        expect(actual.hasCategory("bugfix")).toBe(false);
      });

      // UT-JE-034（WI-352）
      it.each([
        [".github/dependabot.yml"],
        ["packages/app/.gitignore"],
        ["config/tsconfig.json"],
        [".huskyrc"],
      ])("allowlist外のbootstrap類似パス'%s'の新規作成（CREATE）は従来どおり'feature'カテゴリに分類されること（fail-closed維持）", (filePath) => {
        // Arrange
        const files = [ChangedFile.create({ filePath, changeKind: "CREATE" })];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("feature")).toBe(true);
        expect(actual.hasCategory("config")).toBe(false);
      });

      // UT-JE-035（WI-352）
      it("ルート直下の'.gitignore'の新規作成（CREATE）がQuick Modeで許可されること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: ".gitignore", changeKind: "CREATE" })];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });

      // UT-JE-008
      it("domain/以外のMODIFYファイルが渡された場合に'bugfix'カテゴリに分類されること", () => {
        // Arrange
        const files = [createChangedFile("scripts/harness/quick-mode/services/quick-service.ts", "MODIFY")];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("bugfix")).toBe(true);
      });
    });
  });

  target("judge", () => {
    describe("変更ファイル群を評価してQuick Mode適用可否を返す", () => {
      // UT-JE-009
      it("全ファイルがallowedCategories内（'bugfix'/'docs'/'test'/'config'）のみの場合にeligible=trueが返ること", () => {
        // Arrange
        const files = [createChangedFile("scripts/harness/quick-mode/services/quick-service.ts", "MODIFY")];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });

      // UT-JE-010
      it("空の変更ファイル一覧が渡された場合にeligible=trueが返ること", () => {
        // Arrange
        const files: ChangedFile[] = [];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });
    });

    describe("3拒否ルールの判定", () => {
      // UT-JE-011
      it("allowedCategories外の単一カテゴリ（domain）が含まれる場合にCATEGORY_NOT_ALLOWEDで拒否すること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/value-objects/some-vo.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe("CATEGORY_NOT_ALLOWED");
      });

      // UT-JE-012
      it("allowedCategories外の単一カテゴリ（feature）が含まれる場合にCATEGORY_NOT_ALLOWEDで拒否すること", () => {
        // Arrange
        const rejectedFile = ChangedFile.create({
          filePath: "scripts/harness/quick-mode/services/new-feature.ts",
          changeKind: "CREATE",
        });
        const files = [rejectedFile];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe("CATEGORY_NOT_ALLOWED");
        expect(actual.rejectedFiles).toContainEqual(expect.objectContaining({ filePath: rejectedFile.filePath }));
      });

      // UT-JE-013
      it("'domain/'配下のchangeKind=CREATEファイルが含まれる場合にeligible=false、rejectionRule='NEW_DOMAIN'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/value-objects/new-vo.ts",
            changeKind: "CREATE",
          }),
        ];
        // NEW_DOMAINルール単体を評価するには、domainがallowedに入った設定でCREATEを渡す
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "domain"],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe("NEW_DOMAIN");
      });

      // UT-JE-014
      it("'domain/'配下のMODIFYのみはNEW_DOMAINではなくCATEGORY_NOT_ALLOWEDで拒否すること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/value-objects/some-vo.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).not.toBe("NEW_DOMAIN");
        expect(actual.rejectionRule).toBe("CATEGORY_NOT_ALLOWED");
      });

      // UT-JE-015
      it("'*port.ts'ファイルの変更が含まれる場合にeligible=false、rejectionRule='API_CONTRACT'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/application/ports/changed-files-port.ts",
            changeKind: "MODIFY",
          }),
        ];
        // API_CONTRACTを単独評価するためallowedにapi含む設定
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "api"],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe("API_CONTRACT");
      });

      it("'*port.ts'ファイルのコメントのみ差分はAPI_CONTRACTで拒否されないこと", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/application/ports/changed-files-port.ts",
            changeKind: "MODIFY",
            beforeContent: "export interface ChangedFilesPort {\n  getChangedFiles(): Promise<unknown[]>;\n}\n",
            afterContent:
              "/** docs */\nexport interface ChangedFilesPort {\n  getChangedFiles(): Promise<unknown[]>;\n}\n",
          }),
        ];
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "api"],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual).toMatchObject({
          eligible: true,
          rejectionRule: undefined,
          rejectedFiles: undefined,
        });
      });

      // UT-JE-016
      it("'*adapter.ts'ファイルの変更が含まれる場合にeligible=false、rejectionRule='API_CONTRACT'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/infrastructure/adapters/git-adapter.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "api"],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe("API_CONTRACT");
      });
    });

    describe("拒否ルールをカテゴリ判定→NEW_DOMAIN→API_CONTRACTの順で評価する", () => {
      // UT-JE-017
      it("単一の不許可 domain CREATE はCATEGORY_NOT_ALLOWEDを優先すること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/value-objects/new-vo.ts",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig(); // domain非許可
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe("CATEGORY_NOT_ALLOWED");
      });

      it("不許可カテゴリを含む複数カテゴリ変更はMIXED_CHANGESで拒否すること", () => {
        const files = [
          ChangedFile.create({ filePath: "README.md", changeKind: "MODIFY" }),
          ChangedFile.create({ filePath: "src/new-feature.ts", changeKind: "CREATE" }),
        ];

        const actual = engine.judge(files, createQuickModeConfig());

        expect(actual.rejectionRule).toBe("MIXED_CHANGES");
      });

      // UT-JE-018
      it("NEW_DOMAINとAPI_CONTRACTの両条件に該当するファイルが含まれる場合にNEW_DOMAINルールで拒否されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/ports/new-domain-port.ts",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "domain", "api"],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe("NEW_DOMAIN");
      });
    });

    // UT-JE-019: INV-1不変条件
    it("INV-1: 任意の有効なChangedFile[]とQuickModeConfigで判定結果にLevel間依存緩和の情報が含まれないこと", () => {
      // Arrange
      const files = [createChangedFile()];
      const config = createQuickModeConfig();
      // Act
      const actual = engine.judge(files, config);
      // Assert
      // QuickModeEligibilityはlevelDependencyRelaxedプロパティを持たない
      expect(actual).toMatchObject({
        eligible: true,
        rejectionRule: undefined,
        rejectedFiles: undefined,
      });
      expect(actual).not.toHaveProperty("levelDependencyRelaxed");
    });

    // UT-JE-020
    it("allowedCategories外の単一 domain カテゴリはCATEGORY_NOT_ALLOWEDで拒否されること", () => {
      // Arrange
      const domainFile = ChangedFile.create({
        filePath: "scripts/harness/quick-mode/domain/value-objects/some-vo.ts",
        changeKind: "MODIFY",
      });
      const config = createQuickModeConfig(); // allowedCategoriesにdomain非許可 = デフォルト
      // Act
      const actual = engine.judge([domainFile], config);
      // Assert
      expect(actual.isEligible()).toBe(false);
      expect(actual.rejectionRule).toBe("CATEGORY_NOT_ALLOWED");
    });

    // UT-JE-021（H10-05）
    describe("fullModeRequiredWhen による rule のオプトアウト", () => {
      it("fullModeRequiredWhen.mixedCategories=false の場合にallowedCategories外のファイルでも MIXED_CHANGES で拒否されないこと", () => {
        // Arrange
        const domainFile = ChangedFile.create({
          filePath: "scripts/harness/quick-mode/domain/value-objects/some-vo.ts",
          changeKind: "MODIFY",
        });
        const config = createQuickModeConfig({
          fullModeRequiredWhen: { mixedCategories: false, newDomainFile: true, apiContractChange: true },
        });
        // Act
        const actual = engine.judge([domainFile], config);
        // Assert
        expect(actual.rejectionRule).not.toBe("MIXED_CHANGES");
      });

      // UT-JE-022
      it("fullModeRequiredWhen.newDomainFile=false の場合に domain/ 配下のCREATEでも NEW_DOMAIN で拒否されないこと", () => {
        // Arrange
        const newDomainFile = ChangedFile.create({
          filePath: "scripts/harness/quick-mode/domain/value-objects/new-vo.ts",
          changeKind: "CREATE",
        });
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "domain", "feature", "api"],
          fullModeRequiredWhen: { mixedCategories: true, newDomainFile: false, apiContractChange: true },
        });
        // Act
        const actual = engine.judge([newDomainFile], config);
        // Assert
        expect(actual.rejectionRule).not.toBe("NEW_DOMAIN");
      });

      // UT-JE-023
      it("fullModeRequiredWhen.apiContractChange=false の場合に *port.ts の変更でも API_CONTRACT で拒否されないこと", () => {
        // Arrange
        const portFile = ChangedFile.create({
          filePath: "scripts/harness/quick-mode/domain/ports/some-port.ts",
          changeKind: "MODIFY",
        });
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "domain", "feature", "api"],
          fullModeRequiredWhen: { mixedCategories: true, newDomainFile: true, apiContractChange: false },
        });
        // Act
        const actual = engine.judge([portFile], config);
        // Assert
        expect(actual.rejectionRule).not.toBe("API_CONTRACT");
      });

      // UT-JE-024
      it("fullModeRequiredWhen.mixedCategories=false でも newDomainFile=true の場合に domain/ 配下の CREATE は NEW_DOMAIN で拒否されること", () => {
        // Arrange
        const newDomainFile = ChangedFile.create({
          filePath: "scripts/harness/quick-mode/domain/value-objects/new-vo.ts",
          changeKind: "CREATE",
        });
        const config = createQuickModeConfig({
          fullModeRequiredWhen: { mixedCategories: false, newDomainFile: true, apiContractChange: true },
        });
        // Act
        const actual = engine.judge([newDomainFile], config);
        // Assert
        expect(actual.rejectionRule).toBe("NEW_DOMAIN");
      });
    });

    describe("遮断理由に判定根拠（カテゴリと変更種別）を含める", () => {
      // UT-JE-025 (WI-349)
      it("CATEGORY_NOT_ALLOWEDの理由にファイルごとのcategoryとchangeKindが含まれること", () => {
        // Arrange
        const featureFile = ChangedFile.create({ filePath: "results/summary.md.ts", changeKind: "CREATE" });
        const config = createQuickModeConfig({ allowedCategories: ["bugfix", "docs", "test", "config"] });
        // Act
        const actual = engine.judge([featureFile], config);
        // Assert
        expect(actual.rejectionRule).toBe("CATEGORY_NOT_ALLOWED");
        expect(actual.reason).toContain("results/summary.md.ts (category=feature, changeKind=CREATE)");
      });

      // UT-JE-026 (WI-349)
      it("NEW_DOMAINの理由にファイルごとのcategoryとchangeKindが含まれること", () => {
        // Arrange
        const newDomainFile = ChangedFile.create({
          filePath: "scripts/harness/quick-mode/domain/value-objects/new-vo.ts",
          changeKind: "CREATE",
        });
        const config = createQuickModeConfig({
          fullModeRequiredWhen: { mixedCategories: false, newDomainFile: true, apiContractChange: true },
        });
        // Act
        const actual = engine.judge([newDomainFile], config);
        // Assert
        expect(actual.reason).toContain(
          "scripts/harness/quick-mode/domain/value-objects/new-vo.ts (category=domain, changeKind=CREATE)",
        );
      });

      // UT-JE-027 (WI-349)
      it("API_CONTRACTの理由にファイルごとのcategoryとchangeKindが含まれること", () => {
        // Arrange
        const adapterFile = ChangedFile.create({
          filePath: "scripts/harness/quick-mode/infrastructure/adapters/some-adapter.ts",
          changeKind: "MODIFY",
        });
        const config = createQuickModeConfig({
          allowedCategories: ["bugfix", "docs", "test", "config", "domain", "feature", "api"],
        });
        // Act
        const actual = engine.judge([adapterFile], config);
        // Assert
        expect(actual.rejectionRule).toBe("API_CONTRACT");
        expect(actual.reason).toContain(
          "scripts/harness/quick-mode/infrastructure/adapters/some-adapter.ts (category=api, changeKind=MODIFY)",
        );
      });
    });
  });

  // @work-item-id WI-372
  target("categoryOverrides", () => {
    const overrideConfig = (categoryOverrides: Record<string, string[]>) =>
      createQuickModeConfig({ categoryOverrides });

    describe("categoryOverrides 未設定時も組み込み分類を適用する", () => {
      // UT-JE-OV-001
      it.each([
        ["phasegate.config.json", "MODIFY" as const, "config"],
        [".github/workflows/ci.yml", "CREATE" as const, "config"],
        ["tsconfig.json", "CREATE" as const, "config"],
        ["scripts/harness/quick-mode/domain/ports/changed-files-port.ts", "MODIFY" as const, "api"],
        ["scripts/harness/__tests__/unit/quick-mode/x.test.ts", "MODIFY" as const, "test"],
        ["scripts/harness/quick-mode/domain/services/engine.ts", "MODIFY" as const, "domain"],
        ["docs/guide/quick-vs-full-mode.md", "MODIFY" as const, "docs"],
        ["skills/quick-implementor/SKILL.md", "MODIFY" as const, "docs"],
        ["results/2026-08-06/summary.md", "CREATE" as const, "docs"],
        ["results/2026-08-06/summary.md", "MODIFY" as const, "docs"],
      ])("'%s'(%s) が '%s' に分類されること", (filePath, changeKind, expected) => {
        // Arrange
        const files = [ChangedFile.create({ filePath, changeKind })];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory(expected)).toBe(true);
      });

      it("config を渡さない場合も同じ分類結果になること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: "results/a.md", changeKind: "CREATE" })];
        // Act
        const actual = engine.classify(files);
        // Assert
        expect(actual.hasCategory("docs")).toBe(true);
      });
    });

    describe("override は組み込みルールより先に評価される（DD-1）", () => {
      // UT-JE-OV-002
      it("'results/**' を docs に指定した場合に CREATE でも docs に分類されること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: "results/2026-08-06/summary.md", changeKind: "CREATE" })];
        const config = overrideConfig({ docs: ["results/**"] });
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("docs")).toBe(true);
        expect(actual.hasCategory("feature")).toBe(false);
      });

      // UT-JE-OV-003
      it("組み込みで config に一致するパスでも override の docs が優先されること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: "notes/sample.config.json", changeKind: "MODIFY" })];
        const config = overrideConfig({ docs: ["notes/**"] });
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("docs")).toBe(true);
        expect(actual.hasCategory("config")).toBe(false);
      });
    });

    describe("組み込みで domain / api と判定されるファイルは override で降格できない（DD-2）", () => {
      // UT-JE-OV-004
      it("domain 配下のファイルを docs に override しても domain のままであること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/services/engine.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = overrideConfig({ docs: ["scripts/**"] });
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("domain")).toBe(true);
        expect(actual.hasCategory("docs")).toBe(false);
      });

      // UT-JE-OV-005
      it("port ファイルを docs に override しても api のままであること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/ports/changed-files-port.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = overrideConfig({ docs: ["scripts/**"] });
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("api")).toBe(true);
        expect(actual.hasCategory("docs")).toBe(false);
      });

      // UT-JE-OV-006
      it("domain 配下のファイルを api に override する昇格は許可されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/services/engine.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = overrideConfig({ api: ["scripts/**/domain/**"] });
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("api")).toBe(true);
      });
    });

    describe("domain / feature を override のキーに指定できる（DD-3）", () => {
      // UT-JE-OV-007
      it("'vendor/**' を domain に指定した場合に domain へ昇格すること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: "vendor/x.md", changeKind: "MODIFY" })];
        const config = overrideConfig({ domain: ["vendor/**"] });
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory("domain")).toBe(true);
      });
    });

    describe("override は 3 拒否ルールを無効化しない（DD-6）", () => {
      // UT-JE-OV-008
      it("domain 配下の CREATE を docs に override しても NEW_DOMAIN で拒否されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/domain/value-objects/new-vo.ts",
            changeKind: "CREATE",
          }),
        ];
        const config = createQuickModeConfig({
          categoryOverrides: { docs: ["scripts/**"] },
          fullModeRequiredWhen: { mixedCategories: false, newDomainFile: true, apiContractChange: true },
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe("NEW_DOMAIN");
      });

      // UT-JE-OV-009
      it("adapter ファイルを docs に override しても API_CONTRACT で拒否されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: "scripts/harness/quick-mode/infrastructure/adapters/some-adapter.ts",
            changeKind: "MODIFY",
          }),
        ];
        const config = createQuickModeConfig({
          categoryOverrides: { docs: ["scripts/**"] },
          fullModeRequiredWhen: { mixedCategories: false, newDomainFile: false, apiContractChange: true },
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe("API_CONTRACT");
      });
    });

    describe("override 適用後の judge 判定", () => {
      // UT-JE-OV-010
      it("'results/**' を docs に override した CREATE が Quick Mode 適用可能になること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: "results/2026-08-06/summary.md", changeKind: "CREATE" })];
        const config = overrideConfig({ docs: ["results/**"] });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });

      // UT-JE-OV-011
      it("CATEGORY_NOT_ALLOWED の遮断理由に override 後のカテゴリが表示されること", () => {
        // Arrange
        const files = [ChangedFile.create({ filePath: "vendor/x.md", changeKind: "MODIFY" })];
        const config = overrideConfig({ domain: ["vendor/**"] });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe("CATEGORY_NOT_ALLOWED");
        expect(actual.reason).toContain("vendor/x.md (category=domain, changeKind=MODIFY)");
      });
    });
  });
});
