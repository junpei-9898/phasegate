// @unit world-model
// @layer infrastructure
// @work-item-id WI-289

import type { Edge } from "../../domain/entities/edge.js";
import type { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import type { WorldNode } from "../../domain/entities/world-node.js";
import type { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import type { PathKey } from "../../domain/value-objects/path-key.js";
import type { WorldNodeId } from "../../domain/value-objects/world-node-id.js";

export interface DesignFactNodeCandidate {
  readonly node: WorldNode;
  readonly path: PathKey;
  readonly line?: number;
}

export interface WorkItemReferenceCandidate {
  readonly sourceNodeId: WorldNodeId;
  readonly workItemId: string;
  readonly role: CorpusRole;
  readonly path: PathKey;
  readonly line: number;
}

export interface ReflectionReferenceCandidate {
  readonly sourceFragmentId: WorldNodeId;
  readonly target: string;
  readonly path: PathKey;
  readonly line: number;
}

export interface DesignFactCandidateExtraction {
  readonly nodeCandidates: readonly DesignFactNodeCandidate[];
  readonly workItemReferences: readonly WorkItemReferenceCandidate[];
  readonly reflectionReferences: readonly ReflectionReferenceCandidate[];
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export interface DesignFactExtraction {
  readonly nodes: readonly WorldNode[];
  readonly edges: readonly Edge[];
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export interface TraceabilityDesignFactIndex {
  readonly workItemNodes: readonly WorldNode[];
  readonly unitIdByDefinitionPath: ReadonlyMap<string, string>;
  readonly storyIdsBySourcePath: ReadonlyMap<string, readonly string[]>;
  readonly workItemIdByDescriptionPath: ReadonlyMap<string, string>;
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export interface DesignFactSource {
  extract(ownerIndex: TraceabilityDesignFactIndex): Promise<DesignFactCandidateExtraction>;
}

export const EMPTY_DESIGN_FACT_CANDIDATES: DesignFactCandidateExtraction = Object.freeze({
  nodeCandidates: Object.freeze([]),
  workItemReferences: Object.freeze([]),
  reflectionReferences: Object.freeze([]),
  diagnostics: Object.freeze([]),
});
