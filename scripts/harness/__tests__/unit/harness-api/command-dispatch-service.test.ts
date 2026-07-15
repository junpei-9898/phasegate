// @layer test
// @unit harness-api
// @story H09-02
// @work-item-id WI-114, WI-186
import { describe, expect, it, vi } from "vitest";
import type { ArtifactScannerPort } from "../../../harness-api/domain/ports/artifact-scanner-port.js";
import type { BiomeLintPort } from "../../../harness-api/domain/ports/biome-lint-port.js";
import type { ImpactAnalysisPort } from "../../../harness-api/domain/ports/impact-analysis-port.js";
import type { PhaseGateQueryPort } from "../../../harness-api/domain/ports/phase-gate-query-port.js";
import type { ValidatorExecutionPort } from "../../../harness-api/domain/ports/validator-execution-port.js";
import { CommandDispatchService } from "../../../harness-api/domain/services/command-dispatch-service.js";
import { ArtifactScanResult } from "../../../harness-api/domain/value-objects/artifact-scan-result.js";
import { context, target } from "../../helpers/test-helpers.js";

interface MockPortOptions {
  readonly allStories?: readonly { storyId: string; passed: boolean }[];
  readonly unitResult?: {
    unitId: string;
    currentLevel: number;
    currentPhase: string;
    completedGates: readonly string[];
  } | null;
  readonly allValidatorResults?: readonly {
    validatorId: string;
    passed: boolean;
    skipped?: boolean;
    errors: readonly unknown[];
  }[];
  readonly allValidatorError?: Error;
  readonly driftItems?: readonly { direction: string; unit: string; element: string; recommendation: string }[];
  readonly lintResult?: { passed: boolean; errors: readonly unknown[]; warnings: readonly unknown[] };
  readonly artifactScanResult?: ArtifactScanResult;
  readonly presetInfo?: { name: string; enabledLayers: readonly string[] };
  readonly impactResult?: { storyId: string; affectedTestCases: readonly unknown[]; affectedFiles: readonly unknown[] };
}

function createMockPorts(options: MockPortOptions = {}) {
  const ports = {
    validatorExecutionPort: {
      runL3Validators: vi.fn(),
      runAllValidators: vi.fn(),
      runDriftDetection: vi.fn(),
    } satisfies ValidatorExecutionPort,
    phaseGateQueryPort: {
      queryAllStories: vi.fn(),
      queryUnit: vi.fn(),
    } satisfies PhaseGateQueryPort,
    biomeLintPort: {
      runLint: vi.fn(),
    } satisfies BiomeLintPort,
    impactAnalysisPort: {
      analyze: vi.fn(),
    } satisfies ImpactAnalysisPort,
    artifactScannerPort: {
      scan: vi.fn(),
    } satisfies ArtifactScannerPort,
    configQueryPort: {
      getPresetInfo: vi.fn(),
      getConfigSummary: vi.fn(),
    },
  };

  if (options.allStories !== undefined) {
    ports.phaseGateQueryPort.queryAllStories.mockResolvedValue(options.allStories);
  }
  if (options.unitResult !== undefined) {
    ports.phaseGateQueryPort.queryUnit.mockResolvedValue(options.unitResult);
  }
  if (options.allValidatorError !== undefined) {
    ports.validatorExecutionPort.runAllValidators.mockRejectedValue(options.allValidatorError);
  } else if (options.allValidatorResults !== undefined) {
    ports.validatorExecutionPort.runAllValidators.mockResolvedValue(options.allValidatorResults);
  }
  if (options.driftItems !== undefined) {
    ports.validatorExecutionPort.runDriftDetection.mockResolvedValue(options.driftItems);
  }
  if (options.lintResult !== undefined) {
    ports.biomeLintPort.runLint.mockResolvedValue(options.lintResult);
  }
  if (options.artifactScanResult !== undefined) {
    ports.artifactScannerPort.scan.mockResolvedValue(options.artifactScanResult);
  }
  if (options.presetInfo !== undefined) {
    ports.configQueryPort.getPresetInfo.mockResolvedValue(options.presetInfo);
  }
  if (options.impactResult !== undefined) {
    ports.impactAnalysisPort.analyze.mockResolvedValue(options.impactResult);
  }

  return ports;
}

target("CommandDispatchService", () => {
  describe("dispatch: check-ready", () => {
    // UT-DS-001
    it("phasegate:check-readyが全ストーリー通過のpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({ allStories: [{ storyId: "H09-01", passed: true }] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:check-ready", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("pass");
      expect(actual.exitCode).toBe(0);
    });

    // UT-DS-002
    it("phasegate:check-readyが未通過ストーリーありのfail responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({ allStories: [{ storyId: "H09-01", passed: false }] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:check-ready", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("fail");
      expect(actual.exitCode).toBe(1);
    });
  });

  describe("dispatch: check-phase", () => {
    // UT-DS-003
    it("phasegate:check-phaseが存在するUnitのpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        unitResult: { unitId: "harness-error", currentLevel: 2, currentPhase: "construction", completedGates: [] },
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({
        commandName: "phasegate:check-phase",
        args: { unit: "harness-error" },
        flags: {},
      });
      // Assert
      expect(actual.status).toBe("pass");
    });

    // UT-DS-004
    it("phasegate:check-phaseが存在しないUnitのfail responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({ unitResult: null });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({
        commandName: "phasegate:check-phase",
        args: { unit: "non-existent" },
        flags: {},
      });
      // Assert
      expect(actual.status).toBe("fail");
    });
  });

  describe("dispatch: ci-check", () => {
    // UT-DS-005
    it("phasegate:ci-checkが全バリデータ通過のpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        allValidatorResults: [
          { validatorId: "L2-001", passed: true, errors: [] },
          { validatorId: "L3-001", passed: true, errors: [] },
          { validatorId: "L4-001", passed: false, skipped: true, errors: [] },
        ],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:ci-check", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("pass");
      expect(actual.data).toMatchObject({
        validatorResults: [
          { validatorId: "L2-001" },
          { validatorId: "L3-001" },
          { validatorId: "L4-001", skipped: true },
        ],
      });
    });

    // UT-DS-005b (WI-260 / ADR-017): warning-only failure は exit 0 / pass
    it("phasegate:ci-checkがwarning-only failureで exit 0 のpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        allValidatorResults: [
          { validatorId: "L2-001", passed: true, errors: [] },
          {
            validatorId: "L2-016",
            passed: false,
            errors: [{ code: "L2-016", severity: "warning", message: "ungated-legacy coverage_report" }],
          },
        ],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:ci-check", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("pass");
      expect(actual.exitCode).toBe(0);
      expect(actual.data).toMatchObject({ allPassed: true });
    });

    // UT-DS-005c (WI-260 / ADR-017): error severity を含む failure は従来どおり exit 1 / fail
    it("phasegate:ci-checkがerror severityを含むfailureで exit 1 のfail responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        allValidatorResults: [
          { validatorId: "L2-001", passed: true, errors: [] },
          {
            validatorId: "L2-002",
            passed: false,
            errors: [{ code: "L2-002", severity: "error", message: "metadata violation" }],
          },
        ],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:ci-check", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("fail");
      expect(actual.exitCode).toBe(1);
    });
  });

  describe("dispatch: detect-drift", () => {
    // UT-DS-006
    it("phasegate:detect-driftが乖離なしのpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({ driftItems: [] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:detect-drift", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("pass");
    });

    it("phasegate:detect-driftが乖離ありでもadvisory pass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        driftItems: [
          {
            direction: "code→design",
            unit: "validator-system",
            element: "RunFullValidationUseCase",
            recommendation: "Review design docs",
          },
        ],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:detect-drift", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("pass");
      expect(actual.exitCode).toBe(0);
      expect(actual.errors).toEqual([]);
      expect(actual.summary).toMatchObject({ warnings: 1 });
      expect(actual.data).toMatchObject({
        categorySummaries: [
          {
            category: "code-missing-design",
            severity: "warning",
            count: 1,
          },
        ],
        actionPlan: [
          {
            category: "code-missing-design",
            nextAction: "Update the matching product/construction docs with the implementation contract.",
          },
        ],
      });
    });
  });

  describe("dispatch: lint", () => {
    // UT-DS-007
    it("phasegate:lintがpass結果のpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({ lintResult: { passed: true, errors: [], warnings: [] } });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:lint", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("pass");
    });
  });

  describe("dispatch: status", () => {
    // UT-DS-008
    it("phasegate:statusが有効 layer の live fail を top-level fail response に反映すること", async () => {
      // Arrange
      const ports = createMockPorts({
        artifactScanResult: ArtifactScanResult.create({ scannedPaths: [], foundArtifacts: [], derivedLayerHealth: [] }),
        presetInfo: { name: "standard", enabledLayers: ["L1", "L2", "L3"] },
        lintResult: { passed: false, errors: [], warnings: [] },
        allValidatorResults: [
          { validatorId: "L2-001", passed: true, errors: [] },
          { validatorId: "L3-001", passed: true, errors: [] },
          { validatorId: "L4-001", passed: false, skipped: true, errors: [] },
        ],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:status", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("fail");
      expect(actual.exitCode).toBe(0);
      expect(actual.errors).toEqual([
        {
          code: "HARNESS_ERROR",
          severity: "error",
          message: "Layer L1 live validation fail",
        },
      ]);
      expect(actual.data).toMatchObject({
        layers: [
          { layerId: "L1", lastResult: "fail", configurationState: "enabled", liveValidationState: "fail" },
          { layerId: "L2", lastResult: "pass", configurationState: "enabled", liveValidationState: "pass" },
          { layerId: "L3", lastResult: "pass", configurationState: "enabled", liveValidationState: "pass" },
          { layerId: "L4", enabled: false, configurationState: "disabled", liveValidationState: "skipped" },
        ],
      });
    });

    it("phasegate:statusが全 enabled layer pass の場合は pass response を返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        artifactScanResult: ArtifactScanResult.create({ scannedPaths: [], foundArtifacts: [], derivedLayerHealth: [] }),
        presetInfo: { name: "standard", enabledLayers: ["L1", "L2", "L3"] },
        lintResult: { passed: true, errors: [], warnings: [] },
        allValidatorResults: [
          { validatorId: "L2-001", passed: true, errors: [] },
          { validatorId: "L3-001", passed: true, errors: [] },
          { validatorId: "L4-001", passed: false, skipped: true, errors: [] },
        ],
      });
      const svc = new CommandDispatchService(ports);

      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:status", args: {}, flags: {} });

      // Assert
      expect(actual.status).toBe("pass");
      expect(actual.exitCode).toBe(0);
      expect(actual.errors).toEqual([]);
    });
  });

  describe("dispatch: impact-analysis", () => {
    // UT-DS-009
    it("phasegate:impact-analysisが結果ありのpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        impactResult: { storyId: "H09-01", affectedTestCases: [], affectedFiles: [] },
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({
        commandName: "phasegate:impact-analysis",
        args: { storyId: "H09-01" },
        flags: {},
      });
      // Assert
      expect(actual.status).toBe("pass");
    });
  });

  describe("dispatch: 未登録コマンド", () => {
    // UT-DS-010
    it("未知コマンドでerror responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts();
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:unknown", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("error");
      expect(actual.exitCode).toBe(2);
    });
  });

  describe("dispatch: ポートエラー", () => {
    // UT-DS-011
    it("ポートが例外をスローした場合にerror responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({ allValidatorError: new Error("port error") });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:ci-check", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("error");
      expect(actual.exitCode).toBe(2);
    });
  });

  describe("dispatch: complete-check", () => {
    // UT-DS-012
    it("phasegate:complete-checkが全バリデータ+lint通過のpass responseを返すこと", async () => {
      // Arrange
      const ports = createMockPorts({
        allValidatorResults: [{ validatorId: "L3-001", passed: true, errors: [] }],
        lintResult: { passed: true, errors: [], warnings: [] },
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: "phasegate:complete-check", args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe("pass");
    });
  });
});
