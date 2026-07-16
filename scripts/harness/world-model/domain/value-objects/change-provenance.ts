// @unit world-model
// @layer domain
// @work-item-id WI-293

import type { Snapshot } from "../entities/snapshot.js";
import type { WorldNode } from "../entities/world-node.js";
import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { Sha256Digest } from "./sha256-digest.js";
import type { WorldNodeId } from "./world-node-id.js";

export type ChangedCandidateKind = "added" | "removed" | "modified" | "candidate-cardinality-changed";

export interface ChangedCandidate {
  readonly nodeId: WorldNodeId;
  readonly changeKind: ChangedCandidateKind;
  readonly baselineDigest: Sha256Digest | null;
  readonly currentDigest: Sha256Digest | null;
  readonly baselineLocators: readonly string[];
  readonly currentLocators: readonly string[];
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const locatorFor = (node: WorldNode): string => {
  if (node.projection.type === "artifact" || node.projection.type === "source-file") {
    return node.projection.pathKey;
  }
  if (node.projection.type === "fragment") {
    return node.projection.artifactId;
  }
  return node.id.toString();
};

const groupNodes = (nodes: readonly WorldNode[]): Map<string, readonly WorldNode[]> => {
  const mutable = new Map<string, WorldNode[]>();
  for (const node of nodes) {
    const key = node.id.toString();
    const current = mutable.get(key) ?? [];
    current.push(node);
    mutable.set(key, current);
  }
  return new Map(
    [...mutable].map(([key, values]) => [
      key,
      Object.freeze(
        [...values].sort((left, right) =>
          compareStrings(
            `${left.contentDigest.toString()}\0${locatorFor(left)}`,
            `${right.contentDigest.toString()}\0${locatorFor(right)}`,
          ),
        ),
      ),
    ]),
  );
};

const signature = (nodes: readonly WorldNode[]): string =>
  nodes.map((node) => `${node.contentDigest.toString()}\0${locatorFor(node)}`).join("\u0001");

const candidateFor = (
  nodeId: WorldNodeId,
  baselineNodes: readonly WorldNode[],
  currentNodes: readonly WorldNode[],
): ChangedCandidate | null => {
  let changeKind: ChangedCandidateKind;
  if (baselineNodes.length === 0) {
    changeKind = "added";
  } else if (currentNodes.length === 0) {
    changeKind = "removed";
  } else if (baselineNodes.length !== currentNodes.length) {
    changeKind = "candidate-cardinality-changed";
  } else if (signature(baselineNodes) !== signature(currentNodes)) {
    changeKind = "modified";
  } else {
    return null;
  }
  return Object.freeze({
    nodeId,
    changeKind,
    baselineDigest: baselineNodes.length === 1 ? baselineNodes[0].contentDigest : null,
    currentDigest: currentNodes.length === 1 ? currentNodes[0].contentDigest : null,
    baselineLocators: Object.freeze([...new Set(baselineNodes.map(locatorFor))].sort(compareStrings)),
    currentLocators: Object.freeze([...new Set(currentNodes.map(locatorFor))].sort(compareStrings)),
  });
};

export class ChangeProvenance {
  readonly baselineSnapshotId: WorldNodeId | null;
  readonly baselineCorpusRoot: Sha256Digest | null;
  readonly currentSnapshotId: WorldNodeId;
  readonly currentCorpusRoot: Sha256Digest;
  readonly changedCandidates: readonly ChangedCandidate[];

  private constructor(
    baselineSnapshot: Snapshot | null,
    currentSnapshot: Snapshot,
    changedCandidates: readonly ChangedCandidate[],
  ) {
    this.baselineSnapshotId = baselineSnapshot?.id ?? null;
    this.baselineCorpusRoot = baselineSnapshot?.corpusRoot ?? null;
    this.currentSnapshotId = currentSnapshot.id;
    this.currentCorpusRoot = currentSnapshot.corpusRoot;
    this.changedCandidates = changedCandidates;
    Object.freeze(this);
  }

  static between(baselineSnapshot: Snapshot | null, currentSnapshot: Snapshot): ChangeProvenance {
    const baselineGroups = groupNodes(baselineSnapshot?.nodes ?? []);
    const currentGroups = groupNodes(currentSnapshot.nodes);
    const ids = [...new Set([...baselineGroups.keys(), ...currentGroups.keys()])].sort(compareStrings);
    const changedCandidates = ids.flatMap((id) => {
      const baselineNodes = baselineGroups.get(id) ?? [];
      const currentNodes = currentGroups.get(id) ?? [];
      const sample = currentNodes[0] ?? baselineNodes[0];
      const candidate = candidateFor(sample.id, baselineNodes, currentNodes);
      return candidate === null ? [] : [candidate];
    });
    return new ChangeProvenance(baselineSnapshot, currentSnapshot, Object.freeze(changedCandidates));
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      baselineCorpusRoot: this.baselineCorpusRoot?.toString() ?? null,
      baselineSnapshotId: this.baselineSnapshotId?.toString() ?? null,
      changedCandidates: this.changedCandidates.map((candidate) => ({
        baselineDigest: candidate.baselineDigest?.toString() ?? null,
        baselineLocators: candidate.baselineLocators,
        changeKind: candidate.changeKind,
        currentDigest: candidate.currentDigest?.toString() ?? null,
        currentLocators: candidate.currentLocators,
        nodeId: candidate.nodeId.toString(),
      })),
      currentCorpusRoot: this.currentCorpusRoot.toString(),
      currentSnapshotId: this.currentSnapshotId.toString(),
    };
  }
}
