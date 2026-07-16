// @unit world-model
// @layer test
// @work-item-id WI-294
// @story H17-08
// @ac H17-08-2
// @ac H17-08-3
// @ac H17-08-5

import { describe, expect, it } from "vitest";
import { ArtifactKind } from "../../../../world-model/domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../../../world-model/domain/value-objects/corpus-role.js";
import { PathKey } from "../../../../world-model/domain/value-objects/path-key.js";
import { WorldNodeId } from "../../../../world-model/domain/value-objects/world-node-id.js";
import {
  InvalidControlDeclarationError,
  mapAdoptionBaselineDocument,
  mapConstraintDeclarationDocument,
  mapSemanticDebtDocument,
  mapWaiverDocument,
} from "../../../../world-model/infrastructure/adapters/world-control-declaration-mapper.js";

const digest = (character: string): string => `sha256:${character.repeat(64)}`;
const fingerprint = (character: string): string => `pgw:v1:violation-fingerprint:${digest(character)}`;
const declarationArtifactId = WorldNodeId.artifact(
  ArtifactKind.externalDeclaration(),
  CorpusRole.external(),
  PathKey.create("phasegate.world-constraints.json"),
);
const constraint = (constraintId = "pgw:v1:constraint:world.source-contract") => ({
  constraintId,
  factType: "references",
  claimant: {
    nodeId: "pgw:v1:source-file:scripts/harness/a.ts",
    contentDigest: digest("a"),
  },
  premise: {
    nodeId: "pgw:v1:source-file:scripts/harness/b.ts",
    contentDigest: digest("b"),
  },
  applicableRuleIds: ["WCR-008", "WCR-006", "WCR-002"],
});

describe("World control declaration mapper", () => {
  it("valid constraintをsorted domain recordと明示relationへ変換すること", () => {
    // Arrange
    const document = {
      schemaVersion: "phasegate-world-constraints/v1",
      constraints: [constraint()],
      aliases: [],
    };

    // Act
    const actual = mapConstraintDeclarationDocument(document, declarationArtifactId);

    // Assert
    expect(actual.records).toHaveLength(1);
    expect(actual.records[0].applicableRuleIds.map((ruleId) => ruleId.toString())).toEqual([
      "WCR-002",
      "WCR-006",
      "WCR-008",
    ]);
    expect(actual.relations.map((relation) => relation.toCanonicalValue())).toEqual([
      expect.objectContaining({
        constraintId: "pgw:v1:constraint:world.source-contract",
        factType: "references",
        source: "constraint-declaration",
      }),
    ]);
    expect(actual.malformedDeclarations).toEqual([]);
  });

  it("supported envelope内のmalformed recordを部分recordにせずWCR-001入力へ変換すること", () => {
    // Arrange
    const document = {
      schemaVersion: "phasegate-world-constraints/v1",
      constraints: [{ ...constraint(), premise: { nodeId: "not-an-id", contentDigest: digest("b") } }],
      aliases: [],
    };

    // Act
    const actual = mapConstraintDeclarationDocument(document, declarationArtifactId);

    // Assert
    expect(actual.records).toEqual([]);
    expect(actual.malformedDeclarations).toHaveLength(1);
    expect(actual.malformedDeclarations[0].declarationLocator).toBe("/constraints/0");
    expect(actual.malformedDeclarations[0].reasons.join(" ")).toContain("premise.nodeId");
  });

  it("duplicate constraint IDとalias sourceの全candidateをno-winnerにすること", () => {
    // Arrange
    const document = {
      schemaVersion: "phasegate-world-constraints/v1",
      constraints: [constraint(), constraint()],
      aliases: [
        { from: "pgw:v1:source-file:old.ts", to: "pgw:v1:source-file:new-a.ts" },
        { from: "pgw:v1:source-file:old.ts", to: "pgw:v1:source-file:new-b.ts" },
      ],
    };

    // Act
    const actual = mapConstraintDeclarationDocument(document, declarationArtifactId);

    // Assert
    expect(actual.records).toEqual([]);
    expect(actual.malformedDeclarations).toHaveLength(2);
    expect(actual.aliases).toEqual([]);
    expect(actual.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "duplicate-alias-source",
      "duplicate-constraint-id",
    ]);
  });

  it("baselineのprovenanceを検証してentryをfingerprint順に正規化すること", () => {
    // Arrange
    const document = {
      schemaVersion: "phasegate-world-adoption-baseline/v1",
      rulesetVersion: "phasegate-world-wcr/v1",
      sourceEvaluationId: `pgw:v1:evaluation:${digest("e")}`,
      sourceCorpusRoot: digest("c"),
      sourceConstraintRoot: digest("d"),
      adoptedByWorkItemId: "WI-294",
      adoptionReason: "Reviewed legacy structural obligations.",
      entries: [
        { violationFingerprint: fingerprint("b"), ruleId: "WCR-008", constraintId: null },
        {
          violationFingerprint: fingerprint("a"),
          ruleId: "WCR-006",
          constraintId: "pgw:v1:constraint:world.source-contract",
        },
      ],
    };

    // Act
    const actual = mapAdoptionBaselineDocument(document);

    // Assert
    expect(actual.entries.map((entry) => entry.violationFingerprint.toString())).toEqual([
      fingerprint("a"),
      fingerprint("b"),
    ]);
    expect(actual.toCanonicalValue()).toMatchObject({ adoptedByWorkItemId: "WI-294" });
  });

  it("duplicate baseline fingerprintを拒否して任意entryを採用しないこと", () => {
    // Arrange
    const entry = { violationFingerprint: fingerprint("a"), ruleId: "WCR-006", constraintId: null };
    const document = {
      schemaVersion: "phasegate-world-adoption-baseline/v1",
      rulesetVersion: "phasegate-world-wcr/v1",
      sourceEvaluationId: `pgw:v1:evaluation:${digest("e")}`,
      sourceCorpusRoot: digest("c"),
      sourceConstraintRoot: digest("d"),
      adoptedByWorkItemId: "WI-294",
      adoptionReason: "Reviewed legacy structural obligations.",
      entries: [entry, entry],
    };

    // Act / Assert
    expect(() => mapAdoptionBaselineDocument(document)).toThrow(InvalidControlDeclarationError);
  });

  it("waiverをID順に正規化しduplicate IDまたはfingerprintを拒否すること", () => {
    // Arrange
    const first = {
      waiverId: "pgw:v1:waiver:world.alpha",
      violationFingerprint: fingerprint("a"),
      reason: "Temporary reviewed exception with a follow-up action.",
      expiresOn: "2026-08-01",
      workItemId: "WI-294",
      renewalOf: null,
    };
    const second = {
      waiverId: "pgw:v1:waiver:world.beta",
      violationFingerprint: fingerprint("b"),
      reason: "Temporary reviewed exception with a follow-up action.",
      expiresOn: "2026-09-01",
      workItemId: "WI-294",
      renewalOf: "pgw:v1:waiver:world.previous",
    };

    // Act
    const actual = mapWaiverDocument({
      schemaVersion: "phasegate-world-waivers/v1",
      waivers: [second, first],
    });

    // Assert
    expect(actual.map((waiver) => waiver.waiverId)).toEqual(["pgw:v1:waiver:world.alpha", "pgw:v1:waiver:world.beta"]);
    expect(() =>
      mapWaiverDocument({
        schemaVersion: "phasegate-world-waivers/v1",
        waivers: [first, { ...second, waiverId: first.waiverId }],
      }),
    ).toThrow(InvalidControlDeclarationError);
    expect(() =>
      mapWaiverDocument({
        schemaVersion: "phasegate-world-waivers/v1",
        waivers: [first, { ...second, violationFingerprint: first.violationFingerprint }],
      }),
    ).toThrow(InvalidControlDeclarationError);
  });

  it("waiverのcalendar dateとWI traceabilityとrenewal IDをfail-closedで検証すること", () => {
    // Arrange
    const base = {
      waiverId: "pgw:v1:waiver:world.alpha",
      violationFingerprint: fingerprint("a"),
      reason: "Temporary reviewed exception with a follow-up action.",
      expiresOn: "2026-08-01",
      workItemId: "WI-294",
      renewalOf: null,
    };

    // Act / Assert
    expect(() =>
      mapWaiverDocument({
        schemaVersion: "phasegate-world-waivers/v1",
        waivers: [{ ...base, expiresOn: "2026-02-30" }],
      }),
    ).toThrow(InvalidControlDeclarationError);
    expect(() =>
      mapWaiverDocument({
        schemaVersion: "phasegate-world-waivers/v1",
        waivers: [{ ...base, workItemId: "H17-08" }],
      }),
    ).toThrow(InvalidControlDeclarationError);
    expect(() =>
      mapWaiverDocument({
        schemaVersion: "phasegate-world-waivers/v1",
        waivers: [{ ...base, renewalOf: "world.previous" }],
      }),
    ).toThrow(InvalidControlDeclarationError);
  });

  it("semantic debtをID順かつreference順に正規化してstructural obligationと分離すること", () => {
    // Arrange
    const document = {
      schemaVersion: "phasegate-world-debts/v1",
      debts: [
        {
          debtId: "pgw:v1:semantic-debt:world.coverage-gap",
          kind: "semantic",
          title: "Known semantic coverage gap",
          reason: "The semantic behavior needs a reviewed follow-up.",
          ownerUnit: "world-model",
          introducedByWorkItemId: "WI-294",
          references: ["pgw:v1:work-item:WI-294", "pgw:v1:source-file:scripts/harness/world-model/domain/model.ts"],
        },
      ],
    };

    // Act
    const actual = mapSemanticDebtDocument(document);

    // Assert
    expect(actual[0].toCanonicalValue()).toEqual({
      debtId: "pgw:v1:semantic-debt:world.coverage-gap",
      introducedByWorkItemId: "WI-294",
      kind: "semantic",
      ownerUnit: "world-model",
      reason: "The semantic behavior needs a reviewed follow-up.",
      references: ["pgw:v1:source-file:scripts/harness/world-model/domain/model.ts", "pgw:v1:work-item:WI-294"],
      schemaVersion: "phasegate-world-debts/v1",
      title: "Known semantic coverage gap",
    });
  });

  it("semantic debtのduplicate IDとnon-semantic kindを拒否すること", () => {
    // Arrange
    const debt = {
      debtId: "pgw:v1:semantic-debt:world.known-gap",
      kind: "semantic",
      title: "Known semantic gap",
      reason: "The semantic behavior needs a reviewed follow-up.",
      ownerUnit: "world-model",
      introducedByWorkItemId: "WI-294",
      references: ["pgw:v1:work-item:WI-294"],
    };

    // Act / Assert
    expect(() => mapSemanticDebtDocument({ schemaVersion: "phasegate-world-debts/v1", debts: [debt, debt] })).toThrow(
      InvalidControlDeclarationError,
    );
    expect(() =>
      mapSemanticDebtDocument({
        schemaVersion: "phasegate-world-debts/v1",
        debts: [{ ...debt, kind: "structural" }],
      }),
    ).toThrow(InvalidControlDeclarationError);
  });
});
