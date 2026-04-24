// @unit traceability-model
// @layer test
// @story H03-06
import { describe, expect, it, vi } from "vitest";
import { PlanWorkItemMigrationUseCase } from "../../../traceability-model/application/usecases/plan-work-item-migration-usecase.ts";
import type { LegacyIssueDirectory } from "../../../traceability-model/domain/value-objects/work-item-migration-candidate.ts";
import { context, target } from "../../helpers/test-helpers.ts";

target("PlanWorkItemMigrationUseCase.execute", () => {
  describe("WI migration dry-run planを生成する", () => {
    context("旧issueディレクトリが存在する場合", () => {
      it("source portから取得したentryをmigration candidateに変換すること", async () => {
        // Arrange
        const entry: LegacyIssueDirectory = {
          legacyId: "ISSUE-026",
          sourcePath: "docs/inception/issues/ISSUE-026",
          scope: "cross",
          descriptionFileName: "issue_description.md",
          content: "- **影響Unit**: traceability-model\n",
          targetExists: false,
        };
        const sourcePort = {
          listLegacyIssueDirectories: vi.fn().mockResolvedValue(Object.freeze([entry])),
        };
        const sut = new PlanWorkItemMigrationUseCase({ sourcePort });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.candidates).toHaveLength(1);
        expect(actual.candidates[0].nextId).toBe("WI-026");
        expect(sourcePort.listLegacyIssueDirectories).toHaveBeenCalledTimes(1);
      });
    });
  });
});
