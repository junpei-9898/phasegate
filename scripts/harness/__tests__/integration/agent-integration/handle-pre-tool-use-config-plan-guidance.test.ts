// @unit agent-integration
// @layer application
// @story H11-02
// @work-item-id WI-201
// @work-item-id WI-202 / WI-204
// @work-item-id WI-354
// @work-item-id WI-376
// @work-item-id WI-390

import { describe, expect, it, vi } from "vitest";
import { HandlePreToolUseUseCase } from "../../../agent-integration/application/usecases/handle-pre-tool-use-usecase.js";
import { PhaseGateQueryResult } from "../../../agent-integration/domain/value-objects/phase-gate-query-result.js";

function createDefaultMockConfigQueryPort() {
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

function createDefaultMockPhaseGateQueryPort() {
  return {
    checkGate: vi.fn().mockResolvedValue(PhaseGateQueryResult.create(true, [], [])),
    checkDesignDocsExist: vi.fn().mockResolvedValue(false),
  };
}

function createProtectedConfigQueryPort() {
  return {
    ...createDefaultMockConfigQueryPort(),
    getProtectedFilePatterns: vi.fn(async () => ["phasegate.config.json"]),
  };
}

describe("HandlePreToolUseUseCase config-plan guidance", () => {
  it("phasegate.config.json の保護ファイルブロックは config plan の復旧手順を返すこと", async () => {
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createProtectedConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
    });
    const input = {
      toolName: "Edit",
      targetFilePaths: ["phasegate.config.json"],
      targetChanges: undefined,
    };

    const actual = await useCase.execute(input);

    expect(actual).toMatchObject({
      shouldBlock: true,
      blockedFilePath: "phasegate.config.json",
      blockReason: "PROTECTED_FILE",
    });
    expect(actual.error?.message).toContain("config:plan --intent quick-mode-relax --dry-run --json");
    expect(actual.error?.message).toContain("config:plan --intent quick-mode-relax --apply --json");
  });

  // WI-363
  it(".husky 配下の保護ファイルブロックは L0 runtime 実施点であることと setup:agent 手順を案内すること", async () => {
    // Arrange
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createDefaultMockConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Edit",
      targetFilePaths: [".husky/pre-commit"],
    });

    // Assert
    expect(actual).toMatchObject({
      shouldBlock: true,
      blockedFilePath: ".husky/pre-commit",
      blockReason: "PROTECTED_FILE",
    });
    expect(actual.error?.message).toContain("L0 runtime");
    expect(actual.error?.message).toContain("setup:agent --apply --with-husky");
    expect(actual.error?.message).not.toContain("protectedFiles.exclude");
    expect(actual.error?.message).toContain("人間");
  });

  it("phasegate.config.json は full-mode 判定より先に trust root として保護し config plan を案内すること", async () => {
    const mockFullModeRequirementQueryPort = {
      check: vi.fn().mockResolvedValue({
        requiresFullMode: true,
        rejectionRule: "MIXED_CHANGES" as const,
        rejectionReason: "allowedCategories外のファイルが含まれています: phasegate.config.json",
        dominantCategory: "config",
      }),
    };
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createDefaultMockConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
      fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
    });
    const input = {
      toolName: "Edit",
      targetFilePaths: ["phasegate.config.json"],
      targetChanges: undefined,
    };

    const actual = await useCase.execute(input);

    expect(actual).toMatchObject({
      shouldBlock: true,
      blockedFilePath: "phasegate.config.json",
      blockReason: "PROTECTED_FILE",
    });
    expect(actual.error?.message).toContain("config:plan --intent quick-mode-relax --dry-run --json");
    expect(actual.error?.message).toContain("config:plan --intent quick-mode-relax --apply --json");
    expect(actual.error?.message).not.toContain("/story-implementor");
  });

  // WI-354 / WI-376（ADR-039: guidance の入力は dominantCategory のみ）
  it.each([
    ["bugfix"],
    ["docs"],
    ["test"],
    ["config"],
  ])("quick スコープの category '%s' のブロックは quick-mode-relax guidance を返すこと", async (dominantCategory) => {
    // Arrange
    const mockFullModeRequirementQueryPort = {
      check: vi.fn().mockResolvedValue({
        requiresFullMode: true,
        rejectionRule: "MIXED_CHANGES" as const,
        rejectionReason: "allowedCategories外のファイルが含まれています: .gitignore",
        dominantCategory,
      }),
    };
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createDefaultMockConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
      fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: [".gitignore"],
    });

    // Assert
    expect(actual).toMatchObject({
      shouldBlock: true,
      blockReason: "FULL_MODE_REQUIRED",
      fullModeDominantCategory: dominantCategory,
    });
    expect(actual.error?.message).toContain("Quick Mode の許可カテゴリを確認してください");
    expect(actual.error?.message).toContain("config:plan --intent quick-mode-relax --dry-run --json");
    expect(actual.error?.message).toContain("npx phasegate check-change-category --paths .gitignore");
    expect(actual.error?.message).not.toContain("/story-implementor");
  });

  // WI-354 / WI-376（ADR-039: guidance の入力は dominantCategory のみ）
  it.each([
    ["feature"],
    ["domain"],
    ["api"],
  ])("quick スコープ外の category '%s' のブロックは従来どおり story-implementor を案内すること", async (dominantCategory) => {
    // Arrange
    const mockFullModeRequirementQueryPort = {
      check: vi.fn().mockResolvedValue({
        requiresFullMode: true,
        rejectionRule: "MIXED_CHANGES" as const,
        rejectionReason: "allowedCategories外のファイルが含まれています: scripts/harness/x/services/new.ts",
        dominantCategory,
      }),
    };
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createDefaultMockConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
      fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/x/services/new.ts"],
    });

    // Assert
    expect(actual).toMatchObject({
      shouldBlock: true,
      blockReason: "FULL_MODE_REQUIRED",
      fullModeDominantCategory: dominantCategory,
    });
    expect(actual.error?.message).toContain("/story-implementor");
    expect(actual.error?.message).not.toContain("Quick Mode の許可カテゴリを確認してください");
  });

  // WI-354 / WI-376（ADR-039: カテゴリ未確定時に skill 名で分岐が変わる余地を無くす）
  it("dominantCategory 不明の場合は常に story-implementor を案内すること", async () => {
    // Arrange
    const mockFullModeRequirementQueryPort = {
      check: vi.fn().mockResolvedValue({
        requiresFullMode: true,
        rejectionRule: "NEW_DOMAIN" as const,
        rejectionReason: "domain 新規ファイル",
      }),
    };
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createDefaultMockConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
      fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
    });

    // Act
    const actual = await useCase.execute({
      toolName: "Write",
      targetFilePaths: ["scripts/harness/x/domain/new-vo.ts"],
    });

    // Assert
    expect(actual.blockReason).toBe("FULL_MODE_REQUIRED");
    expect(actual.error?.message).toContain("/story-implementor");
    expect(actual.error?.message).not.toContain("カテゴリ: undefined");
  });
});
