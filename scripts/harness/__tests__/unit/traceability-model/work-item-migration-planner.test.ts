// @unit traceability-model
// @layer test
// @story H03-06
import { describe, expect, it } from "vitest";
import { WorkItemMigrationPlanner } from "../../../traceability-model/domain/services/work-item-migration-planner.ts";
import type { LegacyIssueDirectory } from "../../../traceability-model/domain/value-objects/work-item-migration-candidate.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const createEntry = (overrides: Partial<LegacyIssueDirectory> = {}): LegacyIssueDirectory => ({
  legacyId: "ISSUE-026",
  sourcePath: "docs/inception/issues/ISSUE-026",
  scope: "cross",
  descriptionFileName: "issue_description.md",
  content: "- **影響Unit**: traceability-model, phase-dependency-model\n- **深刻度**: High\n",
  targetExists: false,
  ...overrides,
});

target("WorkItemMigrationPlanner.plan", () => {
  describe("旧issueレイアウトからWI migration planを生成する", () => {
    context("cross-unit issueを渡した場合", () => {
      it("_cross配下のWI候補を返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createEntry()]);

        // Assert
        expect(actual.candidates[0].nextId).toBe("WI-026");
        expect(actual.candidates[0].targetPath).toBe("docs/inception/_cross/WI-026");
        expect(actual.candidates[0].frontmatterPreview).toContain("legacy_id: ISSUE-026");
        expect(actual.candidates[0].frontmatterPreview).toContain(
          "affects: [traceability-model, phase-dependency-model]",
        );
      });
    });

    context("unit-owned issueを渡した場合", () => {
      it("unit直下のWI候補を返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();
        const entry = createEntry({
          sourcePath: "docs/inception/traceability-model/issues/ISSUE-026",
          scope: "unit",
          unitName: "traceability-model",
        });

        // Act
        const actual = sut.plan([entry]);

        // Assert
        expect(actual.candidates[0].targetPath).toBe("docs/inception/traceability-model/WI-026");
        expect(actual.candidates[0].unitName).toBe("traceability-model");
      });
    });

    context("移動先が既に存在する場合", () => {
      it("conflict=trueを返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createEntry({ targetExists: true })]);

        // Assert
        expect(actual.candidates[0].conflict).toBe(true);
      });
    });

    context("cross-unit issueで影響Unitを抽出できない場合", () => {
      it("affects不足warningを返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createEntry({ content: "# ISSUE-026\n" })]);

        // Assert
        expect(actual.warnings[0]).toContain("cross-unit WI requires affects");
      });
    });
  });
});
