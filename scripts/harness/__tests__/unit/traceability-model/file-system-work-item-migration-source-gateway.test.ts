// @unit traceability-model
// @layer test
// @story H03-06
// @work-item-id WI-027
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileSystemWorkItemMigrationSourceGateway } from "../../../traceability-model/infrastructure/gateways/file-system-work-item-migration-source-gateway.ts";
import { context, target } from "../../helpers/test-helpers.ts";

let tempRoot: string | undefined;

const createTempRoot = async (): Promise<string> => {
  tempRoot = await mkdtemp(path.join(tmpdir(), "phasegate-wi-migration-"));
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

target("FileSystemWorkItemMigrationSourceGateway.listLegacyIssueDirectories", () => {
  describe("旧issueレイアウトを走査する", () => {
    context("cross-unit issueとunit-owned issueがある場合", () => {
      it("両方をlegacy issue entryとして返すこと", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(
          rootDir,
          "docs/inception/issues/ISSUE-026/issue_description.md",
          "- **影響Unit**: traceability-model\n",
        );
        await writeFileInRoot(
          rootDir,
          "docs/inception/traceability-model/issues/ISSUE-027/description.md",
          "# Unit issue\n",
        );
        const sut = new FileSystemWorkItemMigrationSourceGateway({ rootDir });

        // Act
        const actual = await sut.listLegacyIssueDirectories();

        // Assert
        expect(actual.map((entry) => entry.sourcePath)).toEqual([
          "docs/inception/issues/ISSUE-026",
          "docs/inception/traceability-model/issues/ISSUE-027",
        ]);
        expect(actual[0].scope).toBe("cross");
        expect(actual[1].scope).toBe("unit");
        expect(actual[1].descriptionFileName).toBe("description.md");
      });
    });

    context("移動先が既に存在する場合", () => {
      it("targetExists=trueを返すこと", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(rootDir, "docs/inception/issues/ISSUE-026/issue_description.md", "# Issue\n");
        await mkdir(path.join(rootDir, "docs/inception/_cross/WI-026"), { recursive: true });
        const sut = new FileSystemWorkItemMigrationSourceGateway({ rootDir });

        // Act
        const actual = await sut.listLegacyIssueDirectories();

        // Assert
        expect(actual[0].targetExists).toBe(true);
      });
    });

    context("説明ファイルが存在しない旧issueディレクトリがある場合", () => {
      it("空contentのlegacy issue entryとして返すこと", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await mkdir(path.join(rootDir, "docs/inception/issues/ISSUE-002"), { recursive: true });
        await writeFileInRoot(rootDir, "docs/inception/issues/ISSUE-026/issue_description.md", "# Issue\n");
        const sut = new FileSystemWorkItemMigrationSourceGateway({ rootDir });

        // Act
        const actual = await sut.listLegacyIssueDirectories();

        // Assert
        expect(actual.map((entry) => entry.legacyId)).toEqual(["ISSUE-002", "ISSUE-026"]);
        expect(actual[0].descriptionFileName).toBeNull();
        expect(actual[0].content).toBe("");
      });
    });

    context("H-ID旧storyディレクトリがunit直下にある場合 (UT-TM-WM23)", () => {
      it("unit scopeのlegacy entryとして返すこと", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(rootDir, "docs/inception/phase-dependency-model/H02-04/description.md", "# H02-04\n");
        await mkdir(path.join(rootDir, "docs/inception/harness-api/H09-01"), { recursive: true });
        const sut = new FileSystemWorkItemMigrationSourceGateway({ rootDir });

        // Act
        const actual = await sut.listLegacyIssueDirectories();

        // Assert
        const hEntries = actual.filter((e) => /^H\d{2}-\d{2}$/.test(e.legacyId));
        expect(hEntries.map((e) => e.legacyId).sort()).toEqual(["H02-04", "H09-01"]);
        expect(hEntries.every((e) => e.scope === "unit")).toBe(true);
        const h0204 = hEntries.find((e) => e.legacyId === "H02-04");
        expect(h0204?.unitName).toBe("phase-dependency-model");
        expect(h0204?.descriptionFileName).toBe("description.md");
      });
    });

    context("H-ID directoryと既存issue directoryが同じunitに混在する場合", () => {
      it("両方をlegacy entryとして列挙する", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(
          rootDir,
          "docs/inception/traceability-model/issues/ISSUE-027/description.md",
          "# Unit issue\n",
        );
        await writeFileInRoot(
          rootDir,
          "docs/inception/traceability-model/H03-06/description.md",
          "# H03-06\n",
        );
        const sut = new FileSystemWorkItemMigrationSourceGateway({ rootDir });

        // Act
        const actual = await sut.listLegacyIssueDirectories();

        // Assert
        const ids = actual.map((e) => e.legacyId).sort();
        expect(ids).toEqual(["H03-06", "ISSUE-027"]);
      });
    });
  });

  describe("既存WIディレクトリのIDを列挙する (UT-TM-WM24)", () => {
    context("_cross配下とunit配下の双方にWIディレクトリが存在する場合", () => {
      it("両方のWI IDをsortして返す", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await mkdir(path.join(rootDir, "docs/inception/_cross/WI-026"), { recursive: true });
        await mkdir(path.join(rootDir, "docs/inception/_cross/WI-001"), { recursive: true });
        await mkdir(path.join(rootDir, "docs/inception/traceability-model/WI-002"), { recursive: true });
        await mkdir(path.join(rootDir, "docs/inception/traceability-model/issues"), { recursive: true });
        const sut = new FileSystemWorkItemMigrationSourceGateway({ rootDir });

        // Act
        const actual = await sut.listExistingWorkItemIds();

        // Assert
        expect(actual).toEqual(["WI-001", "WI-002", "WI-026"]);
      });
    });

    context("WI directoryが存在しない場合", () => {
      it("空配列を返す", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await mkdir(path.join(rootDir, "docs/inception"), { recursive: true });
        const sut = new FileSystemWorkItemMigrationSourceGateway({ rootDir });

        // Act
        const actual = await sut.listExistingWorkItemIds();

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});
