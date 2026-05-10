// @unit traceability-model
// @layer test
// @story H03-05
// @work-item-id WI-126

import { describe, expect, it, vi } from "vitest";
import { WorkItemStatusCommandHandler } from "../../../traceability-model/presentation/cli/work-item-status-command-handler.ts";
import type { WorkItemStatusReport } from "../../../traceability-model/domain/value-objects/work-item-status-report.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const report: WorkItemStatusReport = {
  id: "WI-126",
  type: "story",
  descriptionPath: "docs/inception/_cross/WI-126/description.md",
  currentStatus: "drafted",
  derivedStatus: "reflected",
  stale: true,
  reason: "all affected units have product reflection",
  nextAction: "add implementation annotated with @work-item-id WI-126",
  evidence: {
    hasRequiredInceptionArtifacts: true,
    reflectedUnits: ["traceability-model"],
    missingReflectionUnits: [],
    implementationPaths: [],
    testPaths: [],
  },
};

target("WorkItemStatusCommandHandler.execute", () => {
  describe("WI status commandを実行する", () => {
    context("--dry-run --fail-on-stale の場合", () => {
      it("stale report を検出して終了コード1を返す", async () => {
        const derive = { execute: vi.fn().mockResolvedValue([report]) };
        const apply = { execute: vi.fn() };
        const sut = new WorkItemStatusCommandHandler({
          deriveWorkItemStatusUseCase: derive,
          applyWorkItemStatusUseCase: apply,
        });

        const actual = await sut.execute({ dryRun: true, failOnStale: true });

        expect(actual.exitCode).toBe(1);
        expect(actual.text).toContain("current=drafted derived=reflected");
        expect(apply.execute).not.toHaveBeenCalled();
      });
    });

    context("--apply の場合", () => {
      it("apply usecase の結果を表示する", async () => {
        const derive = { execute: vi.fn() };
        const apply = { execute: vi.fn().mockResolvedValue({ updated: [report], unchanged: [] }) };
        const sut = new WorkItemStatusCommandHandler({
          deriveWorkItemStatusUseCase: derive,
          applyWorkItemStatusUseCase: apply,
        });

        const actual = await sut.execute({ apply: true });

        expect(actual.exitCode).toBe(0);
        expect(actual.text).toContain("updated WI-126: drafted -> reflected");
        expect(derive.execute).not.toHaveBeenCalled();
      });
    });
  });
});
