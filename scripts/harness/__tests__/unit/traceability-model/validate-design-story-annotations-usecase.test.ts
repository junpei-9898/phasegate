// @unit traceability-model
// @layer test
// @story H03-05
// @work-item-id WI-106
import { describe, expect, it, vi } from "vitest";
import {
  DesignDocumentReadApplicationError,
  ValidateDesignStoryAnnotationsUseCase,
} from "../../../traceability-model/application/usecases/validate-design-story-annotations-usecase.ts";
import { DesignDocumentFlags } from "../../../traceability-model/domain/value-objects/design-document-flags.ts";
import { MetadataValidationResult } from "../../../traceability-model/domain/value-objects/metadata-validation-result.ts";
import { ProjectRelativePath } from "../../../traceability-model/domain/value-objects/project-relative-path.ts";
import { StoryId } from "../../../traceability-model/domain/value-objects/story-id.ts";
import { StoryIdAnnotation } from "../../../traceability-model/domain/value-objects/story-id-annotation.ts";
import { WorkItemFrontmatterValidationError } from "../../../traceability-model/domain/value-objects/work-item-frontmatter.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const createHarnessError = (
  overrides: Partial<{
    code: string;
    severity: "error" | "warning";
    message: string;
    suggestion: string;
    fix_example?: string;
  }> = {},
) =>
  Object.freeze({
    code: "L2-002",
    severity: "error" as const,
    message: "story annotation validation failed",
    suggestion: "設計文書の注釈を修正してください",
    ...overrides,
  });

const createPath = (value: string) => ProjectRelativePath.create(value);

const createStoryIdAnnotation = (
  overrides: Partial<{
    storyId: StoryId;
    lineNumber: number;
    contextLine: string;
    standaloneLine: boolean;
  }> = {},
) =>
  StoryIdAnnotation.create({
    storyId: StoryId.parse("H03-01"),
    lineNumber: 8,
    contextLine: "## StoryIdを検証する",
    standaloneLine: true,
    ...overrides,
  });

const createSut = (options: {
  readonly workItemIdentityEntries?: readonly {
    readonly filePath: string;
    readonly directoryId: string;
    readonly frontmatterId: string;
  }[];
} = {}) => {
  const designDocumentPort = {
    readFrontmatterFlags: vi.fn(),
    readStoryAnnotations: vi.fn(),
    readWorkItemFrontmatter: vi.fn(),
  };
  const validator = {
    validateDesignDocument: vi.fn(),
  };
  const workItemIdentityPort = options.workItemIdentityEntries
    ? {
      listWorkItemIdentities: vi.fn().mockResolvedValue(options.workItemIdentityEntries),
    }
    : undefined;

  return {
    designDocumentPort,
    validator,
    workItemIdentityPort,
    sut: new ValidateDesignStoryAnnotationsUseCase({
      designDocumentPort,
      validator,
      ...(workItemIdentityPort ? { workItemIdentityPort } : {}),
    }),
  };
};

target("ValidateDesignStoryAnnotationsUseCase.execute", () => {
  describe("設計文書のstory-idアノテーションを検証する", () => {
    // IT-TM-006
    context("初回作成文書で注釈が0件の場合", () => {
      it("frontmatter initial_creation: trueの文書で@story-id欠落が許容されること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut();
        const filePath = createPath("docs/product/construction/traceability-model/domain_model.md");
        const flags = DesignDocumentFlags.create({ initialCreation: true });
        designDocumentPort.readFrontmatterFlags.mockResolvedValue(flags);
        designDocumentPort.readStoryAnnotations.mockResolvedValue(Object.freeze([]));
        validator.validateDesignDocument.mockResolvedValue(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(true);
        expect(designDocumentPort.readFrontmatterFlags).toHaveBeenCalledWith(filePath);
        expect(designDocumentPort.readStoryAnnotations).toHaveBeenCalledWith(filePath);
      });
    });

    // IT-TM-007
    context("累積更新文書で注釈が0件の場合", () => {
      it("frontmatter未設定の文書で@story-id欠落がエラーとなること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut();
        const filePath = createPath("docs/product/construction/traceability-model/logical_design.md");
        designDocumentPort.readFrontmatterFlags.mockResolvedValue(
          DesignDocumentFlags.create({ initialCreation: false }),
        );
        designDocumentPort.readStoryAnnotations.mockResolvedValue(Object.freeze([]));
        validator.validateDesignDocument.mockResolvedValue(
          MetadataValidationResult.failure({
            errors: [createHarnessError()],
          }),
        );

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(false);
        expect(actual[0].errors[0].code).toBe("L2-002");
      });
    });

    // IT-TM-008
    context("独立行の@story-idが1件ありcatalogにも存在する場合", () => {
      it("@story-idが存在し独立行かつcatalog存在時にvalid=trueで返ること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut();
        const filePath = createPath("docs/product/construction/traceability-model/unit_test_design.md");
        const annotations = Object.freeze([createStoryIdAnnotation()]);
        designDocumentPort.readFrontmatterFlags.mockResolvedValue(
          DesignDocumentFlags.create({ initialCreation: false }),
        );
        designDocumentPort.readStoryAnnotations.mockResolvedValue(annotations);
        validator.validateDesignDocument.mockResolvedValue(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(true);
        expect(actual[0].errors).toEqual([]);
      });
    });

    // IT-TM-009
    context("@story-id行の末尾に本文が続く場合", () => {
      it("@story-idが独立行でない場合にvalid=falseで返ること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut();
        const filePath = createPath("docs/product/construction/traceability-model/unit_test_logic.md");
        const annotations = Object.freeze([createStoryIdAnnotation({ standaloneLine: false })]);
        const errors = Object.freeze([createHarnessError({ message: "@story-id は独立行で記述する必要があります" })]);
        designDocumentPort.readFrontmatterFlags.mockResolvedValue(
          DesignDocumentFlags.create({ initialCreation: false }),
        );
        designDocumentPort.readStoryAnnotations.mockResolvedValue(annotations);
        validator.validateDesignDocument.mockResolvedValue(MetadataValidationResult.failure({ errors }));

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(false);
        expect(actual[0].errors).toEqual(errors);
      });
    });

    // IT-TM-010
    context("frontmatter読み込み時に例外が発生する場合", () => {
      it("DesignDocumentPortの読み込み失敗時にDesignDocumentReadApplicationErrorが発生すること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut();
        const filePath = createPath("docs/product/construction/traceability-model/domain_model.md");
        designDocumentPort.readFrontmatterFlags.mockRejectedValue(new Error("read failed"));

        // Act
        const actual = sut.execute([filePath]);

        // Assert
        await expect(actual).rejects.toThrow(DesignDocumentReadApplicationError);
        expect(validator.validateDesignDocument).not.toHaveBeenCalled();
      });
    });

    // IT-TM-011
    context("1件目は初回作成、2件目は累積更新で有効annotationを持つ場合", () => {
      it("複数ファイルに対して各ファイルごとにfrontmatterフラグとannotationsが独立に評価されること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut();
        const filePath1 = createPath("docs/product/construction/traceability-model/domain_model.md");
        const filePath2 = createPath("docs/product/construction/traceability-model/unit_test_design.md");
        const flags1 = DesignDocumentFlags.create({ initialCreation: true });
        const flags2 = DesignDocumentFlags.create({ initialCreation: false });
        const annotations1 = Object.freeze([]);
        const annotations2 = Object.freeze([createStoryIdAnnotation({ storyId: StoryId.parse("H03-02") })]);
        designDocumentPort.readFrontmatterFlags.mockResolvedValueOnce(flags1).mockResolvedValueOnce(flags2);
        designDocumentPort.readStoryAnnotations.mockResolvedValueOnce(annotations1).mockResolvedValueOnce(annotations2);
        validator.validateDesignDocument
          .mockResolvedValueOnce(MetadataValidationResult.success())
          .mockResolvedValueOnce(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath1, filePath2]);

        // Assert
        expect(actual[0].valid).toBe(true);
        expect(actual[1].valid).toBe(true);
        expect(designDocumentPort.readFrontmatterFlags).toHaveBeenNthCalledWith(1, filePath1);
        expect(designDocumentPort.readFrontmatterFlags).toHaveBeenNthCalledWith(2, filePath2);
        expect(designDocumentPort.readStoryAnnotations).toHaveBeenNthCalledWith(1, filePath1);
        expect(designDocumentPort.readStoryAnnotations).toHaveBeenNthCalledWith(2, filePath2);
      });
    });

    // UT-TM-WV04
    context("WI frontmatterのparse errorが発生する場合", () => {
      it("L2-002エラーとして既存のstory-id検証結果に追加されること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut();
        const filePath = createPath("docs/product/construction/traceability-model/logical_design.md");
        designDocumentPort.readFrontmatterFlags.mockResolvedValue(
          DesignDocumentFlags.create({ initialCreation: false }),
        );
        designDocumentPort.readStoryAnnotations.mockResolvedValue(Object.freeze([createStoryIdAnnotation()]));
        designDocumentPort.readWorkItemFrontmatter.mockRejectedValue(
          new WorkItemFrontmatterValidationError("type 値が enum 外: broken"),
        );
        validator.validateDesignDocument.mockResolvedValue(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(false);
        expect(actual[0].errors[0].code).toBe("L2-002");
        expect(actual[0].errors[0].message).toContain("WorkItem frontmatter");
        expect(actual[0].errors[0].fix_example).toContain("id: WI-001");
        expect(designDocumentPort.readWorkItemFrontmatter).toHaveBeenCalledWith(filePath);
      });
    });

    // WI-106
    context("WI description.md の identity scan で重複がある場合", () => {
      it("L2-002エラーとして返ること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator, workItemIdentityPort } = createSut({
          workItemIdentityEntries: [
            {
              filePath: "docs/inception/_cross/WI-200/description.md",
              directoryId: "WI-200",
              frontmatterId: "WI-200",
            },
            {
              filePath: "docs/inception/agent-integration/WI-200/description.md",
              directoryId: "WI-200",
              frontmatterId: "WI-200",
            },
          ],
        });
        const filePath = createPath("docs/inception/_cross/WI-200/description.md");
        designDocumentPort.readFrontmatterFlags.mockResolvedValue(DesignDocumentFlags.create({ initialCreation: false }));
        designDocumentPort.readStoryAnnotations.mockResolvedValue(Object.freeze([]));
        designDocumentPort.readWorkItemFrontmatter.mockResolvedValue({
          id: "WI-200",
          type: "issue",
          severity: "normal",
          status: "drafted",
        });
        validator.validateDesignDocument.mockResolvedValue(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(false);
        expect(actual[0].errors[0].message).toContain("WI id WI-200 is duplicated");
        expect(workItemIdentityPort?.listWorkItemIdentities).toHaveBeenCalledTimes(1);
      });
    });

    // WI-106
    context("WI description.md の directory id と frontmatter id が一致しない場合", () => {
      it("L2-002エラーとして返ること", async () => {
        // Arrange
        const { sut, designDocumentPort, validator } = createSut({
          workItemIdentityEntries: [
            {
              filePath: "docs/inception/_cross/WI-201/description.md",
              directoryId: "WI-201",
              frontmatterId: "WI-202",
            },
          ],
        });
        const filePath = createPath("docs/inception/_cross/WI-201/description.md");
        designDocumentPort.readFrontmatterFlags.mockResolvedValue(DesignDocumentFlags.create({ initialCreation: false }));
        designDocumentPort.readStoryAnnotations.mockResolvedValue(Object.freeze([]));
        designDocumentPort.readWorkItemFrontmatter.mockResolvedValue({
          id: "WI-202",
          type: "issue",
          severity: "normal",
          status: "drafted",
        });
        validator.validateDesignDocument.mockResolvedValue(MetadataValidationResult.success());

        // Act
        const actual = await sut.execute([filePath]);

        // Assert
        expect(actual[0].valid).toBe(false);
        expect(actual[0].errors[0].message).toContain("does not match frontmatter id WI-202");
      });
    });
  });
});
