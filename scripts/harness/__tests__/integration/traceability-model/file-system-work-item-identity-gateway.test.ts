// @unit traceability-model
// @layer integration
// @story H03-05
// @work-item-id WI-106

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
  });
});
