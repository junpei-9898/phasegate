// @unit traceability-model
// @layer test
// @story H03-08

import { describe, expect, it, vi } from "vitest";
import { ApplyWorkItemMigrationUseCase } from "../../../traceability-model/application/usecases/apply-work-item-migration-usecase.ts";
import type {
  WorkItemMigrationCandidate,
  WorkItemMigrationPlan,
} from "../../../traceability-model/domain/value-objects/work-item-migration-candidate.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const createCandidate = (conflict = false): WorkItemMigrationCandidate => ({
  legacyId: "ISSUE-026",
  nextId: "WI-026",
  sourcePath: "docs/inception/issues/ISSUE-026",
  targetPath: "docs/inception/_cross/WI-026",
  scope: "cross",
  descriptionFileName: "issue_description.md",
  conflict,
  frontmatterPreview: "---\nid: WI-026\n---",
});

const createPlan = (candidate: WorkItemMigrationCandidate): WorkItemMigrationPlan =>
  Object.freeze({
    candidates: Object.freeze([candidate]),
    warnings: Object.freeze(["warning"]),
  });

target("ApplyWorkItemMigrationUseCase.execute", () => {
  describe("WI migration applyを実行する", () => {
    context("conflict がない plan の場合", () => {
      it("全 candidate を apply port へ渡すこと", async () => {
        // Arrange
        const candidate = createCandidate();
        const planUseCase = { execute: vi.fn().mockResolvedValue(createPlan(candidate)) };
        const applyPort = {
          apply: vi.fn().mockResolvedValue({
            legacyId: "ISSUE-026",
            nextId: "WI-026",
            sourcePath: "docs/inception/issues/ISSUE-026",
            targetPath: "docs/inception/_cross/WI-026",
            descriptionPath: "docs/inception/_cross/WI-026/description.md",
          }),
        };
        const sut = new ApplyWorkItemMigrationUseCase({
          planWorkItemMigrationUseCase: planUseCase,
          applyPort,
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.blocked).toBe(false);
        expect(actual.applied).toHaveLength(1);
        expect(applyPort.apply).toHaveBeenCalledWith(candidate);
      });
    });

    context("conflict がある plan の場合", () => {
      it("apply port を呼ばず blocked result を返すこと", async () => {
        // Arrange
        const candidate = createCandidate(true);
        const planUseCase = { execute: vi.fn().mockResolvedValue(createPlan(candidate)) };
        const applyPort = { apply: vi.fn() };
        const sut = new ApplyWorkItemMigrationUseCase({
          planWorkItemMigrationUseCase: planUseCase,
          applyPort,
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.blocked).toBe(true);
        expect(actual.skipped).toEqual([candidate]);
        expect(applyPort.apply).not.toHaveBeenCalled();
      });
    });
  });
});
