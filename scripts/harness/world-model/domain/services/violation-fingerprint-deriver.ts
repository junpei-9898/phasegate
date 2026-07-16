// @unit world-model
// @layer domain
// @work-item-id WI-295, WI-296

import type { WorldHashingPort } from "../ports/world-hashing-port.js";
import { ViolationFingerprint } from "../value-objects/violation-fingerprint.js";
import type { CanonicalJsonObject, CanonicalJsonSerializer } from "./canonical-json-serializer.js";
import type { ConstraintFindingDto, EndpointResolutionDto } from "./constraint-evaluator.js";

export interface ViolationFingerprintDerivation {
  readonly fingerprint: ViolationFingerprint;
  readonly preimage: CanonicalJsonObject;
  readonly canonicalBytes: Uint8Array;
}

const pinOf = (endpoint: EndpointResolutionDto | null): CanonicalJsonObject | null =>
  endpoint === null ? null : { nodeId: endpoint.declaredNodeId, contentDigest: endpoint.pinnedDigest };

const subjectRole = (finding: ConstraintFindingDto): "claimant" | "premise" | "both" | "declaration" | "global" => {
  if (finding.endpoint !== null) return finding.endpoint;
  if (finding.ruleId === "WCR-001") return "declaration";
  if (
    finding.ruleId === "WCR-006" ||
    finding.ruleId === "WCR-007" ||
    (finding.ruleId === "WCR-008" && finding.factType === "content-equals")
  ) {
    return "both";
  }
  return "global";
};

const subjectOf = (finding: ConstraintFindingDto): CanonicalJsonObject => {
  const endpointRole = subjectRole(finding);
  const globalNodeId =
    endpointRole === "global" && typeof finding.evidence.nodeId === "string" ? finding.evidence.nodeId : undefined;
  const ids =
    endpointRole === "claimant"
      ? [finding.claimant?.declaredNodeId]
      : endpointRole === "premise"
        ? [finding.premise?.declaredNodeId]
        : endpointRole === "both" || endpointRole === "global"
          ? [globalNodeId, finding.claimant?.declaredNodeId, finding.premise?.declaredNodeId]
          : [];
  return {
    endpointRole,
    nodeIds: [...new Set(ids.filter((value): value is string => value !== undefined))].sort(),
  };
};

const endpointFor = (finding: ConstraintFindingDto): EndpointResolutionDto | null =>
  finding.endpoint === "claimant" ? finding.claimant : finding.endpoint === "premise" ? finding.premise : null;

const expectedObserved = (
  finding: ConstraintFindingDto,
): { readonly expected: CanonicalJsonObject; readonly observed: CanonicalJsonObject } => {
  const endpoint = endpointFor(finding);
  switch (finding.ruleId) {
    case "WCR-001":
      return {
        expected: { declarationAdmission: "well-formed" },
        observed: {
          declaredConstraintId:
            typeof finding.evidence.declaredConstraintId === "string" ? finding.evidence.declaredConstraintId : null,
        },
      };
    case "WCR-002":
    case "WCR-003":
      return {
        expected: {
          contentDigest: endpoint?.pinnedDigest ?? null,
          nodeId: endpoint?.declaredNodeId ?? null,
          presence: "resolved",
        },
        observed: {
          baselineCandidateCount:
            typeof finding.evidence.baselineCandidateCount === "number"
              ? finding.evidence.baselineCandidateCount
              : null,
          candidateCount: endpoint?.candidateCount ?? 0,
          currentDigest: endpoint?.currentDigest ?? null,
          status: endpoint?.status ?? "missing",
        },
      };
    case "WCR-004":
      return {
        expected: { aliasResolution: "single-hop-resolved" },
        observed: {
          aliasCount: typeof finding.evidence.aliasCount === "number" ? finding.evidence.aliasCount : null,
          aliasTarget: typeof finding.evidence.aliasTarget === "string" ? finding.evidence.aliasTarget : null,
          aliasTargets: Array.isArray(finding.evidence.aliasTargets) ? [...finding.evidence.aliasTargets].sort() : [],
          resolutionStatus: endpoint?.status ?? "invalid-alias",
          targetCandidateCount:
            typeof finding.evidence.targetCandidateCount === "number" ? finding.evidence.targetCandidateCount : null,
        },
      };
    case "WCR-005":
      return {
        expected: {
          candidateCount: 1,
          nodeId:
            endpoint?.declaredNodeId ?? (typeof finding.evidence.nodeId === "string" ? finding.evidence.nodeId : null),
        },
        observed: {
          candidateContentDigests:
            endpoint !== null
              ? [...endpoint.candidateContentDigests].sort()
              : Array.isArray(finding.evidence.candidateContentDigests)
                ? finding.evidence.candidateContentDigests
                    .filter((value): value is string => typeof value === "string")
                    .sort()
                : [],
          candidateCount:
            endpoint?.candidateCount ??
            (typeof finding.evidence.candidateCount === "number" ? finding.evidence.candidateCount : 0),
          resolution: typeof finding.evidence.resolution === "string" ? finding.evidence.resolution : null,
        },
      };
    case "WCR-006":
    case "WCR-007":
      return {
        expected: {
          claimantNodeId: finding.claimant?.declaredNodeId ?? null,
          factType: finding.factType,
          premiseNodeId: finding.premise?.declaredNodeId ?? null,
          relationSource: "constraint-declaration",
        },
        observed: { relationPresent: false },
      };
    case "WCR-008":
      if (finding.endpoint !== null) {
        return {
          expected: {
            contentDigest: endpoint?.pinnedDigest ?? null,
            nodeId: endpoint?.declaredNodeId ?? null,
          },
          observed: {
            contentDigest: endpoint?.currentDigest ?? null,
            resolvedNodeId: endpoint?.resolvedNodeId ?? null,
          },
        };
      }
      return {
        expected: { relation: "current endpoint digests are equal" },
        observed: {
          claimantDigest: finding.claimant?.currentDigest ?? null,
          premiseDigest: finding.premise?.currentDigest ?? null,
        },
      };
    default:
      return { expected: {}, observed: {} };
  }
};

export class ViolationFingerprintDeriver {
  constructor(
    private readonly serializer: CanonicalJsonSerializer,
    private readonly hashingPort: WorldHashingPort,
  ) {}

  derive(finding: ConstraintFindingDto, rulesetVersion: string): ViolationFingerprintDerivation {
    if (rulesetVersion.trim().length === 0) throw new Error("rulesetVersion must be non-empty");
    const evidence = expectedObserved(finding);
    const preimage: CanonicalJsonObject = {
      schemaVersion: "phasegate-world-violation-fingerprint/v1",
      rulesetVersion,
      ruleId: finding.ruleId,
      constraintId: finding.constraintId,
      factType: finding.factType,
      subject: subjectOf(finding),
      claimantPin: pinOf(finding.claimant),
      premisePin: pinOf(finding.premise),
      expected: evidence.expected,
      observed: evidence.observed,
    };
    const canonicalBytes = this.serializer.serialize(preimage);
    const digest = this.hashingPort.sha256(canonicalBytes);
    return Object.freeze({
      fingerprint: ViolationFingerprint.create(`pgw:v1:violation-fingerprint:${digest.toString()}`),
      preimage: Object.freeze(preimage),
      canonicalBytes,
    });
  }
}
