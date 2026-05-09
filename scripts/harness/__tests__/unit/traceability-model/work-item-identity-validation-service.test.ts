// @unit traceability-model
// @layer test
// @story H03-05
// @work-item-id WI-106

import { describe, expect, it } from "vitest";
import { WorkItemIdentityValidationService } from "../../../traceability-model/domain/services/work-item-identity-validation-service.ts";
import { context, target } from "../../helpers/test-helpers.ts";

target("WorkItemIdentityValidationService", () => {
  describe("WI identity を検証する", () => {
    context("同じfrontmatter idが_crossとunit配下に存在する場合", () => {
      it("duplicate-id violationを返す", () => {
        // Arrange
        const sut = new WorkItemIdentityValidationService();

        // Act
        const actual = sut.validate([
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
        ]);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].code).toBe("duplicate-id");
        expect(actual[0].workItemId).toBe("WI-200");
      });
    });

    context("parent directory idとfrontmatter idが一致しない場合", () => {
      it("directory-id-mismatch violationを返す", () => {
        // Arrange
        const sut = new WorkItemIdentityValidationService();

        // Act
        const actual = sut.validate([
          {
            filePath: "docs/inception/_cross/WI-201/description.md",
            directoryId: "WI-201",
            frontmatterId: "WI-202",
          },
        ]);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].code).toBe("directory-id-mismatch");
      });
    });
  });
});
