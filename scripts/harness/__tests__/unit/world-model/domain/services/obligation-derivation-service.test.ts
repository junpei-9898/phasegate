// @unit world-model
// @layer test
// @work-item-id WI-295
// @story H17-09
// @ac H17-09-1
// @ac H17-09-2
// @ac H17-09-3
// @ac H17-09-4
// @ac H17-09-5
// @ac H17-09-6

import { describe, expect, it } from "vitest";
import {
  AdoptionBaseline,
  AdoptionBaselineEntry,
  SemanticDebtDeclaration,
  WorldWaiver,
} from "../../../../../world-model/domain/entities/control-declarations.js";
import type { WorldHashingPort } from "../../../../../world-model/domain/ports/world-hashing-port.js";
import { CanonicalJsonSerializer } from "../../../../../world-model/domain/services/canonical-json-serializer.js";
import type {
  ConstraintFindingDto,
  EndpointResolutionDto,
} from "../../../../../world-model/domain/services/constraint-evaluator.js";
import { ObligationDerivationService } from "../../../../../world-model/domain/services/obligation-derivation-service.js";
import { PolicyInputsDigestDeriver } from "../../../../../world-model/domain/services/policy-inputs-digest-deriver.js";
import { ViolationFingerprintDeriver } from "../../../../../world-model/domain/services/violation-fingerprint-deriver.js";
import { EvaluationId } from "../../../../../world-model/domain/value-objects/evaluation-id.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";
import { ViolationFingerprint } from "../../../../../world-model/domain/value-objects/violation-fingerprint.js";
import { WcrRuleId } from "../../../../../world-model/domain/value-objects/wcr-rule-id.js";
import { WorldNodeId } from "../../../../../world-model/domain/value-objects/world-node-id.js";

class DeterministicHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    let value = 0x811c9dc5;
    for (const byte of bytes) {
      value ^= byte;
      value = Math.imul(value, 0x01000193);
    }
    const chunk = (value >>> 0).toString(16).padStart(8, "0");
    return Sha256Digest.create(`sha256:${chunk.repeat(8)}`);
  }
}

const digest = (character: string): string => `sha256:${character.repeat(64)}`;
const serializer = new CanonicalJsonSerializer();
const hashing = new DeterministicHashingPort();
const fingerprintDeriver = new ViolationFingerprintDeriver(serializer, hashing);
const policyDeriver = new PolicyInputsDigestDeriver(serializer, hashing);
const service = new ObligationDerivationService(fingerprintDeriver);

const endpoint = (
  role: "claimant" | "premise",
  nodeId: string,
  pinned: string,
  current: string | null,
  overrides: Partial<EndpointResolutionDto> = {},
): EndpointResolutionDto => ({
  role,
  declaredNodeId: nodeId,
  pinnedDigest: pinned,
  status: current === null ? "missing" : "resolved",
  resolvedNodeId: current === null ? null : nodeId,
  currentDigest: current,
  candidateCount: current === null ? 0 : 1,
  candidateContentDigests: current === null ? [] : [current],
  locators: ["ignored/location.ts:10"],
  sourceDiagnosticCodes: [],
  ...overrides,
});

const finding = (ruleId = "WCR-008", overrides: Partial<ConstraintFindingDto> = {}): ConstraintFindingDto => {
  const claimant = endpoint("claimant", "pgw:v1:source-file:scripts/harness/a.ts", digest("a"), digest("b"));
  const premise = endpoint("premise", "pgw:v1:source-file:scripts/harness/b.ts", digest("c"), digest("c"));
  return {
    ruleId,
    constraintId: "pgw:v1:constraint:world.digest-pin",
    factType: "content-equals",
    endpoint: "claimant",
    claimant,
    premise,
    declarationArtifactId: "pgw:v1:artifact:external-declaration:external:phasegate.world-constraints.json",
    declarationLocator: "/constraints/0",
    evidence: { expectedDigest: digest("a"), observedDigest: digest("b") },
    ...overrides,
  };
};

const evaluationId = EvaluationId.parse(`pgw:v1:evaluation:${digest("e")}`);
const policyDigest = Sha256Digest.create(digest("9"));

const baselineFor = (
  entries: readonly { fingerprint: string; ruleId?: string; constraintId?: string | null }[],
  rulesetVersion = "phasegate-world-wcr/v1",
): AdoptionBaseline =>
  AdoptionBaseline.create({
    schemaVersion: "phasegate-world-adoption-baseline/v1",
    rulesetVersion,
    sourceEvaluationId: evaluationId,
    sourceCorpusRoot: Sha256Digest.create(digest("c")),
    sourceConstraintRoot: Sha256Digest.create(digest("d")),
    adoptedByWorkItemId: "WI-295",
    adoptionReason: "Reviewed legacy structural obligations.",
    entries: entries.map((entry) =>
      AdoptionBaselineEntry.create({
        violationFingerprint: ViolationFingerprint.create(entry.fingerprint),
        ruleId: WcrRuleId.create(entry.ruleId ?? "WCR-008"),
        constraintId:
          entry.constraintId === null
            ? null
            : WorldNodeId.parse(entry.constraintId ?? "pgw:v1:constraint:world.digest-pin"),
      }),
    ),
  });

const waiverFor = (fingerprint: string, expiresOn = "2026-08-01"): WorldWaiver =>
  WorldWaiver.create({
    schemaVersion: "phasegate-world-waivers/v1",
    waiverId: "pgw:v1:waiver:world.temporary-gap",
    violationFingerprint: ViolationFingerprint.create(fingerprint),
    reason: "Temporary reviewed exception with a follow-up action.",
    expiresOn,
    workItemId: "WI-295",
    renewalOf: null,
  });

describe("ViolationFingerprintDeriver", () => {
  it("ADR-035の10 field preimageから決定的fingerprintを導出すること", () => {
    // Arrange
    const input = finding();

    // Act
    const actual = fingerprintDeriver.derive(input, "phasegate-world-wcr/v1");

    // Assert
    expect(Object.keys(actual.preimage).sort()).toEqual([
      "claimantPin",
      "constraintId",
      "expected",
      "factType",
      "observed",
      "premisePin",
      "ruleId",
      "rulesetVersion",
      "schemaVersion",
      "subject",
    ]);
    expect(actual.fingerprint.toString()).toMatch(/^pgw:v1:violation-fingerprint:sha256:[0-9a-f]{64}$/);
    expect(actual.preimage.subject).toEqual({
      endpointRole: "claimant",
      nodeIds: ["pgw:v1:source-file:scripts/harness/a.ts"],
    });
  });

  it("locatorとhuman reasonだけが変わってもfingerprintを変えないこと", () => {
    // Arrange
    const base = finding();
    const moved = finding("WCR-008", {
      declarationLocator: "/constraints/99",
      declarationArtifactId: "pgw:v1:artifact:external-declaration:external:other.json",
    });

    // Act
    const actualBase = fingerprintDeriver.derive(base, "phasegate-world-wcr/v1");
    const actualMoved = fingerprintDeriver.derive(moved, "phasegate-world-wcr/v1");

    // Assert
    expect(actualMoved.fingerprint.equals(actualBase.fingerprint)).toBe(true);
    expect(actualMoved.canonicalBytes).toEqual(actualBase.canonicalBytes);
  });

  it("observed digestとduplicate candidate multisetの変化をnew fingerprintにすること", () => {
    // Arrange
    const digestChanged = finding("WCR-008", {
      evidence: { expectedDigest: digest("a"), observedDigest: digest("d") },
      claimant: endpoint("claimant", "pgw:v1:source-file:scripts/harness/a.ts", digest("a"), digest("d")),
    });
    const duplicate = finding("WCR-005", {
      claimant: endpoint("claimant", "pgw:v1:source-file:scripts/harness/a.ts", digest("a"), null, {
        status: "duplicate",
        candidateCount: 2,
        candidateContentDigests: [digest("b"), digest("c")],
      }),
      evidence: { candidateCount: 2, resolution: "exact" },
    });
    if (duplicate.claimant === null) throw new Error("expected claimant endpoint");
    const duplicateChanged = finding("WCR-005", {
      claimant: {
        ...duplicate.claimant,
        candidateContentDigests: [digest("b"), digest("d")],
      },
      evidence: { candidateCount: 2, resolution: "exact" },
    });

    // Act
    const actualBase = fingerprintDeriver.derive(finding(), "phasegate-world-wcr/v1");
    const actualDigest = fingerprintDeriver.derive(digestChanged, "phasegate-world-wcr/v1");
    const actualDuplicate = fingerprintDeriver.derive(duplicate, "phasegate-world-wcr/v1");
    const actualDuplicateChanged = fingerprintDeriver.derive(duplicateChanged, "phasegate-world-wcr/v1");

    // Assert
    expect(actualDigest.fingerprint.equals(actualBase.fingerprint)).toBe(false);
    expect(actualDuplicateChanged.fingerprint.equals(actualDuplicate.fingerprint)).toBe(false);
  });
});

describe("PolicyInputsDigestDeriver", () => {
  it("waiverが0件なら指定dateをnullへ正規化して同じdigestにすること", () => {
    // Arrange
    const input = { baseline: null, waivers: [], semanticDebts: [] };

    // Act
    const actualNull = policyDeriver.derive({ ...input, policyAsOfDate: null });
    const actualSpecified = policyDeriver.derive({ ...input, policyAsOfDate: "2026-07-17" });

    // Assert
    expect(actualSpecified.digest.equals(actualNull.digest)).toBe(true);
    expect(actualSpecified.preimage.policyAsOfDate).toBeNull();
  });

  it("waiverがあればvalid dateを要求してdate変更をdigestへ反映すること", () => {
    // Arrange
    const target = fingerprintDeriver.derive(finding(), "phasegate-world-wcr/v1").fingerprint.toString();
    const waiver = waiverFor(target);

    // Act
    const actualFirst = policyDeriver.derive({
      baseline: null,
      waivers: [waiver],
      semanticDebts: [],
      policyAsOfDate: "2026-07-17",
    });
    const actualSecond = policyDeriver.derive({
      baseline: null,
      waivers: [waiver],
      semanticDebts: [],
      policyAsOfDate: "2026-07-18",
    });

    // Assert
    expect(actualSecond.digest.equals(actualFirst.digest)).toBe(false);
    expect(() =>
      policyDeriver.derive({ baseline: null, waivers: [waiver], semanticDebts: [], policyAsOfDate: null }),
    ).toThrow();
  });
});

describe("ObligationDerivationService", () => {
  it("baselineとcurrentの集合差からadopted・new・repaidを毎回導出すること", () => {
    // Arrange
    const currentFinding = finding();
    const currentFingerprint = fingerprintDeriver
      .derive(currentFinding, "phasegate-world-wcr/v1")
      .fingerprint.toString();
    const repaidFingerprint = `pgw:v1:violation-fingerprint:${digest("f")}`;
    const baseline = baselineFor([
      { fingerprint: currentFingerprint },
      { fingerprint: repaidFingerprint, constraintId: null },
    ]);
    const newFinding = finding("WCR-002", {
      endpoint: "premise",
      premise: endpoint("premise", "pgw:v1:source-file:scripts/harness/missing.ts", digest("f"), null),
      evidence: { baselineCandidateCount: 0 },
    });

    // Act
    const actual = service.derive({
      evaluationId,
      rulesetVersion: "phasegate-world-wcr/v1",
      policyInputsDigest: policyDigest,
      findings: [newFinding, currentFinding],
      baseline,
      waivers: [],
      semanticDebts: [],
      policyAsOfDate: null,
    });

    // Assert
    expect(actual.structuralObligations.map((item) => item.classification)).toEqual([
      "new-structural",
      "adopted-legacy",
    ]);
    expect(actual.repaidBaselineEntries).toEqual([
      expect.objectContaining({
        violationFingerprint: repaidFingerprint,
        classification: "repaid",
        disposition: "cleanup-required",
      }),
    ]);
  });

  it("active exact waiverだけをwaivedにしexclusive expiry当日は元分類へ戻すこと", () => {
    // Arrange
    const currentFinding = finding();
    const target = fingerprintDeriver.derive(currentFinding, "phasegate-world-wcr/v1").fingerprint.toString();
    const waiver = waiverFor(target, "2026-07-18");

    // Act
    const active = service.derive({
      evaluationId,
      rulesetVersion: "phasegate-world-wcr/v1",
      policyInputsDigest: policyDigest,
      findings: [currentFinding],
      baseline: null,
      waivers: [waiver],
      semanticDebts: [],
      policyAsOfDate: "2026-07-17",
    });
    const expired = service.derive({
      evaluationId,
      rulesetVersion: "phasegate-world-wcr/v1",
      policyInputsDigest: policyDigest,
      findings: [currentFinding],
      baseline: null,
      waivers: [waiver],
      semanticDebts: [],
      policyAsOfDate: "2026-07-18",
    });

    // Assert
    expect(active.structuralObligations[0]).toMatchObject({
      classification: "waived",
      waiver: { waiverId: waiver.waiverId, workItemId: "WI-295" },
    });
    expect(expired.structuralObligations[0].classification).toBe("new-structural");
    expect(expired.policyDiagnostics).toEqual([
      expect.objectContaining({ code: "expired-waiver", subjectId: waiver.waiverId }),
    ]);
  });

  it("WCR-001をbaselineやwaiverで免除せずinvalid-declarationにすること", () => {
    // Arrange
    const malformed = finding("WCR-001", {
      constraintId: null,
      factType: null,
      endpoint: null,
      claimant: null,
      premise: null,
      evidence: { declaredConstraintId: "invalid", reasons: ["ignored human reason"] },
    });
    const target = fingerprintDeriver.derive(malformed, "phasegate-world-wcr/v1").fingerprint.toString();

    // Act
    const actual = service.derive({
      evaluationId,
      rulesetVersion: "phasegate-world-wcr/v1",
      policyInputsDigest: policyDigest,
      findings: [malformed],
      baseline: null,
      waivers: [waiverFor(target)],
      semanticDebts: [],
      policyAsOfDate: "2026-07-17",
    });

    // Assert
    expect(actual.structuralObligations[0].classification).toBe("invalid-declaration");
    expect(actual.structuralObligations[0].waiver).toBeNull();
  });

  it("rulesetVersion不一致baselineを暗黙移行せずdiagnosticにすること", () => {
    // Arrange
    const currentFinding = finding();
    const target = fingerprintDeriver.derive(currentFinding, "phasegate-world-wcr/v1").fingerprint.toString();
    const baseline = baselineFor([{ fingerprint: target }], "phasegate-world-wcr/v0");

    // Act
    const actual = service.derive({
      evaluationId,
      rulesetVersion: "phasegate-world-wcr/v1",
      policyInputsDigest: policyDigest,
      findings: [currentFinding],
      baseline,
      waivers: [],
      semanticDebts: [],
      policyAsOfDate: null,
    });

    // Assert
    expect(actual.structuralObligations[0].classification).toBe("new-structural");
    expect(actual.repaidBaselineEntries).toEqual([]);
    expect(actual.policyDiagnostics).toEqual([expect.objectContaining({ code: "baseline-ruleset-mismatch" })]);
  });

  it("semantic debtをstructural obligationと別collectionに保持すること", () => {
    // Arrange
    const debt = SemanticDebtDeclaration.create({
      schemaVersion: "phasegate-world-debts/v1",
      debtId: "pgw:v1:semantic-debt:world.known-gap",
      kind: "semantic",
      title: "Known semantic gap",
      reason: "Reviewed semantic limitation.",
      ownerUnit: "world-model",
      introducedByWorkItemId: "WI-295",
      references: [WorldNodeId.workItem("WI-295")],
    });

    // Act
    const actual = service.derive({
      evaluationId,
      rulesetVersion: "phasegate-world-wcr/v1",
      policyInputsDigest: policyDigest,
      findings: [finding()],
      baseline: null,
      waivers: [],
      semanticDebts: [debt],
      policyAsOfDate: null,
    });

    // Assert
    expect(actual.structuralObligations).toHaveLength(1);
    expect(actual.declaredSemanticDebts).toEqual([debt.toCanonicalValue()]);
  });
});
