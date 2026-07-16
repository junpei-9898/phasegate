// @unit world-model
// @layer test
// @work-item-id WI-293
// @story H17-07
// @ac H17-07-1
// @ac H17-07-4
// @ac H17-07-6

import { describe, expect, it } from "vitest";
import {
  ConstraintRecord,
  InvalidConstraintRecordError,
} from "../../../../../world-model/domain/entities/constraint-record.js";
import { ArtifactKind } from "../../../../../world-model/domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../../../../world-model/domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../../../../world-model/domain/value-objects/declared-key.js";
import { NodePin } from "../../../../../world-model/domain/value-objects/node-pin.js";
import { PathKey } from "../../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";
import { WcrRuleId } from "../../../../../world-model/domain/value-objects/wcr-rule-id.js";
import { WorldNodeId } from "../../../../../world-model/domain/value-objects/world-node-id.js";

const digest = (value: string): Sha256Digest => Sha256Digest.fromHex(value.repeat(64));
const claimant = NodePin.create({
  nodeId: WorldNodeId.sourceFile(PathKey.create("scripts/harness/a.ts")),
  contentDigest: digest("a"),
});
const premise = NodePin.create({
  nodeId: WorldNodeId.sourceFile(PathKey.create("scripts/harness/b.ts")),
  contentDigest: digest("b"),
});
const declarationArtifactId = WorldNodeId.artifact(
  ArtifactKind.externalDeclaration(),
  CorpusRole.external(),
  PathKey.create("phasegate.world-constraints.json"),
);

describe("ConstraintRecord", () => {
  it("directed factと両endpoint pinとsorted rule IDsと宣言provenanceを保持すること", () => {
    // Arrange
    const ruleIds = [WcrRuleId.create("WCR-008"), WcrRuleId.create("WCR-002")];

    // Act
    const actual = ConstraintRecord.create({
      constraintId: WorldNodeId.constraint(DeclaredKey.create("world.source-contract")),
      schemaVersion: "phasegate-world-constraints/v1",
      factType: "depends-on",
      claimant,
      premise,
      applicableRuleIds: ruleIds,
      declarationArtifactId,
      declarationLocator: "/constraints/0",
    });

    // Assert
    expect(actual.applicableRuleIds.map((ruleId) => ruleId.toString())).toEqual(["WCR-002", "WCR-008"]);
    expect(actual.toCanonicalValue()).toMatchObject({
      constraintId: "pgw:v1:constraint:world.source-contract",
      factType: "depends-on",
      claimant: claimant.toCanonicalValue(),
      premise: premise.toCanonicalValue(),
      declarationArtifactId: declarationArtifactId.toString(),
      declarationLocator: "/constraints/0",
    });
  });

  it("unsupported fact typeと空rule集合とexternal declaration以外のprovenanceを拒否すること", () => {
    // Arrange
    const base = {
      constraintId: WorldNodeId.constraint(DeclaredKey.create("world.source-contract")),
      schemaVersion: "phasegate-world-constraints/v1",
      claimant,
      premise,
      applicableRuleIds: [WcrRuleId.create("WCR-002")],
      declarationArtifactId,
      declarationLocator: "/constraints/0",
    };

    // Act / Assert
    expect(() => ConstraintRecord.create({ ...base, factType: "implies" as "references" })).toThrow(
      InvalidConstraintRecordError,
    );
    expect(() => ConstraintRecord.create({ ...base, factType: "references", applicableRuleIds: [] })).toThrow(
      InvalidConstraintRecordError,
    );
    expect(() =>
      ConstraintRecord.create({
        ...base,
        factType: "references",
        declarationArtifactId: WorldNodeId.sourceFile(PathKey.create("phasegate.world-constraints.json")),
      }),
    ).toThrow(InvalidConstraintRecordError);
  });
});
