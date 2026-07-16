// @unit validator-system
// @layer integration-test
// @work-item-id WI-302
// @story H17-15
// @ac H17-15-1
// @ac H17-15-2
// @ac H17-15-4
// @ac H17-15-6

import { describe, expect, it, vi } from "vitest";
import { AggregateValidationResultsUseCase } from "../../../../validator-system/application/use-cases/aggregate-validation-results-usecase.js";
import { ValidationResultContractMapper } from "../../../../validator-system/application/mappers/validation-result-contract-mapper.js";
import { RunL3ValidatorsUseCase } from "../../../../validator-system/application/use-cases/run-l3-validators-usecase.js";
import { ValidatorExecutionService } from "../../../../validator-system/domain/services/validator-execution-service.js";
import { ValidatorRegistry } from "../../../../validator-system/domain/services/validator-registry.js";
import { ValidationRule } from "../../../../validator-system/domain/value-objects/validation-rule.js";
import { ValidatorDefinition } from "../../../../validator-system/domain/value-objects/validator-definition.js";
import { ValidatorId } from "../../../../validator-system/domain/value-objects/validator-id.js";
import { createLayerConfig } from "../helpers.js";

const fingerprint = (character: string): string => `pgw:v1:violation-fingerprint:sha256:${character.repeat(64)}`;

const createRegistry = (): ValidatorRegistry =>
  new ValidatorRegistry([
    ValidatorDefinition.create({
      validatorId: ValidatorId.create("L3-008"),
      layer: "L3",
      rules: [
        ValidationRule.create({
          ruleName: "L3-008-rule",
          errorTemplate: { code: "L3-008", severity: "error", messageTemplate: "{{message}}" },
          fixExample: null,
        }),
      ],
      enabledCondition: "always",
      externalPolicyRef: "WorldConstraintRederivationPolicyPort",
    }),
  ]);

const createUseCase = (
  validatorIds: readonly string[],
  collect: () => Promise<{
    obligations: readonly {
      ruleId: string;
      violationFingerprint: string;
      constraintId: string | null;
      classification: "adopted-legacy" | "new-structural" | "invalid-declaration" | "waived";
    }[];
    diagnostics: readonly { code: string; path: string; message: string; scope: "constraint" | "other" }[];
  }>,
): RunL3ValidatorsUseCase =>
  new RunL3ValidatorsUseCase({
    validatorRegistry: createRegistry(),
    validatorExecutionService: new ValidatorExecutionService({}),
    validatorConfigPort: {
      getLayerConfig: async () => createLayerConfig("L3", { validatorIds: [...validatorIds], thresholds: {} }),
    },
    contractMapper: new ValidationResultContractMapper(),
    worldConstraintRederivationPolicyPort: { collect },
  });

describe("RunL3ValidatorsUseCase L3-008", () => {
  it("world無効時はL3-008をskipしre-derivation portを呼ばないこと", async () => {
    // Arrange
    const collect = vi.fn().mockResolvedValue({ obligations: [], diagnostics: [] });
    const usecase = createUseCase([], collect);

    // Act
    const actual = await usecase.execute({ targetPaths: [] });

    // Assert
    expect(actual).toEqual([expect.objectContaining({ validatorId: "L3-008", passed: true, skipped: true })]);
    expect(collect).not.toHaveBeenCalled();
  });

  it("base observationはPASSしnew structural mutationはfingerprint付きでFAILすること", async () => {
    // Arrange
    const base = createUseCase(["L3-008"], async () => ({ obligations: [], diagnostics: [] }));
    const mutation = createUseCase(["L3-008"], async () => ({
      obligations: [
        {
          ruleId: "WCR-005",
          violationFingerprint: fingerprint("a"),
          constraintId: null,
          classification: "new-structural",
        },
      ],
      diagnostics: [],
    }));

    // Act
    const actual = {
      base: await base.execute({ targetPaths: [] }),
      mutation: await mutation.execute({ targetPaths: [] }),
    };

    // Assert
    expect(actual.base[0]).toMatchObject({ passed: true, skipped: false, errors: [] });
    expect(actual.mutation[0]).toMatchObject({
      passed: false,
      errors: [
        expect.objectContaining({
          severity: "error",
          ruleId: "WCR-005",
          violationFingerprint: fingerprint("a"),
        }),
      ],
    });
  });

  it("adopted legacyをwarning表示し既定aggregationではnon-blockingにすること", async () => {
    // Arrange
    const usecase = createUseCase(["L3-008"], async () => ({
      obligations: [
        {
          ruleId: "WCR-005",
          violationFingerprint: fingerprint("b"),
          constraintId: null,
          classification: "adopted-legacy",
        },
      ],
      diagnostics: [],
    }));

    // Act
    const actual = await usecase.execute({ targetPaths: [] });
    const aggregated = new AggregateValidationResultsUseCase().execute({ results: actual, failOnWarning: false });

    // Assert
    expect(actual[0]).toMatchObject({
      passed: false,
      errors: [expect.objectContaining({ severity: "warning", classification: "adopted-legacy" })],
    });
    expect(aggregated.overallPassed).toBe(true);
  });
});
