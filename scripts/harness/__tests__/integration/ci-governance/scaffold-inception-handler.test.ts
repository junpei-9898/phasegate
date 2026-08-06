// @unit ci-governance
// @layer test
// @story H02-02
// @work-item-id WI-368

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScaffoldInceptionUseCase } from "../../../ci-governance/application/usecases/scaffold-inception-usecase.js";
import { FileSystemInceptionDocWriterAdapter } from "../../../ci-governance/infrastructure/adapters/file-system-inception-doc-writer-adapter.js";
import { FileSystemInceptionTemplateRepositoryAdapter } from "../../../ci-governance/infrastructure/adapters/file-system-inception-template-repository-adapter.js";
import { ScaffoldInceptionHandler } from "../../../ci-governance/presentation/handlers/scaffold-inception-handler.js";
import { context, target } from "../../helpers/test-helpers.js";

const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

target("ScaffoldInceptionHandler", () => {
  let projectRoot: string;
  let handler: ScaffoldInceptionHandler;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "phasegate-scaffold-inception-"));
    handler = new ScaffoldInceptionHandler(
      new ScaffoldInceptionUseCase(
        new FileSystemInceptionTemplateRepositoryAdapter(HARNESS_ROOT),
        new FileSystemInceptionDocWriterAdapter(projectRoot),
      ),
    );
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe("正常系", () => {
    context("--kind のみ指定（既定は dry-run）", () => {
      it("IT-CG-SIH-001: exit=0 で preview を返しファイルを書かない", async () => {
        // Arrange
        const args = { kind: "product-overview-plan" };

        // Act
        const actual = await handler.handle(args);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain("dry-run");
        expect(actual.output).toContain("docs/inception/_shared/product_overview_plan.md");
        await expect(
          fs.access(path.join(projectRoot, "docs/inception/_shared/product_overview_plan.md")),
        ).rejects.toThrow();
      });
    });

    context("--apply 指定かつ既存なし", () => {
      it("IT-CG-SIH-002: exit=0 でテンプレート本文を書き込む", async () => {
        // Arrange
        const args = { kind: "product-overview-plan", apply: true };

        // Act
        const actual = await handler.handle(args);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain("文書を生成しました");
        const written = await fs.readFile(
          path.join(projectRoot, "docs/inception/_shared/product_overview_plan.md"),
          "utf-8",
        );
        expect(written).toContain("# プロダクト設計計画");
      });
    });

    context("--kind product-overview を --apply した場合", () => {
      it("IT-CG-SIH-003: designDocs の親（product ルート）に書き込む", async () => {
        // Arrange
        const args = { kind: "product-overview", apply: true };

        // Act
        const actual = await handler.handle(args);

        // Assert
        expect(actual.exitCode).toBe(0);
        const written = await fs.readFile(path.join(projectRoot, "docs/product/product_overview.md"), "utf-8");
        expect(written).toContain("## 1. プロダクト定義");
      });
    });
  });

  describe("保護挙動", () => {
    context("既存ファイルあり & --apply & --force なし", () => {
      it("IT-CG-SIH-004: exit=2 で上書きせず --force を案内する", async () => {
        // Arrange
        await handler.handle({ kind: "product-overview-plan", apply: true });
        const targetPath = path.join(projectRoot, "docs/inception/_shared/product_overview_plan.md");
        await fs.writeFile(targetPath, "USER EDITED", "utf-8");

        // Act
        const actual = await handler.handle({ kind: "product-overview-plan", apply: true });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toContain("既に存在します");
        expect(actual.output).toContain("--force");
        expect(await fs.readFile(targetPath, "utf-8")).toBe("USER EDITED");
      });
    });

    context("既存ファイルあり & --force あり", () => {
      it("IT-CG-SIH-005: exit=0 で上書きする", async () => {
        // Arrange
        await handler.handle({ kind: "product-overview-plan", apply: true });
        const targetPath = path.join(projectRoot, "docs/inception/_shared/product_overview_plan.md");
        await fs.writeFile(targetPath, "USER EDITED", "utf-8");

        // Act
        const actual = await handler.handle({ kind: "product-overview-plan", apply: true, force: true });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain("上書き保存しました");
        expect(await fs.readFile(targetPath, "utf-8")).toContain("# プロダクト設計計画");
      });
    });

    context("--dry-run と --apply を同時指定", () => {
      it("IT-CG-SIH-006: exit=2 で書き込まない", async () => {
        // Arrange
        const args = { kind: "product-overview-plan", dryRun: true, apply: true };

        // Act
        const actual = await handler.handle(args);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toContain("--dry-run");
      });
    });
  });

  describe("入力検証", () => {
    context("--kind が空", () => {
      it("IT-CG-SIH-007: exit=2 で許容値を案内する", async () => {
        // Arrange
        const args = { kind: "" };

        // Act
        const actual = await handler.handle(args);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toContain("--kind");
        expect(actual.output).toContain("product-overview-plan");
      });
    });

    context("--kind が未知値", () => {
      it("IT-CG-SIH-008: exit=2 で許容値を案内する", async () => {
        // Arrange
        const args = { kind: "logical" };

        // Act
        const actual = await handler.handle(args);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toContain("未知の doc-kind");
        expect(actual.output).toContain("unit-design-plan");
      });
    });
  });

  describe("JSON 出力", () => {
    context("--json 指定かつ dry-run", () => {
      it("IT-CG-SIH-009: パース可能な JSON を返す", async () => {
        // Arrange
        const args = { kind: "story-writer-plan", format: "json" } as const;

        // Act
        const actual = await handler.handle(args);

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.output) as {
          kind: string;
          dryRun: boolean;
          written: boolean;
          targetPath: string;
        };
        expect(parsed.kind).toBe("story-writer-plan");
        expect(parsed.dryRun).toBe(true);
        expect(parsed.written).toBe(false);
        expect(parsed.targetPath).toContain("story_writer_plan.md");
      });
    });
  });
});
