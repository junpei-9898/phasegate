// @unit validator-system
// @layer test
// @work-item-id WI-302
// @story H17-15
// @ac H17-15-1
// @ac H17-15-2
// @ac H17-15-3
// @ac H17-15-4
// @ac H17-15-5
// @ac H17-15-6

import { describe, expect, it } from "vitest";
import type { WorldConstraintRederivationObservation } from "../../../validator-system/domain/ports/world-constraint-rederivation-policy-port.js";
import { WorldConstraintRederivationService } from "../../../validator-system/domain/services/world-constraint-rederivation-service.js";

const fingerprint = (character: string): string => `pgw:v1:violation-fingerprint:sha256:${character.repeat(64)}`;

const observation = (
  obligations: WorldConstraintRederivationObservation["obligations"],
  diagnostics: WorldConstraintRederivationObservation["diagnostics"] = [],
): WorldConstraintRederivationObservation => ({ obligations, diagnostics });

describe("World constraint authoritative re-derivation policy", () => {
  it("新規structuralとinvalid declarationをrule・fingerprint付きerrorにすること", () => {
    // Arrange
    const service = new WorldConstraintRederivationService();
    const input = observation([
      {
        ruleId: "WCR-008",
        violationFingerprint: fingerprint("b"),
        constraintId: "pgw:v1:constraint:world.pin",
        classification: "new-structural",
      },
      {
        ruleId: "WCR-001",
        violationFingerprint: fingerprint("a"),
        constraintId: "pgw:v1:constraint:world.invalid",
        classification: "invalid-declaration",
      },
    ]);

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual.map((item) => item.ruleId)).toEqual(["WCR-001", "WCR-008"]);
    expect(actual).toEqual([
      expect.objectContaining({
        severity: "error",
        ruleId: "WCR-001",
        violationFingerprint: fingerprint("a"),
        classification: "invalid-declaration",
      }),
      expect.objectContaining({
        severity: "error",
        ruleId: "WCR-008",
        violationFingerprint: fingerprint("b"),
        classification: "new-structural",
      }),
    ]);
    expect(actual[0].message).toContain("authoritative clean-corpus re-derivation");
  });

  it("adopted legacyとactive waiverを可視warningに保つこと", () => {
    // Arrange
    const service = new WorldConstraintRederivationService();
    const input = observation([
      {
        ruleId: "WCR-005",
        violationFingerprint: fingerprint("c"),
        constraintId: null,
        classification: "adopted-legacy",
      },
      {
        ruleId: "WCR-008",
        violationFingerprint: fingerprint("d"),
        constraintId: "pgw:v1:constraint:world.waived",
        classification: "waived",
      },
    ]);

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual).toHaveLength(2);
    expect(actual.every((item) => item.severity === "warning")).toBe(true);
    expect(actual.map((item) => item.classification)).toEqual(["adopted-legacy", "waived"]);
  });

  it("derive diagnosticをauthoritative判定不能としてfail-closed errorにすること", () => {
    // Arrange
    const service = new WorldConstraintRederivationService();
    const input = observation([], [
      {
        code: "unsupported-schema-version",
        path: "phasegate.world-constraints.json",
        message: "unsupported schema",
        scope: "constraint",
      },
      {
        code: "read-failure",
        path: "phasegate.world-baseline.json",
        message: "cannot read baseline",
        scope: "other",
      },
    ]);

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual).toEqual([
      expect.objectContaining({ severity: "error", ruleId: null, classification: "authoritative-evaluation-failed" }),
      expect.objectContaining({ severity: "error", ruleId: "WCR-001", classification: "constraint-input-invalid" }),
    ]);
  });
});
