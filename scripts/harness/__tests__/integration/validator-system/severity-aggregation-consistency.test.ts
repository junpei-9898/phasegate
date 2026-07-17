// @layer test
// @unit validator-system
// @work-item-id WI-332

/**
 * WI-332 横断 regression: 実効 severity 判定が「validate 集約」「ci-check / complete-check
 * (CiCheckResult)」「pre-commit 集約」の 3 経路で常に一致することを保証する。
 *
 * 背景: github#38 では complete-check だけが独自集約を持ち warning-only failure で exit 1
 * になった。本テストは同一の validator 結果セットを 3 経路すべてに通し、実効判定
 * （effectively passed / exit 0 相当か）の一致を assert する。将来どれかの経路が
 * 共有実装 (validator-system/domain/services/effective-severity-policy.ts) を外れて
 * 独自判定に戻った場合、このテストが落ちる。
 */
import { expect, it } from "vitest";
import { CiCheckResult, type ValidatorCheckItem } from "../../../harness-api/domain/value-objects/ci-check-result.js";
import { runPreCommit } from "../../../integrations/pre-commit.js";
import type { ValidationResultContract } from "../../../validator-system/application/dto/validation-result-contract.js";
import { AggregateValidationResultsUseCase } from "../../../validator-system/application/use-cases/aggregate-validation-results-usecase.js";
import { target } from "../../helpers/test-helpers.js";

function contract(
  validatorId: string,
  passed: boolean,
  errors: readonly { code: string; severity: string; message: string; suggestion: string }[] = [],
  skipped?: boolean,
): ValidationResultContract {
  return { validatorId, passed, errors, durationMs: 1, skipped };
}

/** 同一結果セットを harness-api 側の入力型 (ValidatorCheckItem) に射影する。 */
function toCheckItems(results: readonly ValidationResultContract[]): readonly ValidatorCheckItem[] {
  return results.map((r) => ({
    validatorId: r.validatorId,
    passed: r.passed,
    skipped: r.skipped,
    errors: r.errors.map((e) => ({ code: e.code, severity: e.severity, message: e.message })),
  }));
}

/** 経路1: `phasegate validate` の集約 (AggregateValidationResultsUseCase)。 */
function effectiveByValidate(results: readonly ValidationResultContract[]): boolean {
  return new AggregateValidationResultsUseCase().execute({ results }).overallPassed;
}

/** 経路2: ci-check / complete-check が共有する CiCheckResult.fromResults (WI-318)。 */
function effectiveByCiCheck(results: readonly ValidationResultContract[]): boolean {
  return CiCheckResult.fromResults(toCheckItems(results)).allPassed;
}

/** 経路3: pre-commit 集約 (buildReport 経由の exit code)。 */
async function effectiveByPreCommit(results: readonly ValidationResultContract[]): Promise<boolean> {
  const actual = await runPreCommit(["scripts/harness/foo.ts"], {
    runL2ValidatorsUseCase: { execute: async () => results },
    validateMetadataCommandHandler: {
      execute: async () => ({ exitCode: 0 as const, results: [], text: "[PASS]" }),
    },
  });
  return actual.exitCode === 0;
}

interface Scenario {
  readonly name: string;
  readonly results: readonly ValidationResultContract[];
  readonly expectedEffectivelyPassed: boolean;
}

const scenarios: readonly Scenario[] = [
  {
    name: "全 pass",
    results: [contract("L2-001", true), contract("L2-002", true)],
    expectedEffectivelyPassed: true,
  },
  {
    name: "warning-only failure",
    results: [
      contract("L2-001", true),
      contract("L2-016", false, [{ code: "L2-016", severity: "warning", message: "w", suggestion: "s" }]),
    ],
    expectedEffectivelyPassed: true,
  },
  {
    name: "error failure",
    results: [
      contract("L2-001", true),
      contract("L2-002", false, [{ code: "L2-002", severity: "error", message: "e", suggestion: "s" }]),
    ],
    expectedEffectivelyPassed: false,
  },
  {
    name: "mixed (warning + error) failure",
    results: [
      contract("L2-003", false, [
        { code: "L2-003", severity: "warning", message: "w", suggestion: "s" },
        { code: "L2-003", severity: "error", message: "e", suggestion: "s" },
      ]),
    ],
    expectedEffectivelyPassed: false,
  },
  {
    name: "errors=[] の防御的 failure",
    results: [contract("L2-001", false, [])],
    expectedEffectivelyPassed: false,
  },
  {
    name: "skipped + pass",
    results: [contract("L3-002", true, [], true), contract("L2-001", true)],
    expectedEffectivelyPassed: true,
  },
];

target("severity 集約の 3 経路一致 (WI-332)", () => {
  for (const scenario of scenarios) {
    it(`同一 validator 結果セット「${scenario.name}」で validate 集約・CiCheckResult・pre-commit 集約の実効判定が一致すること`, async () => {
      // Arrange
      const { results, expectedEffectivelyPassed } = scenario;
      // Act
      const actual = {
        validate: effectiveByValidate(results),
        ciCheck: effectiveByCiCheck(results),
        preCommit: await effectiveByPreCommit(results),
      };
      // Assert — 3 経路すべてが ADR-017 の期待実効判定に一致する（= 経路間も常に一致）
      expect(actual).toEqual({
        validate: expectedEffectivelyPassed,
        ciCheck: expectedEffectivelyPassed,
        preCommit: expectedEffectivelyPassed,
      });
    });
  }

  // pre-commit 経路は failOnWarning を config 配線していない（既定 false 固定）ため、
  // failOnWarning=true の一致検証は validate / CiCheckResult の 2 経路で行う。
  it("failOnWarning=true 指定時も validate 集約と CiCheckResult の実効判定が warning-only failure で一致すること", () => {
    // Arrange
    const results = [
      contract("L4-001", false, [{ code: "L4-001", severity: "warning", message: "drift", suggestion: "sync" }]),
    ];
    // Act
    const actual = {
      validate: new AggregateValidationResultsUseCase().execute({ results, failOnWarning: true }).overallPassed,
      ciCheck: CiCheckResult.fromResults(toCheckItems(results), true).allPassed,
    };
    // Assert
    expect(actual).toEqual({ validate: false, ciCheck: false });
  });
});
