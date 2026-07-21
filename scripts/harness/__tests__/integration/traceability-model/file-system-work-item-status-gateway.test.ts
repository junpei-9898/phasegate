// @unit traceability-model
// @layer integration
// @story H03-05
// @work-item-id WI-126
// @work-item-id WI-337

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileSystemWorkItemStatusGateway } from "../../../traceability-model/infrastructure/gateways/file-system-work-item-status-gateway.ts";
import { context, target } from "../../helpers/test-helpers.ts";

let tempRoot: string | undefined;

const createTempRoot = async (): Promise<string> => {
  tempRoot = await mkdtemp(path.join(tmpdir(), "phasegate-wi-status-"));
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

target("FileSystemWorkItemStatusGateway", () => {
  describe("WI status evidenceをファイルシステムから収集・適用する", () => {
    context("description/product/source/test が存在する場合", () => {
      it("status入力を収集し apply では frontmatter status 行のみ更新する", async () => {
        const rootDir = await createTempRoot();
        await writeFileInRoot(
          rootDir,
          "docs/inception/traceability-model/WI-126/description.md",
          [
            "---",
            "id: WI-126",
            "type: story",
            "severity: normal",
            "status: drafted",
            "---",
            "",
            "# WI-126",
          ].join("\n"),
        );
        await writeFileInRoot(rootDir, "docs/inception/traceability-model/WI-126/logical_design.md", "x");
        await writeFileInRoot(rootDir, "docs/inception/traceability-model/WI-126/domain_model.md", "x");
        await writeFileInRoot(rootDir, "docs/inception/traceability-model/WI-126/unit_test_design.md", "x");
        await writeFileInRoot(
          rootDir,
          "docs/product/construction/traceability-model/logical_design.md",
          "<!-- @work-item-id WI-126 -->",
        );
        await writeFileInRoot(
          rootDir,
          "scripts/harness/traceability-model/index.ts",
          "// @work-item-id WI-126\nexport {};",
        );
        await writeFileInRoot(
          rootDir,
          "scripts/harness/__tests__/unit/traceability-model/work-item-status.test.ts",
          "// @work-item-id WI-126\nimport { expect, it } from 'vitest';\nit('x', () => expect(true).toBe(true));",
        );
        const sut = new FileSystemWorkItemStatusGateway({ rootDir });

        const actual = await sut.listWorkItemStatusInputs();

        expect(actual).toHaveLength(1);
        expect(actual[0].productReflectionPaths).toEqual([
          "docs/product/construction/traceability-model/logical_design.md",
        ]);
        expect(actual[0].implementationPaths).toEqual(["scripts/harness/traceability-model/index.ts"]);
        expect(actual[0].testPaths).toEqual([
          "scripts/harness/__tests__/unit/traceability-model/work-item-status.test.ts",
        ]);

        await sut.applyDerivedStatuses([
          {
            id: "WI-126",
            type: "story",
            descriptionPath: "docs/inception/traceability-model/WI-126/description.md",
            currentStatus: "drafted",
            derivedStatus: "tested",
            stale: true,
            reason: "test evidence with @work-item-id exists",
            nextAction: "status is up to date",
            evidence: {
              hasRequiredInceptionArtifacts: true,
              missingInceptionArtifacts: [],
              reflectedUnits: ["traceability-model"],
              missingReflectionUnits: [],
              implementationPaths: [],
              testPaths: [],
              missingImplementation: false,
              missingTests: false,
              validation: { state: "not-run", source: "test", blockingValidation: [] },
            },
          },
        ]);

        const description = await readFile(
          path.join(rootDir, "docs/inception/traceability-model/WI-126/description.md"),
          "utf8",
        );
        expect(description).toContain("status: tested");
        expect(description).toContain("# WI-126");
      });
    });

    context("severity が不正な description を含む場合", () => {
      it("不正なseverityを持つファイルだけを警告して正常なWIの走査を継続する", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        const validWorkItems = ["WI-337", "WI-338"] as const;
        for (const workItemId of validWorkItems) {
          await writeFileInRoot(
            rootDir,
            `docs/inception/traceability-model/${workItemId}/description.md`,
            ["---", `id: ${workItemId}`, "type: fix", "severity: normal", "status: drafted", "---"].join("\n"),
          );
        }
        const invalidPath = "docs/inception/traceability-model/WI-339/description.md";
        await writeFileInRoot(
          rootDir,
          invalidPath,
          ["---", "id: WI-339", "type: fix", "severity: urgent", "status: drafted", "---"].join("\n"),
        );
        const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const sut = new FileSystemWorkItemStatusGateway({ rootDir });

        // Act
        const inputs = await sut.listWorkItemStatusInputs();
        const actual = {
          ids: inputs.map((input) => input.frontmatter.id),
          warning: warning.mock.calls.flat().join(" "),
        };

        // Assert
        expect(actual.ids).toEqual(validWorkItems);
        expect(actual.warning).toContain(invalidPath);
        expect(actual.warning).toContain("severity 値が enum 外: urgent");
      });
    });
  });
});
