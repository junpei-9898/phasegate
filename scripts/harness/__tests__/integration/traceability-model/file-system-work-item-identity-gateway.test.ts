// @unit traceability-model
// @layer integration
// @story H03-05
// @work-item-id WI-106
// @work-item-id WI-337

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileSystemWorkItemIdentityGateway } from "../../../traceability-model/infrastructure/gateways/file-system-work-item-identity-gateway.ts";
import { context, target } from "../../helpers/test-helpers.ts";

let tempRoot: string | undefined;

const createTempRoot = async (): Promise<string> => {
  tempRoot = await mkdtemp(path.join(tmpdir(), "phasegate-wi-identity-"));
  return tempRoot;
};

const writeFileInRoot = async (rootDir: string, relativePath: string, content: string) => {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

afterEach(async () => {
  vi.restoreAllMocks();
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

target("FileSystemWorkItemIdentityGateway", () => {
  describe("docs/inception配下のWI identityを走査する", () => {
    context("_crossとunit配下にWI descriptionがある場合", () => {
      it("frontmatter idとdirectory idを返す", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await writeFileInRoot(
          rootDir,
          "docs/inception/_cross/WI-200/description.md",
          ["---", "id: WI-200", "type: issue", "---", ""].join("\n"),
        );
        await writeFileInRoot(
          rootDir,
          "docs/inception/agent-integration/WI-201/description.md",
          ["---", "id: WI-202", "type: issue", "---", ""].join("\n"),
        );
        const sut = new FileSystemWorkItemIdentityGateway({ rootDir });

        // Act
        const actual = await sut.listWorkItemIdentities();

        // Assert
        expect(actual).toEqual([
          {
            filePath: "docs/inception/_cross/WI-200/description.md",
            directoryId: "WI-200",
            frontmatterId: "WI-200",
          },
          {
            filePath: "docs/inception/agent-integration/WI-201/description.md",
            directoryId: "WI-201",
            frontmatterId: "WI-202",
          },
        ]);
      });
    });

    context("不正な severity の WI description が混在する場合", () => {
      it("不正なfrontmatterを警告して残りのWI identityを返す", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        const validPath = "docs/inception/traceability-model/WI-337/description.md";
        const invalidPath = "docs/inception/traceability-model/WI-338/description.md";
        await writeFileInRoot(
          rootDir,
          validPath,
          ["---", "id: WI-337", "type: fix", "severity: major", "---"].join("\n"),
        );
        await writeFileInRoot(
          rootDir,
          invalidPath,
          ["---", "id: WI-338", "type: fix", "severity: urgent", "---"].join("\n"),
        );
        const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const sut = new FileSystemWorkItemIdentityGateway({ rootDir });

        // Act
        const entries = await sut.listWorkItemIdentities();
        const actual = {
          entries,
          warning: warning.mock.calls.flat().join(" "),
        };

        // Assert
        expect(actual.entries).toEqual([
          {
            filePath: validPath,
            directoryId: "WI-337",
            frontmatterId: "WI-337",
          },
        ]);
        expect(actual.warning).toContain(invalidPath);
        expect(actual.warning).toContain("severity 値が enum 外: urgent");
      });
    });
  });
});
