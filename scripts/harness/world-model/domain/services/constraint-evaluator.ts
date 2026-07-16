// @unit world-model
// @layer domain
// @work-item-id WI-293

import type {
  ConstraintFactType,
  ConstraintRecord,
  MalformedConstraintDeclaration,
} from "../entities/constraint-record.js";
import type { Snapshot } from "../entities/snapshot.js";
import type { WorldNode } from "../entities/world-node.js";
import type { ChangeProvenance } from "../value-objects/change-provenance.js";
import type { ExplicitConstraintRelation } from "../value-objects/explicit-constraint-relation.js";
import type { ExplicitNodeAlias } from "../value-objects/explicit-node-alias.js";
import type { NodePin } from "../value-objects/node-pin.js";
import type { WorldNodeId } from "../value-objects/world-node-id.js";
import type { CanonicalJsonObject } from "./canonical-json-serializer.js";

export type EndpointRole = "claimant" | "premise";
export type EndpointResolutionStatus =
  | "resolved"
  | "resolved-via-alias"
  | "duplicate"
  | "invalid-alias"
  | "deleted"
  | "missing";

export interface EndpointResolutionDto {
  readonly role: EndpointRole;
  readonly declaredNodeId: string;
  readonly pinnedDigest: string;
  readonly status: EndpointResolutionStatus;
  readonly resolvedNodeId: string | null;
  readonly currentDigest: string | null;
  readonly candidateCount: number;
  readonly candidateContentDigests: readonly string[];
  readonly locators: readonly string[];
  readonly sourceDiagnosticCodes: readonly string[];
}

export interface ConstraintFindingDto {
  readonly ruleId: string;
  readonly constraintId: string | null;
  readonly factType: ConstraintFactType | null;
  readonly endpoint: EndpointRole | null;
  readonly claimant: EndpointResolutionDto | null;
  readonly premise: EndpointResolutionDto | null;
  readonly declarationArtifactId: string;
  readonly declarationLocator: string;
  readonly evidence: CanonicalJsonObject;
}

export interface ConstraintEvaluationDto {
  readonly constraintId: string;
  readonly factType: ConstraintFactType;
  readonly claimant: EndpointResolutionDto;
  readonly premise: EndpointResolutionDto;
  readonly findings: readonly ConstraintFindingDto[];
}

export interface ConstraintEvaluationInput {
  readonly currentSnapshot: Snapshot;
  readonly baselineSnapshot?: Snapshot;
  readonly records: readonly ConstraintRecord[];
  readonly malformedDeclarations?: readonly MalformedConstraintDeclaration[];
  readonly aliases?: readonly ExplicitNodeAlias[];
  readonly relations?: readonly ExplicitConstraintRelation[];
  readonly changeProvenance: ChangeProvenance;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const endpointOrder = (endpoint: EndpointRole | null): number =>
  endpoint === "claimant" ? 0 : endpoint === "premise" ? 1 : 2;

const compareFindings = (left: ConstraintFindingDto, right: ConstraintFindingDto): number =>
  compareStrings(left.constraintId ?? "", right.constraintId ?? "") ||
  compareStrings(left.ruleId, right.ruleId) ||
  endpointOrder(left.endpoint) - endpointOrder(right.endpoint) ||
  compareStrings(JSON.stringify(left.evidence), JSON.stringify(right.evidence));

const locatorFor = (node: WorldNode): string => {
  if (node.projection.type === "artifact" || node.projection.type === "source-file") {
    return node.projection.pathKey;
  }
  if (node.projection.type === "fragment") {
    return node.projection.artifactId;
  }
  return node.id.toString();
};

const candidatesFor = (snapshot: Snapshot | undefined, nodeId: WorldNodeId): readonly WorldNode[] =>
  Object.freeze((snapshot?.nodes ?? []).filter((node) => node.id.equals(nodeId)));

const roleFor = (nodeId: WorldNodeId): string | null => {
  const value = nodeId.toString();
  let match = /^pgw:v1:artifact:[^:]+:([^:]+):/.exec(value);
  if (match) return match[1];
  match = /^pgw:v1:fragment:legacy:[^:]+:([^:]+):/.exec(value);
  if (match) return match[1];
  match = /^pgw:v1:fragment:([^:]+):/.exec(value);
  return match?.[1] ?? null;
};

const compatibleAliasRole = (from: WorldNodeId, to: WorldNodeId): boolean => {
  if (from.nodeType !== to.nodeType) return false;
  const fromRole = roleFor(from);
  const toRole = roleFor(to);
  return fromRole === null || toRole === null || fromRole === toRole;
};

const freezeEndpoint = (endpoint: EndpointResolutionDto): EndpointResolutionDto =>
  Object.freeze({
    ...endpoint,
    candidateContentDigests: Object.freeze([...endpoint.candidateContentDigests]),
    locators: Object.freeze([...endpoint.locators]),
    sourceDiagnosticCodes: Object.freeze([...endpoint.sourceDiagnosticCodes]),
  });

interface EndpointResolution {
  readonly dto: EndpointResolutionDto;
  readonly currentNode: WorldNode | null;
  readonly resolutionRuleId: "WCR-002" | "WCR-003" | "WCR-004" | "WCR-005" | null;
  readonly evidence: CanonicalJsonObject;
}

const endpointDto = (
  role: EndpointRole,
  pin: NodePin,
  status: EndpointResolutionStatus,
  candidates: readonly WorldNode[],
  resolvedNode: WorldNode | null,
  resolvedNodeId: WorldNodeId | null = resolvedNode?.id ?? null,
  sourceDiagnosticCodes: readonly string[] = [],
): EndpointResolutionDto =>
  freezeEndpoint({
    role,
    declaredNodeId: pin.nodeId.toString(),
    pinnedDigest: pin.contentDigest.toString(),
    status,
    resolvedNodeId: resolvedNodeId?.toString() ?? null,
    currentDigest: resolvedNode?.contentDigest.toString() ?? null,
    candidateCount: candidates.length,
    candidateContentDigests: candidates.map((candidate) => candidate.contentDigest.toString()).sort(compareStrings),
    locators: [...new Set(candidates.map(locatorFor))].sort(compareStrings),
    sourceDiagnosticCodes: [...sourceDiagnosticCodes].sort(compareStrings),
  });

const toEndpointCanonical = (endpoint: EndpointResolutionDto): CanonicalJsonObject => ({
  candidateCount: endpoint.candidateCount,
  candidateContentDigests: endpoint.candidateContentDigests,
  currentDigest: endpoint.currentDigest,
  declaredNodeId: endpoint.declaredNodeId,
  locators: endpoint.locators,
  pinnedDigest: endpoint.pinnedDigest,
  resolvedNodeId: endpoint.resolvedNodeId,
  role: endpoint.role,
  sourceDiagnosticCodes: endpoint.sourceDiagnosticCodes,
  status: endpoint.status,
});

const toFindingCanonical = (finding: ConstraintFindingDto): CanonicalJsonObject => ({
  claimant: finding.claimant === null ? null : toEndpointCanonical(finding.claimant),
  constraintId: finding.constraintId,
  declarationArtifactId: finding.declarationArtifactId,
  declarationLocator: finding.declarationLocator,
  endpoint: finding.endpoint,
  evidence: finding.evidence,
  factType: finding.factType,
  premise: finding.premise === null ? null : toEndpointCanonical(finding.premise),
  ruleId: finding.ruleId,
});

const toEvaluationCanonical = (evaluation: ConstraintEvaluationDto): CanonicalJsonObject => ({
  claimant: toEndpointCanonical(evaluation.claimant),
  constraintId: evaluation.constraintId,
  factType: evaluation.factType,
  findings: evaluation.findings.map(toFindingCanonical),
  premise: toEndpointCanonical(evaluation.premise),
});

export class ConstraintEvaluationResult {
  readonly evaluationId: string | null;
  readonly evaluations: readonly ConstraintEvaluationDto[];
  readonly findings: readonly ConstraintFindingDto[];
  readonly changeProvenance: ChangeProvenance;
  readonly scheduledConstraintIds: readonly string[];

  constructor(props: {
    readonly evaluationId: string | null;
    readonly evaluations: readonly ConstraintEvaluationDto[];
    readonly declarationFindings: readonly ConstraintFindingDto[];
    readonly changeProvenance: ChangeProvenance;
    readonly scheduledConstraintIds: readonly string[];
  }) {
    this.evaluationId = props.evaluationId;
    this.evaluations = Object.freeze(
      [...props.evaluations].sort((left, right) => compareStrings(left.constraintId, right.constraintId)),
    );
    this.findings = Object.freeze(
      [...props.declarationFindings, ...this.evaluations.flatMap((evaluation) => evaluation.findings)].sort(
        compareFindings,
      ),
    );
    this.changeProvenance = props.changeProvenance;
    this.scheduledConstraintIds = Object.freeze([...props.scheduledConstraintIds].sort(compareStrings));
    Object.freeze(this);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      changeProvenance: this.changeProvenance.toCanonicalValue(),
      evaluationId: this.evaluationId,
      evaluations: this.evaluations.map(toEvaluationCanonical),
      findings: this.findings.map(toFindingCanonical),
    };
  }
}

export class ConstraintEvaluator {
  evaluateFull(input: ConstraintEvaluationInput): ConstraintEvaluationResult {
    const records = [...input.records].sort((left, right) =>
      compareStrings(left.constraintId.toString(), right.constraintId.toString()),
    );
    return this.evaluateRecords(
      input,
      records,
      records.map((record) => record.constraintId.toString()),
    );
  }

  evaluateIncrementally(
    input: ConstraintEvaluationInput,
    changedNodeIds: readonly WorldNodeId[],
    previous: ConstraintEvaluationResult,
  ): ConstraintEvaluationResult {
    const changed = new Set(changedNodeIds.map((nodeId) => nodeId.toString()));
    const previousById = new Map(previous.evaluations.map((evaluation) => [evaluation.constraintId, evaluation]));
    const aliases = input.aliases ?? [];
    const affected = input.records.filter((record) => {
      if (!previousById.has(record.constraintId.toString())) return true;
      if (changed.has(record.claimant.nodeId.toString()) || changed.has(record.premise.nodeId.toString())) return true;
      return aliases.some(
        (alias) =>
          (alias.from.equals(record.claimant.nodeId) || alias.from.equals(record.premise.nodeId)) &&
          changed.has(alias.to.toString()),
      );
    });
    const affectedIds = new Set(affected.map((record) => record.constraintId.toString()));
    const fresh = this.evaluateRecords(input, affected, [...affectedIds]);
    const currentIds = new Set(input.records.map((record) => record.constraintId.toString()));
    const retained = previous.evaluations.filter(
      (evaluation) => currentIds.has(evaluation.constraintId) && !affectedIds.has(evaluation.constraintId),
    );
    return new ConstraintEvaluationResult({
      evaluationId: input.currentSnapshot.evaluationId?.toString() ?? null,
      evaluations: [...retained, ...fresh.evaluations],
      declarationFindings: fresh.findings.filter((finding) => finding.constraintId === null),
      changeProvenance: input.changeProvenance,
      scheduledConstraintIds: [...affectedIds],
    });
  }

  private evaluateRecords(
    input: ConstraintEvaluationInput,
    records: readonly ConstraintRecord[],
    scheduledConstraintIds: readonly string[],
  ): ConstraintEvaluationResult {
    const declarationFindings = (input.malformedDeclarations ?? []).map((malformed) =>
      Object.freeze({
        ruleId: "WCR-001",
        constraintId: null,
        factType: null,
        endpoint: null,
        claimant: null,
        premise: null,
        declarationArtifactId: malformed.declarationArtifactId.toString(),
        declarationLocator: malformed.declarationLocator,
        evidence: malformed.toCanonicalValue(),
      } satisfies ConstraintFindingDto),
    );
    const evaluations = records.map((record) => this.evaluateRecord(input, record));
    return new ConstraintEvaluationResult({
      evaluationId: input.currentSnapshot.evaluationId?.toString() ?? null,
      evaluations,
      declarationFindings,
      changeProvenance: input.changeProvenance,
      scheduledConstraintIds,
    });
  }

  private evaluateRecord(input: ConstraintEvaluationInput, record: ConstraintRecord): ConstraintEvaluationDto {
    const claimant = this.resolveEndpoint(input, record.claimant, "claimant");
    const premise = this.resolveEndpoint(input, record.premise, "premise");
    const findings: ConstraintFindingDto[] = [];

    for (const resolution of [claimant, premise]) {
      if (resolution.resolutionRuleId !== null && record.applies(resolution.resolutionRuleId)) {
        findings.push(
          this.finding(record, resolution.resolutionRuleId, resolution.dto.role, claimant.dto, premise.dto, {
            ...resolution.evidence,
          }),
        );
      }
    }

    if (claimant.currentNode !== null && premise.currentNode !== null) {
      const relationRule =
        record.factType === "depends-on"
          ? "WCR-007"
          : record.factType === "references" || record.factType === "refines"
            ? "WCR-006"
            : null;
      if (relationRule !== null && record.applies(relationRule) && !this.hasExplicitRelation(input, record)) {
        findings.push(
          this.finding(record, relationRule, null, claimant.dto, premise.dto, {
            expectedRelation: `${record.claimant.nodeId.toString()} --${record.factType}--> ${record.premise.nodeId.toString()}`,
            relationSource: "constraint-declaration",
          }),
        );
      }

      if (record.applies("WCR-008")) {
        if (!claimant.currentNode.contentDigest.equals(record.claimant.contentDigest)) {
          findings.push(
            this.finding(record, "WCR-008", "claimant", claimant.dto, premise.dto, {
              expectedDigest: record.claimant.contentDigest.toString(),
              observedDigest: claimant.currentNode.contentDigest.toString(),
            }),
          );
        }
        if (!premise.currentNode.contentDigest.equals(record.premise.contentDigest)) {
          findings.push(
            this.finding(record, "WCR-008", "premise", claimant.dto, premise.dto, {
              expectedDigest: record.premise.contentDigest.toString(),
              observedDigest: premise.currentNode.contentDigest.toString(),
            }),
          );
        }
        if (
          record.factType === "content-equals" &&
          !claimant.currentNode.contentDigest.equals(premise.currentNode.contentDigest)
        ) {
          findings.push(
            this.finding(record, "WCR-008", null, claimant.dto, premise.dto, {
              claimantDigest: claimant.currentNode.contentDigest.toString(),
              expectedRelation: "current endpoint digests are equal",
              premiseDigest: premise.currentNode.contentDigest.toString(),
            }),
          );
        }
      }
    }

    return Object.freeze({
      constraintId: record.constraintId.toString(),
      factType: record.factType,
      claimant: claimant.dto,
      premise: premise.dto,
      findings: Object.freeze(findings.sort(compareFindings)),
    });
  }

  private resolveEndpoint(input: ConstraintEvaluationInput, pin: NodePin, role: EndpointRole): EndpointResolution {
    const exact = candidatesFor(input.currentSnapshot, pin.nodeId);
    const exactDiagnosticCodes = this.sourceDiagnosticCodes(input.currentSnapshot, pin.nodeId);
    if (exact.length > 1) {
      return {
        dto: endpointDto(role, pin, "duplicate", exact, null, null, exactDiagnosticCodes),
        currentNode: null,
        resolutionRuleId: "WCR-005",
        evidence: { candidateCount: exact.length, resolution: "exact" },
      };
    }
    if (exact.length === 1) {
      return {
        dto: endpointDto(role, pin, "resolved", exact, exact[0]),
        currentNode: exact[0],
        resolutionRuleId: null,
        evidence: {},
      };
    }

    const aliases = (input.aliases ?? []).filter((alias) => alias.from.equals(pin.nodeId));
    if (aliases.length > 0) {
      if (
        aliases.length !== 1 ||
        aliases[0].from.equals(aliases[0].to) ||
        (input.aliases ?? []).some((candidate) => candidate.from.equals(aliases[0].to)) ||
        !compatibleAliasRole(aliases[0].from, aliases[0].to)
      ) {
        return {
          dto: endpointDto(role, pin, "invalid-alias", [], null, aliases[0]?.to ?? null),
          currentNode: null,
          resolutionRuleId: "WCR-004",
          evidence: {
            aliasCount: aliases.length,
            aliasTargets: aliases.map((alias) => alias.to.toString()).sort(compareStrings),
          },
        };
      }
      const targetCandidates = candidatesFor(input.currentSnapshot, aliases[0].to);
      const targetDiagnosticCodes = this.sourceDiagnosticCodes(input.currentSnapshot, aliases[0].to);
      if (targetCandidates.length > 1) {
        return {
          dto: endpointDto(role, pin, "duplicate", targetCandidates, null, aliases[0].to, targetDiagnosticCodes),
          currentNode: null,
          resolutionRuleId: "WCR-005",
          evidence: { candidateCount: targetCandidates.length, resolution: "alias-target" },
        };
      }
      if (targetCandidates.length === 1) {
        return {
          dto: endpointDto(role, pin, "resolved-via-alias", targetCandidates, targetCandidates[0], aliases[0].to),
          currentNode: targetCandidates[0],
          resolutionRuleId: null,
          evidence: {},
        };
      }
      return {
        dto: endpointDto(role, pin, "invalid-alias", [], null, aliases[0].to),
        currentNode: null,
        resolutionRuleId: "WCR-004",
        evidence: { aliasTarget: aliases[0].to.toString(), targetCandidateCount: 0 },
      };
    }

    const baseline = candidatesFor(input.baselineSnapshot, pin.nodeId);
    if (baseline.length > 0) {
      return {
        dto: endpointDto(role, pin, "deleted", [], null),
        currentNode: null,
        resolutionRuleId: "WCR-003",
        evidence: { baselineCandidateCount: baseline.length },
      };
    }
    return {
      dto: endpointDto(role, pin, "missing", [], null),
      currentNode: null,
      resolutionRuleId: "WCR-002",
      evidence: { baselineCandidateCount: 0 },
    };
  }

  private hasExplicitRelation(input: ConstraintEvaluationInput, record: ConstraintRecord): boolean {
    return (input.relations ?? []).some(
      (relation) =>
        relation.constraintId.equals(record.constraintId) &&
        relation.factType === record.factType &&
        relation.claimantId.equals(record.claimant.nodeId) &&
        relation.premiseId.equals(record.premise.nodeId),
    );
  }

  private sourceDiagnosticCodes(snapshot: Snapshot, nodeId: WorldNodeId): readonly string[] {
    return Object.freeze(
      [
        ...new Set(
          snapshot.extractionDiagnostics
            .filter((diagnostic) => diagnostic.nodeId?.equals(nodeId))
            .map((diagnostic) => diagnostic.code),
        ),
      ].sort(compareStrings),
    );
  }

  private finding(
    record: ConstraintRecord,
    ruleId: string,
    endpoint: EndpointRole | null,
    claimant: EndpointResolutionDto,
    premise: EndpointResolutionDto,
    evidence: CanonicalJsonObject,
  ): ConstraintFindingDto {
    return Object.freeze({
      ruleId,
      constraintId: record.constraintId.toString(),
      factType: record.factType,
      endpoint,
      claimant,
      premise,
      declarationArtifactId: record.declarationArtifactId.toString(),
      declarationLocator: record.declarationLocator,
      evidence: Object.freeze({ ...evidence }),
    });
  }
}
