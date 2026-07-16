// @unit validator-system
// @layer test
// @work-item-id WI-301
// @story H17-14
// @ac H17-14-1
// @ac H17-14-2
// @ac H17-14-3
// @ac H17-14-4
// @ac H17-14-5
// @ac H17-14-6

import { describe, expect, it } from "vitest";
import type { WorldConstraintAdmissionObservation } from "../../../validator-system/domain/ports/world-constraint-admission-policy-port.js";
import { WorldConstraintAdmissionService } from "../../../validator-system/domain/services/world-constraint-admission-service.js";

const fingerprint = (character: string): string => `pgw:v1:violation-fingerprint:sha256:${character.repeat(64)}`;

const observation = (
  obligations: WorldConstraintAdmissionObservation["obligations"],
  diagnostics: WorldConstraintAdmissionObservation["diagnostics"] = [],
): WorldConstraintAdmissionObservation => ({ obligations, diagnostics });

describe("World constraint admission policy", () => {
  it("新規pinの構造違反をfingerprint付きerrorにすること", () => {
    // Arrange
    const service = new WorldConstraintAdmissionService();
    const input = observation([
      {
        ruleId: "WCR-008",
        violationFingerprint: fingerprint("a"),
        constraintId: "pgw:v1:constraint:world.new-pin",
        classification: "new-structural",
      },
    ]);

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual).toEqual([
      expect.objectContaining({
        severity: "error",
        ruleId: "WCR-008",
        violationFingerprint: fingerprint("a"),
        classification: "new-structural",
      }),
    ]);
    expect(actual[0].message).toContain("local fast-path");
    expect(actual[0].suggestion).toContain("authoritative L3");
  });

  it("unpinned claimとmalformed declarationをnon-adoptable errorにすること", () => {
    // Arrange
    const service = new WorldConstraintAdmissionService();
    const input = observation([
      {
        ruleId: "WCR-001",
        violationFingerprint: fingerprint("b"),
        constraintId: "pgw:v1:constraint:world.unpinned",
        classification: "invalid-declaration",
      },
    ]);

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual[0]).toMatchObject({ severity: "error", ruleId: "WCR-001", classification: "invalid-declaration" });
    expect(actual[0].message).toContain("non-adoptable");
  });

  it("adopted legacy fixtureを可視warningに保つこと", () => {
    // Arrange
    const service = new WorldConstraintAdmissionService();
    const input = observation([
      {
        ruleId: "WCR-005",
        violationFingerprint: fingerprint("c"),
        constraintId: null,
        classification: "adopted-legacy",
      },
    ]);

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual[0]).toMatchObject({
      severity: "warning",
      ruleId: "WCR-005",
      violationFingerprint: fingerprint("c"),
      classification: "adopted-legacy",
    });
    expect(actual[0].message).toContain("adopted legacy");
  });

  it("active waiverを非blocking warningとして表示すること", () => {
    // Arrange
    const service = new WorldConstraintAdmissionService();
    const input = observation([
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
    expect(actual[0]).toMatchObject({ severity: "warning", classification: "waived" });
  });

  it("validなnew claimがfindingを持たなければ何もblockしないこと", () => {
    // Arrange
    const service = new WorldConstraintAdmissionService();

    // Act
    const actual = service.evaluate(observation([]));

    // Assert
    expect(actual).toEqual([]);
  });

  it("入力順に依存せずruleとfingerprintの順で返すこと", () => {
    // Arrange
    const service = new WorldConstraintAdmissionService();
    const input = observation([
      {
        ruleId: "WCR-008",
        violationFingerprint: fingerprint("f"),
        constraintId: "pgw:v1:constraint:world.second",
        classification: "new-structural",
      },
      {
        ruleId: "WCR-001",
        violationFingerprint: fingerprint("e"),
        constraintId: "pgw:v1:constraint:world.first",
        classification: "invalid-declaration",
      },
    ]);

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual.map((item) => item.ruleId)).toEqual(["WCR-001", "WCR-008"]);
  });

  it("constraint document diagnosticだけをerrorにし他のlocal failureはwarningにすること", () => {
    // Arrange
    const service = new WorldConstraintAdmissionService();
    const input = observation(
      [],
      [
        {
          code: "unsupported-schema",
          path: "phasegate.world-constraints.json",
          message: "unsupported constraint schema",
          scope: "constraint",
        },
        {
          code: "invalid-policy-input",
          path: "phasegate.world-waivers.json",
          message: "invalid waiver",
          scope: "other",
        },
      ],
    );

    // Act
    const actual = service.evaluate(input);

    // Assert
    expect(actual.map((item) => item.severity)).toEqual(["warning", "error"]);
    expect(actual.find((item) => item.severity === "error")?.message).toContain("constraint declaration input");
  });
});
