// @unit traceability-model
// @layer test
// @story H03-05
// @work-item-id WI-140

import { describe, expect, it, vi } from "vitest";
import { ApplyWorkItemStatusUseCase } from "../../../traceability-model/application/usecases/apply-work-item-status-usecase.ts";
import type { WorkItemStatusReport } from "../../../traceability-model/domain/value-objects/work-item-status-report.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const createReport = (overrides: Partial<WorkItemStatusReport> = {}): WorkItemStatusReport => ({
  id: "WI-140",
  type: "issue",
  descriptionPath: "docs/inception/_cross/WI-140/description.md",
  currentStatus: "tested",
  derivedStatus: "implemented",
  stale: true,
  reason: "implementation evidence exists",
  nextAction: "add tests annotated with @work-item-id WI-140",
  evidence: {
    hasRequiredInceptionArtifacts: true,
    missingInceptionArtifacts: [],
    reflectedUnits: ["traceability-model"],
    missingReflectionUnits: [],
    implementationPaths: ["scripts/harness/traceability-model/application/usecases/apply-work-item-status-usecase.ts"],
    testPaths: [],
    missingImplementation: false,
    missingTests: true,
    validation: { state: "not-run", source: "test", blockingValidation: [] },
  },
  ...overrides,
});

target("ApplyWorkItemStatusUseCase.execute", () => {
  describe("downgrade policy", () => {
    context("allowDowngrade が未指定の場合", () => {
      it("status downgrade を書き込まず blocked に返す", async () => {
        const report = createReport();
        const derive = { execute: vi.fn().mockResolvedValue([report]) };
        const port = {
          listWorkItemStatusInputs: vi.fn(),
          applyDerivedStatuses: vi.fn().mockResolvedValue({ updated: [], unchanged: [], blocked: [] }),
        };
        const sut = new ApplyWorkItemStatusUseCase({
          deriveWorkItemStatusUseCase: derive,
          workItemStatusPort: port,
        });

        const actual = await sut.execute();

        expect(port.applyDerivedStatuses).toHaveBeenCalledWith([]);
        expect(actual.blocked).toEqual([report]);
      });
    });

    context("currentStatus=completed から derivedStatus=tested への回帰の場合", () => {
      it("completed を tested に降格せず blocked に返す", async () => {
        // Arrange
        const report = createReport({
          currentStatus: "completed",
          derivedStatus: "tested",
          stale: true,
        });
        const derive = { execute: vi.fn().mockResolvedValue([report]) };
        const port = {
          listWorkItemStatusInputs: vi.fn(),
          applyDerivedStatuses: vi.fn().mockResolvedValue({ updated: [], unchanged: [], blocked: [] }),
        };
        const sut = new ApplyWorkItemStatusUseCase({
          deriveWorkItemStatusUseCase: derive,
          workItemStatusPort: port,
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(port.applyDerivedStatuses).toHaveBeenCalledWith([]);
        expect(actual.blocked).toEqual([report]);
        expect(actual.updated).toEqual([]);
      });
    });

    context("allowDowngrade=true の場合", () => {
      it("status downgrade を apply port に渡す", async () => {
        const report = createReport();
        const derive = { execute: vi.fn().mockResolvedValue([report]) };
        const port = {
          listWorkItemStatusInputs: vi.fn(),
          applyDerivedStatuses: vi.fn().mockResolvedValue({ updated: [report], unchanged: [], blocked: [] }),
        };
        const sut = new ApplyWorkItemStatusUseCase({
          deriveWorkItemStatusUseCase: derive,
          workItemStatusPort: port,
        });

        const actual = await sut.execute({ allowDowngrade: true });

        expect(port.applyDerivedStatuses).toHaveBeenCalledWith([report]);
        expect(actual.updated).toEqual([report]);
        expect(actual.blocked).toEqual([]);
      });
    });
  });
});
