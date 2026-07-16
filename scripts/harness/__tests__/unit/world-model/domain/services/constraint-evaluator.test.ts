// @unit world-model
// @layer test
// @work-item-id WI-293
// @story H17-07
// @ac H17-07-1
// @ac H17-07-2
// @ac H17-07-3
// @ac H17-07-4
// @ac H17-07-5
// @ac H17-07-6

import { describe, expect, it } from "vitest";
import {
  ConstraintRecord,
  MalformedConstraintDeclaration,
} from "../../../../../world-model/domain/entities/constraint-record.js";
import { ExtractionDiagnostic } from "../../../../../world-model/domain/entities/extraction-diagnostic.js";
import { Snapshot } from "../../../../../world-model/domain/entities/snapshot.js";
import { WorldNode } from "../../../../../world-model/domain/entities/world-node.js";
import { CanonicalJsonSerializer } from "../../../../../world-model/domain/services/canonical-json-serializer.js";
import { ConstraintEvaluator } from "../../../../../world-model/domain/services/constraint-evaluator.js";
import { ArtifactKind } from "../../../../../world-model/domain/value-objects/artifact-kind.js";
import { ChangeProvenance } from "../../../../../world-model/domain/value-objects/change-provenance.js";
import { CorpusRole } from "../../../../../world-model/domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../../../../world-model/domain/value-objects/declared-key.js";
import { ExplicitConstraintRelation } from "../../../../../world-model/domain/value-objects/explicit-constraint-relation.js";
import { ExplicitNodeAlias } from "../../../../../world-model/domain/value-objects/explicit-node-alias.js";
import { NodePin } from "../../../../../world-model/domain/value-objects/node-pin.js";
import { PathKey } from "../../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";
import { WcrRuleId } from "../../../../../world-model/domain/value-objects/wcr-rule-id.js";
import { WorldNodeId } from "../../../../../world-model/domain/value-objects/world-node-id.js";

const digest = (value: string): Sha256Digest => Sha256Digest.fromHex(value.repeat(64));
const sourceNode = (path: string, value: string): WorldNode =>
  WorldNode.sourceFile({ path: PathKey.create(path), digest: digest(value) });
const snapshot = (
  nodes: readonly WorldNode[],
  root: string,
  extractionDiagnostics: readonly ExtractionDiagnostic[] = [],
): Snapshot =>
  Snapshot.create({
    schemaVersion: "phasegate-world-snapshot/v1",
    extractorVersion: "phasegate-world-extractor/v2",
    corpusConfigDigest: digest("c"),
    nodes,
    edges: [],
    extractionDiagnostics,
    corpusRoot: digest(root),
    canonicalBytes: new TextEncoder().encode(root),
  });
const declarationArtifactId = WorldNodeId.artifact(
  ArtifactKind.externalDeclaration(),
  CorpusRole.external(),
  PathKey.create("phasegate.world-constraints.json"),
);
const allRules = WcrRuleId.all();

const record = (
  factType: "references" | "depends-on" | "refines" | "content-equals",
  claimant: WorldNode,
  premise: WorldNode,
): ConstraintRecord =>
  ConstraintRecord.create({
    constraintId: WorldNodeId.constraint(DeclaredKey.create(`world.${factType.replace("-", "_")}`)),
    schemaVersion: "phasegate-world-constraints/v1",
    factType,
    claimant: NodePin.create({ nodeId: claimant.id, contentDigest: claimant.contentDigest }),
    premise: NodePin.create({ nodeId: premise.id, contentDigest: premise.contentDigest }),
    applicableRuleIds: allRules,
    declarationArtifactId,
    declarationLocator: "/constraints/0",
  });

const input = (
  currentSnapshot: Snapshot,
  records: readonly ConstraintRecord[],
  options: {
    baselineSnapshot?: Snapshot;
    malformedDeclarations?: readonly MalformedConstraintDeclaration[];
    aliases?: readonly ExplicitNodeAlias[];
    relations?: readonly ExplicitConstraintRelation[];
  } = {},
) => ({
  currentSnapshot,
  baselineSnapshot: options.baselineSnapshot,
  records,
  malformedDeclarations: options.malformedDeclarations ?? [],
  aliases: options.aliases ?? [],
  relations: options.relations ?? [],
  changeProvenance: ChangeProvenance.between(options.baselineSnapshot ?? null, currentSnapshot),
});

describe("ConstraintEvaluator", () => {
  it("malformed declarationをWCR-001だけにし部分的recordを評価しないこと", () => {
    // Arrange
    const current = snapshot([], "1");
    const malformed = MalformedConstraintDeclaration.create({
      declaredConstraintId: "not-a-world-id",
      declarationArtifactId,
      declarationLocator: "/constraints/0",
      reasons: ["constraintId is invalid", "premise is missing"],
    });
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [], { malformedDeclarations: [malformed] }));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-001"]);
    expect(actual.evaluations).toEqual([]);
    expect(actual.findings[0].constraintId).toBeNull();
  });

  it("baselineなしのmissing endpointをWCR-002にしdeletionとdigestを重ねないこと", () => {
    // Arrange
    const claimant = sourceNode("scripts/harness/a.ts", "a");
    const premise = sourceNode("scripts/harness/b.ts", "b");
    const constraint = record("content-equals", claimant, premise);
    const current = snapshot([premise], "2");
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint]));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-002"]);
    expect(actual.findings[0].endpoint).toBe("claimant");
  });

  it("baselineに存在してcurrentで消えたendpointをWCR-003にしmissingとdigestを重ねないこと", () => {
    // Arrange
    const claimant = sourceNode("scripts/harness/a.ts", "a");
    const premise = sourceNode("scripts/harness/b.ts", "b");
    const constraint = record("content-equals", claimant, premise);
    const baseline = snapshot([claimant, premise], "1");
    const current = snapshot([premise], "2");
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint], { baselineSnapshot: baseline }));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-003"]);
  });

  it("explicit aliasのtargetが存在しない場合はWCR-004を返すこと", () => {
    // Arrange
    const claimant = sourceNode("docs/old.md", "a");
    const premise = sourceNode("docs/premise.md", "a");
    const missingTarget = WorldNodeId.sourceFile(PathKey.create("docs/new.md"));
    const constraint = record("content-equals", claimant, premise);
    const current = snapshot([premise], "2");
    const alias = ExplicitNodeAlias.create({ from: claimant.id, to: missingTarget });
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint], { aliases: [alias] }));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-004"]);
  });

  it("exact IDがduplicateの場合はwinnerを選ばずWCR-005を返すこと", () => {
    // Arrange
    const claimant = sourceNode("scripts/harness/a.ts", "a");
    const duplicate = sourceNode("scripts/harness/a.ts", "c");
    const premise = sourceNode("scripts/harness/b.ts", "b");
    const constraint = record("content-equals", claimant, premise);
    const current = snapshot([claimant, duplicate, premise], "2", [
      ExtractionDiagnostic.create({ code: "duplicate-node-id", nodeId: claimant.id }),
    ]);
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint]));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-005"]);
    expect(actual.evaluations[0].claimant.candidateCount).toBe(2);
    expect(actual.evaluations[0].claimant.candidateContentDigests).toEqual([
      digest("a").toString(),
      digest("c").toString(),
    ]);
    expect(actual.evaluations[0].claimant.currentDigest).toBeNull();
    expect(actual.evaluations[0].claimant.sourceDiagnosticCodes).toEqual(["duplicate-node-id"]);
  });

  it("explicit aliasのtargetがduplicateの場合もwinnerを選ばずWCR-005を返すこと", () => {
    // Arrange
    const oldClaimant = sourceNode("docs/old.md", "a");
    const newClaimant = sourceNode("docs/new.md", "a");
    const duplicateTarget = sourceNode("docs/new.md", "b");
    const premise = sourceNode("docs/premise.md", "a");
    const constraint = record("content-equals", oldClaimant, premise);
    const current = snapshot([newClaimant, duplicateTarget, premise], "2");
    const alias = ExplicitNodeAlias.create({ from: oldClaimant.id, to: newClaimant.id });
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint], { aliases: [alias] }));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-005"]);
    expect(actual.evaluations[0].claimant.candidateCount).toBe(2);
  });

  it("referencesとrefinesはconstraint declaration由来の明示relationがない限りWCR-006にすること", () => {
    // Arrange
    const claimant = sourceNode("docs/proposal.md", "a");
    const premise = sourceNode("docs/product.md", "a");
    const references = record("references", claimant, premise);
    const refines = record("refines", claimant, premise);
    const current = snapshot([claimant, premise], "2");
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [references, refines]));

    // Assert
    expect(actual.findings.map((finding) => [finding.constraintId, finding.ruleId])).toEqual([
      [references.constraintId.toString(), "WCR-006"],
      [refines.constraintId.toString(), "WCR-006"],
    ]);
  });

  it("depends-onの明示relationがない場合はWCR-007にすること", () => {
    // Arrange
    const claimant = sourceNode("scripts/harness/a.ts", "a");
    const premise = sourceNode("scripts/harness/b.ts", "b");
    const constraint = record("depends-on", claimant, premise);
    const current = snapshot([claimant, premise], "2");
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint]));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-007"]);
  });

  it("claimantだけのdigest変更とpremiseだけのdigest変更を同じconstraintのWCR-008として再評価すること", () => {
    // Arrange
    const claimant = sourceNode("scripts/harness/a.ts", "a");
    const premise = sourceNode("scripts/harness/b.ts", "a");
    const constraint = record("content-equals", claimant, premise);
    const claimantChanged = snapshot([sourceNode("scripts/harness/a.ts", "b"), premise], "2");
    const premiseChanged = snapshot([claimant, sourceNode("scripts/harness/b.ts", "b")], "3");
    const sut = new ConstraintEvaluator();

    // Act
    const claimantActual = sut.evaluateFull(input(claimantChanged, [constraint]));
    const premiseActual = sut.evaluateFull(input(premiseChanged, [constraint]));

    // Assert
    expect(claimantActual.findings.map((finding) => [finding.constraintId, finding.ruleId, finding.endpoint])).toEqual([
      [constraint.constraintId.toString(), "WCR-008", "claimant"],
      [constraint.constraintId.toString(), "WCR-008", null],
    ]);
    expect(premiseActual.findings.map((finding) => [finding.constraintId, finding.ruleId, finding.endpoint])).toEqual([
      [constraint.constraintId.toString(), "WCR-008", "premise"],
      [constraint.constraintId.toString(), "WCR-008", null],
    ]);
  });

  it("aliasなしrenameはremovedとaddedのままWCR-003にしWCR-004を生成しないこと", () => {
    // Arrange
    const oldClaimant = sourceNode("docs/old.md", "a");
    const newClaimant = sourceNode("docs/new.md", "a");
    const premise = sourceNode("docs/premise.md", "a");
    const constraint = record("content-equals", oldClaimant, premise);
    const baseline = snapshot([oldClaimant, premise], "1");
    const current = snapshot([newClaimant, premise], "2");
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint], { baselineSnapshot: baseline }));

    // Assert
    expect(actual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-003"]);
    expect(actual.changeProvenance.changedCandidates.map((candidate) => candidate.changeKind)).toEqual([
      "added",
      "removed",
    ]);
  });

  it("valid single-hop aliasだけをresolved-via-aliasとして評価すること", () => {
    // Arrange
    const oldClaimant = sourceNode("docs/old.md", "a");
    const newClaimant = sourceNode("docs/new.md", "a");
    const premise = sourceNode("docs/premise.md", "a");
    const constraint = record("content-equals", oldClaimant, premise);
    const current = snapshot([newClaimant, premise], "2");
    const alias = ExplicitNodeAlias.create({ from: oldClaimant.id, to: newClaimant.id });
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint], { aliases: [alias] }));

    // Assert
    expect(actual.findings).toEqual([]);
    expect(actual.evaluations[0].claimant.status).toBe("resolved-via-alias");
    expect(actual.evaluations[0].claimant.resolvedNodeId).toBe(newClaimant.id.toString());
  });

  it("refinesは明示relationだけを受理し同一digestだけでは事実化しないこと", () => {
    // Arrange
    const claimant = sourceNode("docs/proposal.md", "a");
    const premise = sourceNode("docs/product.md", "a");
    const constraint = record("refines", claimant, premise);
    const current = snapshot([claimant, premise], "2");
    const relation = ExplicitConstraintRelation.create({
      constraintId: constraint.constraintId,
      factType: "refines",
      claimantId: claimant.id,
      premiseId: premise.id,
    });
    const sut = new ConstraintEvaluator();

    // Act
    const inferredActual = sut.evaluateFull(input(current, [constraint]));
    const explicitActual = sut.evaluateFull(input(current, [constraint], { relations: [relation] }));

    // Assert
    expect(inferredActual.findings.map((finding) => finding.ruleId)).toEqual(["WCR-006"]);
    expect(explicitActual.findings).toEqual([]);
  });

  it("incremental評価がclaimantとpremiseのchanged candidateを対称にscheduleしfull結果とbyte一致すること", () => {
    // Arrange
    const claimant = sourceNode("scripts/harness/a.ts", "a");
    const premise = sourceNode("scripts/harness/b.ts", "a");
    const constraint = record("content-equals", claimant, premise);
    const baseline = snapshot([claimant, premise], "1");
    const current = snapshot([claimant, sourceNode("scripts/harness/b.ts", "b")], "2");
    const baselineInput = input(baseline, [constraint]);
    const currentInput = input(current, [constraint], { baselineSnapshot: baseline });
    const sut = new ConstraintEvaluator();
    const serializer = new CanonicalJsonSerializer();
    const previous = sut.evaluateFull(baselineInput);

    // Act
    const fullActual = sut.evaluateFull(currentInput);
    const claimantScheduled = sut.evaluateIncrementally(currentInput, [claimant.id], previous);
    const premiseScheduled = sut.evaluateIncrementally(currentInput, [premise.id], previous);

    // Assert
    expect(claimantScheduled.scheduledConstraintIds).toEqual([constraint.constraintId.toString()]);
    expect(premiseScheduled.scheduledConstraintIds).toEqual([constraint.constraintId.toString()]);
    expect(serializer.serialize(claimantScheduled.toCanonicalValue())).toEqual(
      serializer.serialize(fullActual.toCanonicalValue()),
    );
    expect(serializer.serialize(premiseScheduled.toCanonicalValue())).toEqual(
      serializer.serialize(fullActual.toCanonicalValue()),
    );
  });

  it("evaluation DTOにseverity・blocking・exit codeを含めないこと", () => {
    // Arrange
    const claimant = sourceNode("scripts/harness/a.ts", "a");
    const premise = sourceNode("scripts/harness/b.ts", "b");
    const constraint = record("depends-on", claimant, premise);
    const current = snapshot([claimant, premise], "2");
    const sut = new ConstraintEvaluator();

    // Act
    const actual = sut.evaluateFull(input(current, [constraint])).toCanonicalValue();
    const serialized = JSON.stringify(actual);

    // Assert
    expect(serialized).not.toContain("severity");
    expect(serialized).not.toContain("blocking");
    expect(serialized).not.toContain("exitCode");
    expect(serialized).not.toContain("waived");
  });
});
