// @unit traceability-model
// @layer test
// @story H03-05
// @work-item-id WI-126

import { describe, expect, it } from "vitest";
import { WorkItemStatusDerivationService } from "../../../traceability-model/domain/services/work-item-status-derivation-service.ts";
import type { WorkItemStatusInput } from "../../../traceability-model/domain/value-objects/work-item-status-report.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const createInput = (overrides: Partial<WorkItemStatusInput> = {}): WorkItemStatusInput => ({
  descriptionPath: "docs/inception/_cross/WI-126/description.md",
  directoryId: "WI-126",
  ownerUnit: null,
  frontmatter: {
    id: "WI-126",
    type: "story",
    status: "drafted",
    affects: ["traceability-model", "harness-api"],
  },
  requiredInceptionArtifacts: ["description.md", "logical_design.md", "domain_model.md", "unit_test_design.md"],
  existingInceptionArtifacts: ["description.md", "logical_design.md", "domain_model.md", "unit_test_design.md"],
  affectedUnits: ["traceability-model", "harness-api"],
  productReflectionPaths: [
    "docs/product/construction/traceability-model/logical_design.md",
    "docs/product/construction/harness-api/logical_design.md",
  ],
  implementationPaths: [],
  testPaths: [],
  ...overrides,
});

target("WorkItemStatusDerivationService.derive", () => {
  describe("WI evidenceからderived statusを計算する", () => {
    context("product reflection が全 affected unit に存在する場合", () => {
      it("reflected を返し current との差分を stale として示す", () => {
        const sut = new WorkItemStatusDerivationService();

        const actual = sut.derive(createInput());

        expect(actual.currentStatus).toBe("drafted");
        expect(actual.derivedStatus).toBe("reflected");
        expect(actual.stale).toBe(true);
        expect(actual.reason).toContain("all affected units");
      });
    });

    context("test evidence が存在する story の場合", () => {
      it("tested を返す", () => {
        const sut = new WorkItemStatusDerivationService();

        const actual = sut.derive(createInput({
          implementationPaths: ["scripts/harness/traceability-model/application/usecases/derive-work-item-status-usecase.ts"],
          testPaths: ["scripts/harness/__tests__/unit/traceability-model/work-item-status-derivation-service.test.ts"],
        }));

        expect(actual.derivedStatus).toBe("tested");
        expect(actual.nextAction).toBe("status is up to date");
      });
    });

    context("fix WI の shortcut path の場合", () => {
      it("実装 evidence があれば tested を要求せず implemented を返す", () => {
        const sut = new WorkItemStatusDerivationService();

        const actual = sut.derive(createInput({
          frontmatter: { id: "WI-200", type: "fix", status: "reflected", affects: ["traceability-model"] },
          requiredInceptionArtifacts: ["description.md"],
          existingInceptionArtifacts: ["description.md"],
          affectedUnits: ["traceability-model"],
          productReflectionPaths: ["docs/product/construction/traceability-model/logical_design.md"],
          implementationPaths: ["scripts/harness/traceability-model/index.ts"],
          testPaths: [],
        }));

        expect(actual.derivedStatus).toBe("implemented");
        expect(actual.nextAction).toBe("status is up to date");
      });
    });
  });
});
