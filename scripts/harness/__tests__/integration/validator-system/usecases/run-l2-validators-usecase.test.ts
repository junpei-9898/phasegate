/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 * @work-item-id WI-110 / WI-132 / WI-133 / WI-136 / WI-137 / WI-138 / WI-301
 * @story H17-14
 * @ac H17-14-1
 * @ac H17-14-2
 * @ac H17-14-3
 * @ac H17-14-4
 * @ac H17-14-5
 * @ac H17-14-6
 */
import { describe, expect, it, vi } from "vitest";
import { ValidationResultContractMapper } from "../../../../validator-system/application/mappers/validation-result-contract-mapper.js";
import { AggregateValidationResultsUseCase } from "../../../../validator-system/application/use-cases/aggregate-validation-results-usecase.js";
import { RunL2ValidatorsUseCase } from "../../../../validator-system/application/use-cases/run-l2-validators-usecase.js";
import {
  ValidatorExecutionError,
  ValidatorExecutionService,
} from "../../../../validator-system/domain/services/validator-execution-service.js";
import { InvalidValidatorIdError } from "../../../../validator-system/domain/value-objects/validator-id.js";
import { context, target } from "../../../helpers/test-helpers.js";
import { createFullRegistry, createLayerConfig } from "../helpers.js";

function createL2UseCase(
  layerConfigOverrides?: Partial<{ enabled: boolean; strictOnly: boolean; validatorIds: string[] }>,
) {
  const registry = createFullRegistry();
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const mockValidatorConfigPort = {
    getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2", layerConfigOverrides ?? {})),
  };
  return new RunL2ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: mockValidatorConfigPort,
    contractMapper: mapper,
  });
}

target("RunL2ValidatorsUseCase", () => {
  describe("全L2バリデータの実行", () => {
    context("validatorIdsを省略した場合", () => {
      it("全L2バリデータ（L2-001〜L2-003, L2-013〜L2-017）が実行され8件の結果が返る (IT-UC-RunL2-001)", async () => {
        // Arrange
        const usecase = createL2UseCase();
        const input = { targetPaths: ["src/foo.ts"], unitName: "unit-a", currentPhase: "implementation" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.map((r) => r.validatorId)).toEqual([
          "L2-001",
          "L2-002",
          "L2-003",
          "L2-013",
          "L2-014",
          "L2-015",
          "L2-016",
          "L2-017",
        ]);
      });
    });

    context('validatorIdsに["L2-001"]を指定した場合', () => {
      it("L2-001のみが実行され1件の結果が返る (IT-UC-RunL2-002)", async () => {
        // Arrange
        const usecase = createL2UseCase();
        const input = {
          validatorIds: ["L2-001"],
          targetPaths: ["src/foo.ts"],
          unitName: "unit-a",
          currentPhase: "implementation",
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.map((r) => r.validatorId)).toEqual(["L2-001"]);
      });
    });

    context("LayerConfig.enabled=trueで実行される場合", () => {
      it("全バリデータがpassed=trueで返る (IT-UC-RunL2-003)", async () => {
        // Arrange
        const usecase = createL2UseCase({ enabled: true });
        const input = { targetPaths: ["src/foo.ts"], unitName: "unit-a", currentPhase: "implementation" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.every((r) => r.passed === true)).toBe(true);
      });
    });

    context("LayerConfig.enabled=falseの場合", () => {
      it("全L2結果がskipped=trueかつpassed=trueで返る (IT-UC-RunL2-004)", async () => {
        // Arrange
        const usecase = createL2UseCase({ enabled: false });
        const input = { targetPaths: ["src/foo.ts"], unitName: "unit-a", currentPhase: "implementation" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.every((r) => r.skipped === true)).toBe(true);
        expect(actual.every((r) => r.passed === true)).toBe(true);
        expect(actual.every((r) => r.errors.length === 0)).toBe(true);
      });
    });
  });

  describe("異常系", () => {
    context('無効なvalidatorId（"L2-999"）を指定した場合', () => {
      it("InvalidValidatorIdErrorが送出される (IT-UC-RunL2-005)", async () => {
        // Arrange
        const usecase = createL2UseCase();
        const input = { validatorIds: ["L2-999"], targetPaths: [], unitName: "unit-a", currentPhase: "impl" };

        // Act
        const actual = usecase.execute(input);
        // Assert
        await expect(actual).rejects.toThrow(InvalidValidatorIdError);
      });
    });

    context("ValidatorConfigPortが例外をthrowした場合", () => {
      it("ValidatorExecutionErrorとして伝播する (IT-UC-RunL2-006)", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockRejectedValue(new Error("config read failed")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
        });
        const input = { targetPaths: ["src/foo.ts"], unitName: "unit-a", currentPhase: "implementation" };

        // Act
        const actual = usecase.execute(input);
        // Assert
        await expect(actual).rejects.toThrow(ValidatorExecutionError);
      });
    });

    context("targetPathsが空配列の場合", () => {
      it("実行は続行され全バリデータがpassed=trueで返る (IT-UC-RunL2-007)", async () => {
        // Arrange
        const usecase = createL2UseCase();
        const input = { targetPaths: [], unitName: "unit-a", currentPhase: "impl" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.map((r) => r.validatorId)).toEqual([
          "L2-001",
          "L2-002",
          "L2-003",
          "L2-013",
          "L2-014",
          "L2-015",
          "L2-016",
          "L2-017",
        ]);
        expect(actual.every((r) => r.passed === true)).toBe(true);
      });
    });

    context("CLI E2E coverage portsが注入されている場合", () => {
      it("L2-013が既存E2Eテスト内容を読んでpassを返す", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          cliCommandRegistryPort: { getRegisteredCommands: async () => ["validate", "phasegate:ci-check"] },
          e2eTestFileRegistryPort: {
            getE2eTestFiles: async () => [
              "it('validate works', () => run('validate', '--layer', 'L2'));",
              "it('ci works', () => run('phasegate:ci-check', '--json'));",
            ],
          },
        });
        const input = { targetPaths: [], unitName: "unit-a", currentPhase: "impl" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.find((r) => r.validatorId === "L2-013")).toMatchObject({
          passed: true,
          skipped: false,
        });
      });

      it("L2-013が真に未カバーのコマンドをfailとして返す", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          cliCommandRegistryPort: { getRegisteredCommands: async () => ["phasegate:missing"] },
          e2eTestFileRegistryPort: { getE2eTestFiles: async () => ["run('validate')"] },
        });
        const input = { targetPaths: [], unitName: "unit-a", currentPhase: "impl" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.find((r) => r.validatorId === "L2-013")).toMatchObject({
          passed: false,
          errors: [expect.objectContaining({ message: expect.stringContaining("phasegate:missing") })],
        });
      });

      it("consumer projectでE2E test suiteが存在しない場合はL2-013をpass扱いにする", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          cliCommandRegistryPort: { getRegisteredCommands: async () => ["validate", "phasegate:ci-check"] },
          e2eTestFileRegistryPort: { getE2eTestFiles: async () => [] },
        });
        const input = { targetPaths: [], unitName: "unit-a", currentPhase: "impl" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.find((r) => r.validatorId === "L2-013")).toMatchObject({
          passed: true,
          errors: [],
        });
      });

      it("L2-014がstale WI statusをfailとして返す", async () => {
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          workItemStatusPolicyPort: {
            findStaleReports: async () => [
              {
                id: "WI-140",
                type: "issue",
                descriptionPath: "docs/inception/_cross/WI-140/description.md",
                currentStatus: "drafted",
                derivedStatus: "implemented",
                stale: true,
                reason: "implementation evidence exists",
                nextAction: "status is up to date",
                evidence: {
                  hasRequiredInceptionArtifacts: true,
                  missingInceptionArtifacts: [],
                  reflectedUnits: ["validator-system"],
                  missingReflectionUnits: [],
                  implementationPaths: [
                    "scripts/harness/validator-system/application/use-cases/run-l2-validators-usecase.ts",
                  ],
                  testPaths: [],
                  missingImplementation: false,
                  missingTests: false,
                  validation: { state: "not-run", source: "test", blockingValidation: [] },
                },
              },
            ],
          },
        });

        const actual = await usecase.execute({ targetPaths: [], unitName: "unit-a", currentPhase: "impl" });

        expect(actual.find((r) => r.validatorId === "L2-014")).toMatchObject({
          passed: false,
          errors: [
            expect.objectContaining({
              message: expect.stringContaining("WI-140 status is stale"),
              workItemId: "WI-140",
            }),
          ],
        });
      });

      it("L2-015がcontract traceability findingをfailとして返す", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          contractTraceabilityPolicyPort: {
            collect: async () => ({
              publicContracts: [
                {
                  id: "cli.validate",
                  kind: "cli-command",
                  sourcePath: "docs/guide/cli-reference.md",
                  requiredBehaviors: ["success"],
                },
              ],
              testObservations: [],
              errorContracts: [],
              stateMachines: [],
              traceabilitySlices: [],
            }),
          },
        });

        // Act
        const actual = await usecase.execute({ targetPaths: [], unitName: "unit-a", currentPhase: "impl" });

        // Assert
        expect(actual.find((r) => r.validatorId === "L2-015")).toMatchObject({
          passed: false,
          errors: [expect.objectContaining({ kind: "missing-required-behavior-test" })],
        });
      });

      it("L2-016が attestation 参照なしの bare ✅ を fail-closed で fail として返す (WI-258)", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          coverageAttestationGatingPolicyPort: {
            collect: async () => [
              {
                path: "docs/product/construction/x/coverage_report.md",
                hasLegacyMarker: false,
                claims: [{ lineNumber: 10, hasAttestationRef: false }],
              },
            ],
          },
        });

        // Act
        const actual = await usecase.execute({ targetPaths: [], unitName: "unit-a", currentPhase: "impl" });

        // Assert
        const l2016 = actual.find((r) => r.validatorId === "L2-016");
        expect(l2016?.passed).toBe(false);
        expect(l2016?.errors[0]).toMatchObject({ severity: "error" });
      });

      it("L2-016が ungated-legacy マーカーを warning-only（passed=false・severity=warning）で報告する (WI-258)", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          coverageAttestationGatingPolicyPort: {
            collect: async () => [
              {
                path: "docs/product/construction/legacy/coverage_report.md",
                hasLegacyMarker: true,
                claims: [{ lineNumber: 5, hasAttestationRef: false }],
              },
            ],
          },
        });

        // Act
        const actual = await usecase.execute({ targetPaths: [], unitName: "unit-a", currentPhase: "impl" });

        // Assert
        const l2016 = actual.find((r) => r.validatorId === "L2-016");
        expect(l2016?.errors.every((e) => e.severity === "warning")).toBe(true);
        expect(l2016?.errors.some((e) => e.message.includes("ungated-legacy"))).toBe(true);
      });

      it("L2-016が attestation 参照付きの ✅ のみなら pass を返す (WI-258)", async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")),
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          coverageAttestationGatingPolicyPort: {
            collect: async () => [
              {
                path: "docs/product/construction/x/coverage_report.md",
                hasLegacyMarker: false,
                claims: [{ lineNumber: 10, hasAttestationRef: true }],
              },
            ],
          },
        });

        // Act
        const actual = await usecase.execute({ targetPaths: [], unitName: "unit-a", currentPhase: "impl" });

        // Assert
        const l2016 = actual.find((r) => r.validatorId === "L2-016");
        expect(l2016?.passed).toBe(true);
        expect(l2016?.errors).toHaveLength(0);
      });

      it("world無効時はL2-017をskipしWorld policy portを呼ばないこと", async () => {
        // Arrange
        const collect = vi.fn().mockResolvedValue({ obligations: [], diagnostics: [] });
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: createFullRegistry(),
          validatorExecutionService: new ValidatorExecutionService({}),
          validatorConfigPort: {
            getLayerConfig: vi.fn().mockResolvedValue(
              createLayerConfig("L2", {
                validatorIds: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015", "L2-016"],
              }),
            ),
          },
          contractMapper: new ValidationResultContractMapper(),
          worldConstraintAdmissionPolicyPort: { collect },
        });

        // Act
        const actual = await usecase.execute({ targetPaths: [], unitName: "world-model", currentPhase: "test" });
        // Assert
        expect(actual.find((item) => item.validatorId === "L2-017")).toMatchObject({ passed: true, skipped: true });
        expect(collect).not.toHaveBeenCalled();
      });

      it("new malformed constraint fixtureをL2-017でfail-closedにすること", async () => {
        // Arrange
        const fixture = {
          obligations: [
            {
              ruleId: "WCR-001",
              violationFingerprint: `pgw:v1:violation-fingerprint:sha256:${"a".repeat(64)}`,
              constraintId: "pgw:v1:constraint:world.malformed",
              classification: "invalid-declaration" as const,
            },
          ],
          diagnostics: [],
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: createFullRegistry(),
          validatorExecutionService: new ValidatorExecutionService({}),
          validatorConfigPort: { getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")) },
          contractMapper: new ValidationResultContractMapper(),
          worldConstraintAdmissionPolicyPort: { collect: async () => fixture },
        });

        // Act
        const actual = await usecase.execute({ targetPaths: [], unitName: "world-model", currentPhase: "test" });

        // Assert
        expect(actual.find((item) => item.validatorId === "L2-017")).toMatchObject({
          passed: false,
          skipped: false,
          errors: [
            expect.objectContaining({
              severity: "error",
              ruleId: "WCR-001",
              classification: "invalid-declaration",
            }),
          ],
        });
      });

      it("adopted legacy fixtureをL2-017の非blocking warningとして表示すること", async () => {
        // Arrange
        const fixture = {
          obligations: [
            {
              ruleId: "WCR-005",
              violationFingerprint: `pgw:v1:violation-fingerprint:sha256:${"b".repeat(64)}`,
              constraintId: null,
              classification: "adopted-legacy" as const,
            },
          ],
          diagnostics: [],
        };
        const usecase = new RunL2ValidatorsUseCase({
          validatorRegistry: createFullRegistry(),
          validatorExecutionService: new ValidatorExecutionService({}),
          validatorConfigPort: { getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L2")) },
          contractMapper: new ValidationResultContractMapper(),
          worldConstraintAdmissionPolicyPort: { collect: async () => fixture },
        });

        // Act
        const actual = await usecase.execute({ targetPaths: [], unitName: "world-model", currentPhase: "test" });
        const aggregated = new AggregateValidationResultsUseCase().execute({ results: actual, failOnWarning: false });

        // Assert
        expect(actual.find((item) => item.validatorId === "L2-017")).toMatchObject({
          passed: false,
          errors: [
            expect.objectContaining({ severity: "warning", ruleId: "WCR-005", classification: "adopted-legacy" }),
          ],
        });
        expect(aggregated.overallPassed).toBe(true);
        expect(aggregated.summary.totalWarnings).toBe(1);
      });
    });
  });
});
