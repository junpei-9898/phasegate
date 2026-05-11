// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-143

import { describe, expect, it, vi } from "vitest";
import { WiWorkflowDriftCheck } from "../../../../installation/application/checks/wi-workflow-drift-check.js";
import { target } from "../../../helpers/test-helpers.js";
import { createInspector, projectFile } from "./check-test-helpers.js";

target("WiWorkflowDriftCheck", () => {
  describe("run", () => {
    it("WI 0件かつ ad-hoc plan がある場合は red finding を返すこと", async () => {
      const inspector = createInspector({
        listFiles: vi.fn().mockResolvedValue([projectFile("docs/inception/codding_plan/foo_plan.md")]),
      });
      const sut = new WiWorkflowDriftCheck();

      const actual = await sut.run("/tmp/project", inspector);

      if (actual === null) throw new Error("expected wi-workflow-drift finding");
      expect(actual.toJSON()).toMatchObject({
        checkId: "wi-workflow-drift",
        severity: "red",
        repairHint: "phasegate migrate work-items --apply",
      });
    });

    it("phase-gate relaxed と ad-hoc plan の組み合わせを red flag message に含めること", async () => {
      const inspector = createInspector({
        listFiles: vi.fn().mockResolvedValue([projectFile("docs/inception/_shared/story_writer_plan.md")]),
        readJson: vi.fn().mockResolvedValue({ quickMode: { relaxedGates: ["phase-gate"] } }),
      });
      const sut = new WiWorkflowDriftCheck();

      const actual = await sut.run("/tmp/project", inspector);

      if (actual === null) throw new Error("expected relaxed phase-gate finding");
      expect(actual.message).toContain("quickMode.relaxedGates includes phase-gate");
    });

    it("WI description が存在する場合は drift finding を返さないこと", async () => {
      const inspector = createInspector({
        listFiles: vi
          .fn()
          .mockResolvedValue([
            projectFile("docs/inception/_cross/WI-001/description.md"),
            projectFile("docs/inception/_shared/story_writer_plan.md"),
          ]),
      });
      const sut = new WiWorkflowDriftCheck();

      const actual = await sut.run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });
  });
});
