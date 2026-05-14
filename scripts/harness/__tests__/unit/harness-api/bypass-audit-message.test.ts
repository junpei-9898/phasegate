// @unit harness-api
// @layer test
// @story H03-02
// @work-item-id WI-189

import { describe, expect, it, vi } from "vitest";
import type { PreCommitDeps } from "../../../integrations/pre-commit.js";
import { runBypassAudit } from "../../../integrations/pre-commit.js";
import type { ValidateMetadataCommandOutput } from "../../../traceability-model/presentation/cli/validate-metadata-command-handler.js";
import { context, target } from "../../helpers/test-helpers.js";

function buildDeps(): PreCommitDeps {
  return {
    runL2ValidatorsUseCase: {
      execute: vi.fn(async () => []),
    },
    validateMetadataCommandHandler: {
      execute: vi.fn(async (): Promise<ValidateMetadataCommandOutput> => ({
        exitCode: 0,
        results: [],
        text: "metadata ok",
      })),
    },
  };
}

target("runBypassAudit", () => {
  describe("empty range no-op message", () => {
    context("changedFiles が空の場合", () => {
      it("staged files ではなく changed files in range と表示すること", async () => {
        // Arrange
        const deps = buildDeps();

        // Act
        const actual = await runBypassAudit(deps, {
          baseRef: "HEAD",
          headRef: "HEAD",
          changedFiles: [],
          commitMessages: [],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain("Bypass audit (HEAD..HEAD)");
        expect(actual.stdout).toContain("No changed files in range to check");
        expect(actual.stdout).not.toContain("No staged files to check");
      });
    });
  });
});
