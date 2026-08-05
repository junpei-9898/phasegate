// @unit agent-integration
// @layer application
// @story H11-02
// @work-item-id WI-206
// @work-item-id WI-348

import { describe, expect, it, vi } from "vitest";
import { HandlePreToolUseUseCase } from "../../../agent-integration/application/usecases/handle-pre-tool-use-usecase.js";
import { PhaseGateQueryResult } from "../../../agent-integration/domain/value-objects/phase-gate-query-result.js";

function createConfigQueryPort() {
  return {
    isHookEnabled: vi.fn(),
    getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
    getRelaxedGates: vi.fn().mockResolvedValue([]),
    getProjectPaths: vi.fn().mockReturnValue({
      getSource: () => ["scripts/harness"],
      getDocsInception: () => "docs/inception",
      getDocsConstruction: () => "docs/product/construction",
    }),
    getBaselineConfig: vi.fn().mockResolvedValue({
      enabled: false,
      path: ".phasegate/baseline.json",
    }),
    getStopHookEnforce: vi.fn().mockResolvedValue(false),
  };
}

function createPhaseGateQueryPort(designDocsExist: boolean) {
  return {
    checkGate: vi.fn().mockResolvedValue(PhaseGateQueryResult.create(true, [], [])),
    checkDesignDocsExist: vi.fn().mockResolvedValue(designDocsExist),
  };
}

function createFullModeRequirementQueryPort(dominantCategory = "domain") {
  return {
    check: vi.fn().mockResolvedValue({
      requiresFullMode: true,
      rejectionRule: "MIXED_CHANGES" as const,
      rejectionReason: "allowedCategories外のファイルが含まれています",
      dominantCategory,
    }),
  };
}

describe("Full Mode session PreToolUse integration", () => {
  it("対象Unitとカテゴリに一致するsessionがある場合はfull-mode-required変更を許可する", async () => {
    // Arrange
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createConfigQueryPort(),
      phaseGateQueryPort: createPhaseGateQueryPort(false),
      fullModeRequirementQueryPort: createFullModeRequirementQueryPort(),
      fullModeSessionQueryPort: {
        check: vi.fn().mockResolvedValue({
          active: true,
          allowed: true,
          workItemId: "WI-206",
          unit: "some-unit",
          expiresAt: "2026-05-20T01:00:00.000Z",
        }),
      },
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/some-unit/domain/new-entity.ts"],
    });

    // Assert
    expect(actual).toEqual({
      shouldBlock: false,
      fullModeSessionAllowed: {
        workItemId: "WI-206",
        unit: "some-unit",
        expiresAt: "2026-05-20T01:00:00.000Z",
      },
    });
  });

  it("sessionが対象外の場合は設計文書bypassがなければFULL_MODE_REQUIREDで拒否する", async () => {
    // Arrange
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createConfigQueryPort(),
      phaseGateQueryPort: createPhaseGateQueryPort(false),
      fullModeRequirementQueryPort: createFullModeRequirementQueryPort(),
      fullModeSessionQueryPort: {
        check: vi.fn().mockResolvedValue({
          active: true,
          allowed: false,
          reason: "session expired",
        }),
      },
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/some-unit/domain/new-entity.ts"],
    });

    // Assert
    expect(actual.blockReason).toBe("FULL_MODE_REQUIRED");
    expect(actual.fullModeRejectionRule).toBe("MIXED_CHANGES");
    expect(actual.fullModeDominantCategory).toBe("domain");
    expect(actual.error?.message).toEqual(
      expect.stringContaining("phasegate session begin --mode full --unit some-unit"),
    );
  });

  it("dominantCategory=featureのfull-mode-required変更もsessionが許可すれば通過すること", async () => {
    // Arrange
    const sessionCheck = vi.fn().mockResolvedValue({
      active: true,
      allowed: true,
      workItemId: "WI-348",
      unit: "some-unit",
      expiresAt: "2026-08-05T13:00:00.000Z",
    });
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createConfigQueryPort(),
      phaseGateQueryPort: createPhaseGateQueryPort(false),
      fullModeRequirementQueryPort: createFullModeRequirementQueryPort("feature"),
      fullModeSessionQueryPort: { check: sessionCheck },
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/some-unit/application/new-usecase.ts"],
    });

    // Assert
    expect(actual.shouldBlock).toBe(false);
    expect(actual.fullModeSessionAllowed?.workItemId).toBe("WI-348");
    expect(sessionCheck).toHaveBeenCalledWith(expect.objectContaining({ dominantCategory: "feature" }));
  });

  it("dominantCategory=apiのfull-mode-required変更もsessionが許可すれば通過すること", async () => {
    // Arrange
    const sessionCheck = vi.fn().mockResolvedValue({
      active: true,
      allowed: true,
      workItemId: "WI-348",
      unit: "some-unit",
      expiresAt: "2026-08-05T13:00:00.000Z",
    });
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createConfigQueryPort(),
      phaseGateQueryPort: createPhaseGateQueryPort(false),
      fullModeRequirementQueryPort: createFullModeRequirementQueryPort("api"),
      fullModeSessionQueryPort: { check: sessionCheck },
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/some-unit/infrastructure/adapters/some-adapter.ts"],
    });

    // Assert
    expect(actual.shouldBlock).toBe(false);
    expect(actual.fullModeSessionAllowed?.workItemId).toBe("WI-348");
    expect(sessionCheck).toHaveBeenCalledWith(expect.objectContaining({ dominantCategory: "api" }));
  });
});
