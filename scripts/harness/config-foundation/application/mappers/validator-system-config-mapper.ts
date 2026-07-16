/**
 * @layer application
 * @unit config-foundation
 * @work-item-id WI-133 / WI-156
 * @work-item-id WI-217
 * @work-item-id WI-212
 * @work-item-id WI-258
 * @work-item-id WI-259
 * @work-item-id WI-268
 */
import type { HarnessConfigV2 } from "../../domain/harness-config.js";

export function toValidatorSystemConfig(resolvedConfig: HarnessConfigV2 | undefined): object | undefined {
  if (!resolvedConfig) return undefined;

  const l3Validators = normalizeValidators(
    resolvedConfig.layers.L3.validators,
    {
      security: "L3-001",
      performance: "L3-002",
      coverage: "L3-003",
      nyquist: "L3-004",
      "ac-bound-coverage": "L3-005",
      "injection-scan": "L3-006",
      "coverage-attestation-verification": "L3-007",
    },
    /^L3-\d{3}$/,
  );
  const l4Validators = normalizeValidators(
    resolvedConfig.layers.L4.validators,
    {
      "drift-detect": "L4-001",
      "drift-detector": "L4-001",
      "consistency-check": "L4-002",
      "consistency-checker": "L4-002",
      "dead-code": "L4-003",
      "dead-code-detector": "L4-003",
      "doc-freshness": "L4-004",
      "doc-freshness-checker": "L4-004",
      "pointer-validation": "L4-005",
      "pointer-validator": "L4-005",
      "skill-catalog-drift": "L4-006",
    },
    /^L4-\d{3}$/,
  );
  const effectiveL4Validators = usesCustomDocumentRoots(resolvedConfig)
    ? includeValidator(l4Validators, "L4-002")
    : l4Validators;

  return {
    project: {
      preset: resolvedConfig.project.preset,
      languages: resolvedConfig.project.languages ?? ["typescript"],
    },
    paths: {
      designDocs: resolvedConfig.paths.designDocs,
      inceptionDocs: resolvedConfig.paths.inceptionDocs,
    },
    layers: {
      // WI-258 / ADR-030 §Decision.3.②: L2-016 (coverage-attestation-gating) を default-ON でリストに含める。
      L2: {
        enabled: resolvedConfig.layers.L2.enabled,
        validators: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015", "L2-016"],
      },
      L3: {
        enabled: resolvedConfig.layers.L3.enabled,
        // WI-259 / ADR-030 §Decision.3.④: L3-006 (injection-scan) は advisory default-ON。
        // WI-268 / ADR-030 §Decision.1・§Decision.3.② 第2段: L3-007 (coverage-attestation-verification)
        // は fail-closed default-ON。いずれも fallback 判定の後に force-include し、normalize 結果でも
        // fallback でも常に含める（L3-007 は fail-closed だが現 corpus は実参照 0 件ゆえ緑）。
        validators: includeValidator(
          includeValidator(
            l3Validators.length > 0 ? l3Validators : ["L3-001", "L3-002", "L3-003", "L3-004"],
            "L3-006",
          ),
          "L3-007",
        ),
        coverageThreshold: resolvedConfig.layers.L3.coverageThreshold,
        requirementMatrixPath: resolvedConfig.layers.L3.requirementMatrixPath,
        // WI-227 / H16-03: L3-005 のスコープ（additive-safe。未設定は []）
        acBoundStories: resolvedConfig.layers.L3.acBoundStories ?? [],
      },
      L4: {
        enabled: resolvedConfig.layers.L4.enabled,
        validators:
          effectiveL4Validators.length > 0
            ? effectiveL4Validators
            : ["L4-001", "L4-002", "L4-003", "L4-004", "L4-005", "L4-006"],
      },
    },
    harnesses: {
      bundleSizeLimit: resolvedConfig.harnesses.bundleSizeLimit,
      deadCodeGC: resolvedConfig.harnesses.deadCodeGC,
    },
    architecture: resolvedConfig.architecture,
    validate: {
      failOnWarning: resolvedConfig.validate.failOnWarning,
    },
  };
}

function usesCustomDocumentRoots(resolvedConfig: HarnessConfigV2): boolean {
  return (
    resolvedConfig.paths.designDocs !== "docs/product/construction" ||
    resolvedConfig.paths.inceptionDocs !== "docs/inception"
  );
}

function includeValidator(validators: readonly string[], validatorId: string): readonly string[] {
  return validators.includes(validatorId) ? validators : [...validators, validatorId];
}

function normalizeValidators(
  validators: readonly string[],
  aliases: Readonly<Record<string, string>>,
  idPattern: RegExp,
): readonly string[] {
  const normalized = validators
    .map((validator) => aliases[validator] ?? validator)
    .filter((validator) => idPattern.test(validator));
  return [...new Set(normalized)];
}
