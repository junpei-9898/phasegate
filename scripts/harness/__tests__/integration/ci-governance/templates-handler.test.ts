// @unit ci-governance
// @layer test
// @story H02-02
// @work-item-id WI-367

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ListTemplatesUseCase } from "../../../ci-governance/application/usecases/list-templates-usecase.js";
import { ShowTemplateUseCase } from "../../../ci-governance/application/usecases/show-template-usecase.js";
import { FileSystemTemplateCatalogAdapter } from "../../../ci-governance/infrastructure/adapters/file-system-template-catalog-adapter.js";
import { TemplatesHandler } from "../../../ci-governance/presentation/handlers/templates-handler.js";
import { context, target } from "../../helpers/test-helpers.js";

target("TemplatesHandler", () => {
  let harnessRoot: string;
  let handler: TemplatesHandler;

  beforeEach(async () => {
    harnessRoot = await fs.mkdtemp(path.join(os.tmpdir(), "phasegate-templates-handler-"));
    await fs.mkdir(path.join(harnessRoot, "templates"), { recursive: true });
    await fs.writeFile(
      path.join(harnessRoot, "templates", "logical_design.template.md"),
      "# 論理設計: {{unit}}\n",
      "utf-8",
    );
    await fs.writeFile(
      path.join(harnessRoot, "templates", "product_overview_plan.template.md"),
      "# プロダクト設計計画\n\n## 4. QA（不明点・確認事項）\n",
      "utf-8",
    );
    await fs.writeFile(path.join(harnessRoot, "package.json"), '{"name":"secret"}', "utf-8");

    const catalog = new FileSystemTemplateCatalogAdapter(harnessRoot);
    handler = new TemplatesHandler(new ListTemplatesUseCase(catalog), new ShowTemplateUseCase(catalog));
  });

  afterEach(async () => {
    await fs.rm(harnessRoot, { recursive: true, force: true });
  });

  describe("list", () => {
    context("テンプレートが存在する場合", () => {
      it("IT-CG-TH-001: exit=0 で name 一覧と show の案内を返す", async () => {
        // Arrange
        const args = {};

        // Act
        const actual = await handler.list(args);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain("logical_design");
        expect(actual.output).toContain("product_overview_plan");
        expect(actual.output).toContain("phasegate templates show <name>");
        expect(actual.errorOutput).toBe("");
      });
    });

    context("--json を指定した場合", () => {
      it("IT-CG-TH-002: パース可能な JSON を返す", async () => {
        // Arrange
        const args = { format: "json" } as const;

        // Act
        const actual = await handler.list(args);

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.output) as {
          directoryPath: string;
          templates: Array<{ name: string; fileName: string }>;
        };
        expect(parsed.templates.map((entry) => entry.name)).toEqual([
          "logical_design",
          "product_overview_plan",
        ]);
      });
    });

    context("テンプレートディレクトリが空の場合", () => {
      it("IT-CG-TH-003: exit=0 で 0 件を通知する", async () => {
        // Arrange
        const emptyRoot = await fs.mkdtemp(path.join(os.tmpdir(), "phasegate-templates-empty-"));
        const catalog = new FileSystemTemplateCatalogAdapter(emptyRoot);
        const emptyHandler = new TemplatesHandler(
          new ListTemplatesUseCase(catalog),
          new ShowTemplateUseCase(catalog),
        );

        // Act
        const actual = await emptyHandler.list();

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain("Available templates (0):");
        await fs.rm(emptyRoot, { recursive: true, force: true });
      });
    });
  });

  describe("show", () => {
    context("catalog に存在する name を指定した場合", () => {
      it("IT-CG-TH-004: exit=0 で本文だけを stdout に返す", async () => {
        // Arrange
        const args = { name: "logical_design" };

        // Act
        const actual = await handler.show(args);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toBe("# 論理設計: {{unit}}\n");
        expect(actual.errorOutput).toBe("");
      });
    });

    context("name を省略した場合", () => {
      it("IT-CG-TH-005: exit=2 で usage を stderr に返す", async () => {
        // Arrange
        const args = {};

        // Act
        const actual = await handler.show(args);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toBe("");
        expect(actual.errorOutput).toContain("Usage: phasegate templates show <name>");
      });
    });

    context("path traversal を試みる name を指定した場合", () => {
      it.each([
        ["親ディレクトリ参照", "../package.json"],
        ["絶対パス", "/etc/passwd"],
        ["スラッシュ区切り", "templates/logical_design"],
      ])("IT-CG-TH-006: %s（%s）は exit=2 で内容を一切出さない", async (_label, name) => {
        // Arrange
        const args = { name };

        // Act
        const actual = await handler.show(args);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toBe("");
        expect(actual.errorOutput).toContain("Invalid template name");
        expect(actual.errorOutput).not.toContain("secret");
      });
    });

    context("catalog に存在しない name を指定した場合", () => {
      it("IT-CG-TH-007: exit=2 で利用可能な name を案内する", async () => {
        // Arrange
        const args = { name: "nonexistent" };

        // Act
        const actual = await handler.show(args);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toBe("");
        expect(actual.errorOutput).toContain("Template not found: nonexistent");
        expect(actual.errorOutput).toContain("logical_design");
      });
    });
  });

  describe("usage", () => {
    context("未知のサブコマンドが渡された場合", () => {
      it("IT-CG-TH-008: exit=2 で usage を返す", () => {
        // Arrange
        const sut = handler;

        // Act
        const actual = sut.usage();

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.errorOutput).toBe("Usage: phasegate templates <list|show <name>>");
      });
    });
  });
});
