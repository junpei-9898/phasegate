// @unit ci-governance
// @layer test
// @story H02-02
// @work-item-id WI-367

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemTemplateCatalogAdapter } from "../../../ci-governance/infrastructure/adapters/file-system-template-catalog-adapter.js";
import { TemplateName } from "../../../ci-governance/domain/value-objects/template-name.js";
import { context, target } from "../../helpers/test-helpers.js";

target("FileSystemTemplateCatalogAdapter", () => {
  let harnessRoot: string;

  beforeEach(async () => {
    harnessRoot = await fs.mkdtemp(path.join(os.tmpdir(), "phasegate-catalog-"));
    await fs.mkdir(path.join(harnessRoot, "templates"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(harnessRoot, { recursive: true, force: true });
  });

  async function writeTemplate(fileName: string, body: string): Promise<void> {
    await fs.writeFile(path.join(harnessRoot, "templates", fileName), body, "utf-8");
  }

  describe("list", () => {
    context("テンプレートと非テンプレートが混在する場合", () => {
      it("IT-CG-FSTC-001: テンプレート命名規約に合うものだけを name 昇順で返す", async () => {
        // Arrange
        await writeTemplate("logical_design.template.md", "# logical");
        await writeTemplate("product_overview.template.md", "# overview");
        await writeTemplate("product_overview_plan.template.md", "# plan");
        await writeTemplate("README.md", "not a template");
        const sut = new FileSystemTemplateCatalogAdapter(harnessRoot);

        // Act
        const actual = (await sut.list()).map((entry) => entry.name.value);

        // Assert
        expect(actual).toEqual(["logical_design", "product_overview", "product_overview_plan"]);
      });
    });

    context("テンプレートディレクトリが存在しない場合", () => {
      it("IT-CG-FSTC-002: 例外を投げず空一覧を返す", async () => {
        // Arrange
        const sut = new FileSystemTemplateCatalogAdapter(harnessRoot, "no-such-dir");

        // Act
        const actual = await sut.list();

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context("サブディレクトリが存在する場合", () => {
      it("IT-CG-FSTC-003: ディレクトリは catalog に含めない", async () => {
        // Arrange
        await fs.mkdir(path.join(harnessRoot, "templates", "nested.template.md"), { recursive: true });
        await writeTemplate("logical_design.template.md", "# logical");
        const sut = new FileSystemTemplateCatalogAdapter(harnessRoot);

        // Act
        const actual = (await sut.list()).map((entry) => entry.fileName);

        // Assert
        expect(actual).toEqual(["logical_design.template.md"]);
      });
    });
  });

  describe("read", () => {
    context("catalog に存在する name を渡した場合", () => {
      it("IT-CG-FSTC-004: 本文をそのまま返す", async () => {
        // Arrange
        await writeTemplate("logical_design.template.md", "# logical\n\nbody\n");
        const sut = new FileSystemTemplateCatalogAdapter(harnessRoot);

        // Act
        const actual = await sut.read(TemplateName.create("logical_design"));

        // Assert
        expect(actual).toBe("# logical\n\nbody\n");
      });
    });

    context("catalog に存在しない name を渡した場合", () => {
      it("IT-CG-FSTC-005: 例外ではなく null を返す", async () => {
        // Arrange
        await writeTemplate("logical_design.template.md", "# logical");
        const sut = new FileSystemTemplateCatalogAdapter(harnessRoot);

        // Act
        const actual = await sut.read(TemplateName.create("nonexistent"));

        // Assert
        expect(actual).toBeNull();
      });
    });

    context("templates ディレクトリの外に同名ファイルが存在する場合", () => {
      it("IT-CG-FSTC-006: catalog 照合のみで解決するため外部ファイルを読まない", async () => {
        // Arrange
        await fs.writeFile(path.join(harnessRoot, "secret.template.md"), "TOP SECRET", "utf-8");
        await writeTemplate("logical_design.template.md", "# logical");
        const sut = new FileSystemTemplateCatalogAdapter(harnessRoot);

        // Act
        const actual = await sut.read(TemplateName.create("secret"));

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  describe("directoryPath", () => {
    context("テンプレートディレクトリを問い合わせた場合", () => {
      it("IT-CG-FSTC-007: harnessRoot 配下の絶対パスを返す", () => {
        // Arrange
        const sut = new FileSystemTemplateCatalogAdapter(harnessRoot);

        // Act
        const actual = sut.directoryPath();

        // Assert
        expect(actual).toBe(path.join(harnessRoot, "templates"));
      });
    });
  });
});
