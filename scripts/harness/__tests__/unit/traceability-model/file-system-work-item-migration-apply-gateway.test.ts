// @unit traceability-model
// @layer test
// @story H03-08
// @work-item-id WI-027

import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileSystemWorkItemMigrationApplyGateway } from "../../../traceability-model/infrastructure/gateways/file-system-work-item-migration-apply-gateway.ts";
import { context, target } from "../../helpers/test-helpers.ts";

let tempRoot: string | undefined;

const createTempRoot = async (): Promise<string> => {
  tempRoot = await mkdtemp(path.join(tmpdir(), "phasegate-wi-apply-"));
  return tempRoot;
};

const writeFileInRoot = async (rootDir: string, relativePath: string, content: string) => {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

target("FileSystemWorkItemMigrationApplyGateway.apply", () => {
  describe("旧issueディレクトリをWIへ移動する", () => {
    context("issue_description.md を持つ cross issue の場合", () => {
      it("target に移動し description.md へ rename して frontmatter を付与すること", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(rootDir, "docs/inception/issues/ISSUE-026/issue_description.md", "# Issue\n");
        await writeFileInRoot(rootDir, "docs/inception/issues/ISSUE-026/logical_design.md", "# Design\n");
        const sut = new FileSystemWorkItemMigrationApplyGateway({ rootDir });

        // Act
        const actual = await sut.apply({
          legacyId: "ISSUE-026",
          nextId: "WI-026",
          sourcePath: "docs/inception/issues/ISSUE-026",
          targetPath: "docs/inception/_cross/WI-026",
          scope: "cross",
          descriptionFileName: "issue_description.md",
          conflict: false,
          frontmatterPreview: "---\nid: WI-026\ntype: issue\n---",
        });

        // Assert
        const descriptionPath = path.join(rootDir, "docs/inception/_cross/WI-026/description.md");
        expect(existsSync(path.join(rootDir, "docs/inception/issues/ISSUE-026"))).toBe(false);
        expect(existsSync(descriptionPath)).toBe(true);
        expect(readFileSync(descriptionPath, "utf8").startsWith("---\nid: WI-026\ntype: issue\n---\n\n# Issue")).toBe(
          true,
        );
        expect(existsSync(path.join(rootDir, "docs/inception/_cross/WI-026/logical_design.md"))).toBe(true);
        expect(actual.descriptionPath).toBe("docs/inception/_cross/WI-026/description.md");
      });
    });

    context("description.md を持つ unit issue の場合", () => {
      it("同ファイルに frontmatter を付与し付随ファイルを保持すること", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(
          rootDir,
          "docs/inception/traceability-model/issues/ISSUE-027/description.md",
          "# Unit issue\n",
        );
        await writeFileInRoot(
          rootDir,
          "docs/inception/traceability-model/issues/ISSUE-027/tdd_implementation_plan.md",
          "# TDD\n",
        );
        const sut = new FileSystemWorkItemMigrationApplyGateway({ rootDir });

        // Act
        await sut.apply({
          legacyId: "ISSUE-027",
          nextId: "WI-027",
          sourcePath: "docs/inception/traceability-model/issues/ISSUE-027",
          targetPath: "docs/inception/traceability-model/WI-027",
          scope: "unit",
          unitName: "traceability-model",
          descriptionFileName: "description.md",
          conflict: false,
          frontmatterPreview: "---\nid: WI-027\ntype: issue\n---",
        });

        // Assert
        const descriptionPath = path.join(rootDir, "docs/inception/traceability-model/WI-027/description.md");
        expect(
          readFileSync(descriptionPath, "utf8").startsWith("---\nid: WI-027\ntype: issue\n---\n\n# Unit issue"),
        ).toBe(true);
        expect(
          existsSync(path.join(rootDir, "docs/inception/traceability-model/WI-027/tdd_implementation_plan.md")),
        ).toBe(true);
      });
    });

    context("説明ファイルを持たない旧issueの場合", () => {
      it("description.md を新規作成して frontmatter を付与すること", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(rootDir, "docs/inception/issues/ISSUE-002/e2e_verification_plan.md", "# E2E\n");
        const sut = new FileSystemWorkItemMigrationApplyGateway({ rootDir });

        // Act
        await sut.apply({
          legacyId: "ISSUE-002",
          nextId: "WI-002",
          sourcePath: "docs/inception/issues/ISSUE-002",
          targetPath: "docs/inception/_cross/WI-002",
          scope: "cross",
          descriptionFileName: null,
          conflict: false,
          frontmatterPreview: "---\nid: WI-002\ntype: issue\n---",
        });

        // Assert
        const descriptionPath = path.join(rootDir, "docs/inception/_cross/WI-002/description.md");
        expect(
          readFileSync(descriptionPath, "utf8").startsWith("---\nid: WI-002\ntype: issue\n---\n\n# ISSUE-002"),
        ).toBe(true);
        expect(existsSync(path.join(rootDir, "docs/inception/_cross/WI-002/e2e_verification_plan.md"))).toBe(true);
      });
    });

    context("旧 frontmatter (id が WI 以外 / legacy_id 不在) を持つ description.md の場合 (WI-027)", () => {
      it("planner 生成 frontmatter で旧 frontmatter を置換し、本文は保持すること", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(
          rootDir,
          "docs/inception/phase-dependency-model/H02-06/description.md",
          "---\nid: H02-06\nunit: phase-dependency-model\ntype: story\nissue: ISSUE-026\nphase: C-3\ncreated: 2026-04-24\n---\n\n# H02-06: WI frontmatter affects-aware story reflection\n",
        );
        const sut = new FileSystemWorkItemMigrationApplyGateway({ rootDir });

        // Act
        await sut.apply({
          legacyId: "H02-06",
          nextId: "WI-053",
          sourcePath: "docs/inception/phase-dependency-model/H02-06",
          targetPath: "docs/inception/phase-dependency-model/WI-053",
          scope: "unit",
          unitName: "phase-dependency-model",
          descriptionFileName: "description.md",
          conflict: false,
          frontmatterPreview:
            "---\nid: WI-053\ntype: story\nseverity: normal\nstatus: drafted\nlegacy_id: H02-06\n---",
        });

        // Assert
        const descriptionPath = path.join(rootDir, "docs/inception/phase-dependency-model/WI-053/description.md");
        const content = readFileSync(descriptionPath, "utf8");
        expect(content).toMatch(/^---\nid: WI-053\n/);
        expect(content).toContain("legacy_id: H02-06");
        expect(content).not.toMatch(/^id: H02-06$/m);
        expect(content).not.toContain("issue: ISSUE-026");
        expect(content).toContain("# H02-06: WI frontmatter affects-aware story reflection");
      });
    });

    context("既に planner 生成 frontmatter (id が target に一致 + legacy_id 存在) を持つ description.md の場合", () => {
      it("frontmatter を再生成せず冪等に保持すること", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        const existingContent =
          "---\nid: WI-051\ntype: story\nseverity: normal\nstatus: drafted\nlegacy_id: H02-04\n---\n\n# H02-04 body\n";
        await writeFileInRoot(rootDir, "docs/inception/phase-dependency-model/H02-04/description.md", existingContent);
        const sut = new FileSystemWorkItemMigrationApplyGateway({ rootDir });

        // Act
        await sut.apply({
          legacyId: "H02-04",
          nextId: "WI-051",
          sourcePath: "docs/inception/phase-dependency-model/H02-04",
          targetPath: "docs/inception/phase-dependency-model/WI-051",
          scope: "unit",
          unitName: "phase-dependency-model",
          descriptionFileName: "description.md",
          conflict: false,
          frontmatterPreview:
            "---\nid: WI-051\ntype: story\nseverity: normal\nstatus: drafted\nlegacy_id: H02-04\n---",
        });

        // Assert
        const descriptionPath = path.join(rootDir, "docs/inception/phase-dependency-model/WI-051/description.md");
        expect(readFileSync(descriptionPath, "utf8")).toBe(existingContent);
      });
    });
  });
});
