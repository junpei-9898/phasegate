// @unit traceability-model
// @layer test
// @story H03-05
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectRelativePath } from "../../../traceability-model/domain/value-objects/project-relative-path.ts";
import { WorkItemFrontmatterValidationError } from "../../../traceability-model/domain/value-objects/work-item-frontmatter.ts";
import { MarkdownDesignDocumentGateway } from "../../../traceability-model/infrastructure/gateways/markdown-design-document-gateway.ts";
import { context, target } from "../../helpers/test-helpers.ts";

let tempRoot: string | undefined;

const createTempRoot = async (): Promise<string> => {
  tempRoot = await mkdtemp(path.join(tmpdir(), "phasegate-md-gateway-"));
  return tempRoot;
};

const writeDesignDocument = async (rootDir: string, relativePath: string, content: string) => {
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

target("MarkdownDesignDocumentGateway.readWorkItemFrontmatter", () => {
  describe("WI frontmatterを読み取る", () => {
    // UT-TM-WV01
    context("有効なWI frontmatterがある場合", () => {
      it("WorkItemFrontmatterオブジェクトを返すこと", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        const filePath = ProjectRelativePath.create("docs/product/construction/traceability-model/logical_design.md");
        await writeDesignDocument(
          rootDir,
          filePath.value,
          `---
id: WI-001
type: story
severity: normal
status: drafted
---
# Logical Design
`,
        );
        const sut = new MarkdownDesignDocumentGateway({ rootDir });

        // Act
        const actual = await sut.readWorkItemFrontmatter(filePath);

        // Assert
        expect(actual?.id).toBe("WI-001");
        expect(actual?.type).toBe("story");
        expect(actual?.severity).toBe("normal");
        expect(actual?.status).toBe("drafted");
      });
    });

    // UT-TM-WV02
    context("WI frontmatterがない場合", () => {
      it("nullを返すこと", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        const filePath = ProjectRelativePath.create("docs/product/construction/traceability-model/domain_model.md");
        await writeDesignDocument(rootDir, filePath.value, "# Domain Model\n");
        const sut = new MarkdownDesignDocumentGateway({ rootDir });

        // Act
        const actual = await sut.readWorkItemFrontmatter(filePath);

        // Assert
        expect(actual).toBeNull();
      });
    });

    // UT-TM-WV03
    context("WI frontmatterが不正な場合", () => {
      it("WorkItemFrontmatterValidationErrorが発生すること", async () => {
        // Arrange
        const rootDir = await createTempRoot();
        const filePath = ProjectRelativePath.create("docs/product/construction/traceability-model/unit_test_design.md");
        await writeDesignDocument(
          rootDir,
          filePath.value,
          `---
id: WI-001
type: broken
---
# Unit Test Design
`,
        );
        const sut = new MarkdownDesignDocumentGateway({ rootDir });

        // Act
        const actual = sut.readWorkItemFrontmatter(filePath);

        // Assert
        await expect(actual).rejects.toThrow(WorkItemFrontmatterValidationError);
      });
    });
  });
});
