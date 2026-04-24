// @unit traceability-model
// @layer test
// @story H03-07

import { describe, expect, it, vi } from "vitest";
import type {
  WorkItemMigrationApplyResult,
  WorkItemMigrationPlan,
} from "../../../traceability-model/domain/value-objects/work-item-migration-candidate.ts";
import { MigrateWorkItemsCommandHandler } from "../../../traceability-model/presentation/cli/migrate-work-items-command-handler.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const createPlan = (conflict = false): WorkItemMigrationPlan =>
  Object.freeze({
    candidates: Object.freeze([
      {
        legacyId: "ISSUE-026",
        nextId: "WI-026",
        sourcePath: "docs/inception/issues/ISSUE-026",
        targetPath: "docs/inception/_cross/WI-026",
        scope: "cross" as const,
        descriptionFileName: "issue_description.md" as const,
        conflict,
        frontmatterPreview: "---\nid: WI-026\n---",
      },
    ]),
    warnings: Object.freeze(["ISSUE-026: cross-unit WI requires affects"]),
  });

const createApplyResult = (blocked = false): WorkItemMigrationApplyResult =>
  Object.freeze({
    applied: blocked
      ? Object.freeze([])
      : Object.freeze([
          {
            legacyId: "ISSUE-026",
            nextId: "WI-026",
            sourcePath: "docs/inception/issues/ISSUE-026",
            targetPath: "docs/inception/_cross/WI-026",
            descriptionPath: "docs/inception/_cross/WI-026/description.md",
          },
        ]),
    skipped: blocked ? createPlan(true).candidates : Object.freeze([]),
    warnings: Object.freeze([]),
    blocked,
  });

target("MigrateWorkItemsCommandHandler.execute", () => {
  describe("WI migration dry-runを表示する", () => {
    context("--dry-run が指定された場合", () => {
      it("human text に source と target とIDを出力すること", async () => {
        // Arrange
        const useCase = { execute: vi.fn().mockResolvedValue(createPlan()) };
        const sut = new MigrateWorkItemsCommandHandler({ planWorkItemMigrationUseCase: useCase });

        // Act
        const actual = await sut.execute({ dryRun: true });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.text).toContain("docs/inception/issues/ISSUE-026");
        expect(actual.text).toContain("docs/inception/_cross/WI-026");
        expect(actual.text).toContain("ISSUE-026 -> WI-026");
        expect(useCase.execute).toHaveBeenCalledTimes(1);
      });
    });

    context("--json が指定された場合", () => {
      it("JSON に candidates と warnings を出力すること", async () => {
        // Arrange
        const useCase = { execute: vi.fn().mockResolvedValue(createPlan()) };
        const sut = new MigrateWorkItemsCommandHandler({ planWorkItemMigrationUseCase: useCase });

        // Act
        const actual = await sut.execute({ dryRun: true, json: true });

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.text);
        expect(parsed.candidates).toHaveLength(1);
        expect(parsed.warnings).toHaveLength(1);
      });
    });

    context("conflict candidate がある場合", () => {
      it("終了コード1を返すこと", async () => {
        // Arrange
        const useCase = { execute: vi.fn().mockResolvedValue(createPlan(true)) };
        const sut = new MigrateWorkItemsCommandHandler({ planWorkItemMigrationUseCase: useCase });

        // Act
        const actual = await sut.execute({ dryRun: true });

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.text).toContain("conflict: yes");
      });
    });

    context("--dry-run が指定されていない場合", () => {
      it("終了コード2を返し、usecase を実行しないこと", async () => {
        // Arrange
        const useCase = { execute: vi.fn() };
        const sut = new MigrateWorkItemsCommandHandler({ planWorkItemMigrationUseCase: useCase });

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.text).toContain("either --dry-run or --apply is required");
        expect(useCase.execute).not.toHaveBeenCalled();
      });
    });

    context("--apply が指定された場合", () => {
      it("apply result を表示し終了コード0を返すこと", async () => {
        // Arrange
        const planUseCase = { execute: vi.fn() };
        const applyUseCase = { execute: vi.fn().mockResolvedValue(createApplyResult()) };
        const sut = new MigrateWorkItemsCommandHandler({
          planWorkItemMigrationUseCase: planUseCase,
          applyWorkItemMigrationUseCase: applyUseCase,
        });

        // Act
        const actual = await sut.execute({ apply: true });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.text).toContain("WorkItem migration apply");
        expect(actual.text).toContain("applied ISSUE-026 -> WI-026");
        expect(planUseCase.execute).not.toHaveBeenCalled();
        expect(applyUseCase.execute).toHaveBeenCalledTimes(1);
      });
    });

    context("--apply --dry-run が同時指定された場合", () => {
      it("終了コード2を返し usecase を実行しないこと", async () => {
        // Arrange
        const planUseCase = { execute: vi.fn() };
        const applyUseCase = { execute: vi.fn() };
        const sut = new MigrateWorkItemsCommandHandler({
          planWorkItemMigrationUseCase: planUseCase,
          applyWorkItemMigrationUseCase: applyUseCase,
        });

        // Act
        const actual = await sut.execute({ apply: true, dryRun: true });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.text).toContain("cannot be used together");
        expect(planUseCase.execute).not.toHaveBeenCalled();
        expect(applyUseCase.execute).not.toHaveBeenCalled();
      });
    });
  });
});
