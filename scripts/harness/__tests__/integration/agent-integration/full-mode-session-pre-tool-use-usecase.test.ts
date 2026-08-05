// @unit agent-integration
// @layer application
// @story H11-02
// @work-item-id WI-206
// @work-item-id WI-348
// @work-item-id WI-349

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

  it("sessionがactiveなのに不許可の場合はブロックメッセージにsession情報と不許可理由が含まれること", async () => {
    // Arrange
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createConfigQueryPort(),
      phaseGateQueryPort: createPhaseGateQueryPort(false),
      fullModeRequirementQueryPort: createFullModeRequirementQueryPort(),
      fullModeSessionQueryPort: {
        check: vi.fn().mockResolvedValue({
          active: true,
          allowed: false,
          reason: "target unit other-unit does not match session unit some-unit",
          workItemId: "WI-349",
          unit: "other-unit",
          expiresAt: "2026-08-05T13:00:00.000Z",
        }),
      },
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/some-unit/domain/new-entity.ts"],
    });

    // Assert
    const message = actual.error?.message ?? "";
    expect(message).toContain("アクティブな Full Mode session: WI-349 (unit=other-unit");
    expect(message).toContain("target unit other-unit does not match session unit some-unit");
    expect(message).toContain("phasegate session end --work-item WI-349");
  });

  it("full-mode-requiredブロックメッセージに判定対象が今回の書き込み対象パスのみである旨が含まれること", async () => {
    // Arrange
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createConfigQueryPort(),
      phaseGateQueryPort: createPhaseGateQueryPort(false),
      fullModeRequirementQueryPort: createFullModeRequirementQueryPort(),
      fullModeSessionQueryPort: {
        check: vi.fn().mockResolvedValue({ active: false, allowed: false }),
      },
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/some-unit/domain/new-entity.ts"],
    });

    // Assert
    const message = actual.error?.message ?? "";
    expect(message).toContain("判定対象: 今回の書き込み対象パスのみです");
    expect(message).not.toContain("アクティブな Full Mode session");
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
