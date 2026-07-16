/**
 * @layer test
 * @unit validator-system
 * @story WI-268
 */
import { describe, expect, it, vi } from "vitest";
import { ValidationResultContractMapper } from "../../../../validator-system/application/mappers/validation-result-contract-mapper.js";
import { RunL3ValidatorsUseCase } from "../../../../validator-system/application/use-cases/run-l3-validators-usecase.js";
import type { CoverageAttestationVerificationCollectResult } from "../../../../validator-system/domain/ports/coverage-attestation-verification-policy-port.js";
import { ValidatorExecutionService } from "../../../../validator-system/domain/services/validator-execution-service.js";
import { ValidatorRegistry } from "../../../../validator-system/domain/services/validator-registry.js";
import { ValidationRule } from "../../../../validator-system/domain/value-objects/validation-rule.js";
import { ValidatorDefinition } from "../../../../validator-system/domain/value-objects/validator-definition.js";
import { ValidatorId } from "../../../../validator-system/domain/value-objects/validator-id.js";
import { context, target } from "../../../helpers/test-helpers.js";
import { createLayerConfig } from "../helpers.js";

function createRegistryWithL3007(): ValidatorRegistry {
  const def = (id: string, layer: "L3") =>
    ValidatorDefinition.create({
      validatorId: ValidatorId.create(id),
      layer,
      rules: [
        ValidationRule.create({
          ruleName: `${id}-rule`,
          errorTemplate: { code: id, severity: "error", messageTemplate: "{{message}}" },
          fixExample: null,
        }),
      ],
      enabledCondition: "always",
      externalPolicyRef: null,
    });
  return new ValidatorRegistry([def("L3-001", "L3"), def("L3-007", "L3")]);
}

function createUseCase(collectResult: CoverageAttestationVerificationCollectResult) {
  const registry = createRegistryWithL3007();
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const mockValidatorConfigPort = {
    getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L3", { validatorIds: ["L3-001", "L3-007"] })),
  };
  return new RunL3ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: mockValidatorConfigPort,
    contractMapper: mapper,
    coverageAttestationVerificationPolicyPort: {
      collect: vi.fn().mockResolvedValue(collectResult),
    },
  });
}

target("RunL3ValidatorsUseCase — L3-007 coverage-attestation-verification（WI-268）", () => {
  context("attestation 参照が解決可能スコープに含まれる場合", () => {
    it("L3-007 が PASS になること", async () => {
      // Arrange
      const usecase = createUseCase({
        references: [{ id: "H05-02", sourcePath: "docs/product/construction/x/coverage_report.md", lineNumber: 10 }],
        evidence: { resolvableScopeIds: new Set(["H05-02"]) },
        matrixError: null,
      });

      // Act
      const results = await usecase.execute({ targetPaths: [] });

      // Assert
      const l3007 = results.find((r) => r.validatorId === "L3-007");
      expect(l3007?.passed).toBe(true);
      expect(l3007?.errors).toHaveLength(0);
    });
  });

  context("解決不能な attestation 参照がある場合", () => {
    it("L3-007 が fail-closed の error で FAIL になること", async () => {
      // Arrange
      const usecase = createUseCase({
        references: [{ id: "GHOST-99", sourcePath: "docs/product/construction/x/coverage_report.md", lineNumber: 20 }],
        evidence: { resolvableScopeIds: new Set(["H05-02"]) },
        matrixError: null,
      });

      // Act
      const results = await usecase.execute({ targetPaths: [] });

      // Assert
      const l3007 = results.find((r) => r.validatorId === "L3-007");
      expect(l3007?.passed).toBe(false);
      expect(l3007?.errors.length).toBeGreaterThan(0);
      expect(l3007?.errors.every((e) => e.severity === "error")).toBe(true);
      expect(l3007?.errors[0]?.message ?? "").toContain("GHOST-99");
    });
  });

  context("参照ありで matrix を読めなかった場合", () => {
    it("L3-007 が matrixError を error として FAIL になること（fail-closed）", async () => {
      // Arrange
      const usecase = createUseCase({
        references: [{ id: "H05-02", sourcePath: "docs/product/construction/x/coverage_report.md", lineNumber: 10 }],
        evidence: { resolvableScopeIds: new Set<string>() },
        matrixError: "requirement-test-matrix を読み込めません（L3-007 は fail-closed）",
      });

      // Act
      const results = await usecase.execute({ targetPaths: [] });

      // Assert
      const l3007 = results.find((r) => r.validatorId === "L3-007");
      expect(l3007?.passed).toBe(false);
      expect(l3007?.errors[0]?.severity).toBe("error");
      expect(l3007?.errors[0]?.message ?? "").toContain("fail-closed");
    });
  });

  context("attestation 参照が 1 件も無い場合", () => {
    it("L3-007 が PASS になること（検査対象なし）", async () => {
      // Arrange
      const usecase = createUseCase({
        references: [],
        evidence: { resolvableScopeIds: new Set<string>() },
        matrixError: null,
      });

      // Act
      const results = await usecase.execute({ targetPaths: [] });

      // Assert
      const l3007 = results.find((r) => r.validatorId === "L3-007");
      expect(l3007?.passed).toBe(true);
      expect(l3007?.errors).toHaveLength(0);
    });
  });
});
