// @unit traceability-model
// @layer test
// @story H03-06
// @work-item-id WI-027
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
          listExistingWorkItemIds: vi.fn().mockResolvedValue(Object.freeze([])),
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

    context("既存WI directoryと混在するH-ID entryを渡した場合", () => {
      it("planner に existingWorkItemIds を渡してH-ID採番に反映する", async () => {
        // Arrange
        const hEntry: LegacyIssueDirectory = {
          legacyId: "H02-04",
          sourcePath: "docs/inception/phase-dependency-model/H02-04",
          scope: "unit",
          unitName: "phase-dependency-model",
          descriptionFileName: "description.md",
          content: "# H02-04\n",
          targetExists: false,
        };
        const existing = Array.from({ length: 27 }, (_, i) => `WI-${String(i + 1).padStart(3, "0")}`);
        const sourcePort = {
          listLegacyIssueDirectories: vi.fn().mockResolvedValue(Object.freeze([hEntry])),
          listExistingWorkItemIds: vi.fn().mockResolvedValue(Object.freeze(existing)),
        };
        const sut = new PlanWorkItemMigrationUseCase({ sourcePort });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.candidates).toHaveLength(1);
        expect(actual.candidates[0].nextId).toBe("WI-028");
        expect(sourcePort.listExistingWorkItemIds).toHaveBeenCalledTimes(1);
      });
    });
  });
});
