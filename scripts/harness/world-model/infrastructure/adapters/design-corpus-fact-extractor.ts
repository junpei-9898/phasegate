// @unit world-model
// @layer infrastructure
// @work-item-id WI-289

import { Edge } from "../../domain/entities/edge.js";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import type { WorldNode } from "../../domain/entities/world-node.js";
import { CanonicalJsonSerializer } from "../../domain/services/canonical-json-serializer.js";
import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../domain/value-objects/declared-key.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import { WorldNodeId } from "../../domain/value-objects/world-node-id.js";
import type {
  DesignFactCandidateExtraction,
  DesignFactExtraction,
  DesignFactNodeCandidate,
  DesignFactSource,
  ReflectionReferenceCandidate,
  WorkItemReferenceCandidate,
} from "./design-fact-extraction.js";
import type { TraceabilityDesignFactAdapter } from "./traceability-design-fact-adapter.js";

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const groupBy = <T>(values: readonly T[], keyOf: (value: T) => string): ReadonlyMap<string, readonly T[]> => {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const key = keyOf(value);
    const current = result.get(key) ?? [];
    current.push(value);
    result.set(key, current);
  }
  return result;
};

const mergeCandidateExtractions = (
  results: readonly DesignFactCandidateExtraction[],
): DesignFactCandidateExtraction => ({
  nodeCandidates: results.flatMap((result) => result.nodeCandidates),
  workItemReferences: results.flatMap((result) => result.workItemReferences),
  reflectionReferences: results.flatMap((result) => result.reflectionReferences),
  diagnostics: results.flatMap((result) => result.diagnostics),
});

export interface DesignCorpusFactExtractorDeps {
  readonly traceabilityAdapter: TraceabilityDesignFactAdapter;
  readonly productExtractor: DesignFactSource;
  readonly proposalExtractor: DesignFactSource;
  readonly adrExtractor: DesignFactSource;
  readonly unitExtractor: DesignFactSource;
}

export class DesignCorpusFactExtractor {
  private readonly deps: DesignCorpusFactExtractorDeps;
  private readonly serializer = new CanonicalJsonSerializer();

  constructor(deps: DesignCorpusFactExtractorDeps) {
    this.deps = deps;
  }

  async extract(): Promise<DesignFactExtraction> {
    const ownerIndex = await this.deps.traceabilityAdapter.read();
    const extracted = mergeCandidateExtractions(
      await Promise.all([
        this.deps.productExtractor.extract(ownerIndex),
        this.deps.proposalExtractor.extract(ownerIndex),
        this.deps.adrExtractor.extract(ownerIndex),
        this.deps.unitExtractor.extract(ownerIndex),
      ]),
    );
    const diagnostics = [...ownerIndex.diagnostics, ...extracted.diagnostics];
    const workItemCandidates: DesignFactNodeCandidate[] = ownerIndex.workItemNodes.map((node) => ({
      node,
      path: PathKey.create(String(node.attributes.descriptionPath)),
    }));
    const candidates = [...extracted.nodeCandidates, ...workItemCandidates];
    const collisionPaths = this.findCaseFoldCollisions(candidates, diagnostics);
    const pathAdmitted = candidates.filter((candidate) => !collisionPaths.has(candidate.path.toString()));
    const { admitted, duplicateNodeIds } = this.admitUniqueNodes(pathAdmitted, diagnostics);
    const nodeById = new Map(admitted.map((candidate) => [candidate.node.id.toString(), candidate.node]));
    const edges = [
      ...this.resolveWorkItemReferences(extracted.workItemReferences, nodeById, diagnostics),
      ...this.resolveReflections(extracted.reflectionReferences, nodeById, duplicateNodeIds, diagnostics),
    ];
    const uniqueEdges = [...groupBy(edges, (edge) => this.serializer.stringify(edge.toCanonicalValue())).values()].map(
      (entries) => entries[0],
    );

    return {
      nodes: admitted
        .map((candidate) => candidate.node)
        .sort((left, right) => compareStrings(left.id.toString(), right.id.toString())),
      edges: uniqueEdges.sort((left, right) =>
        compareStrings(
          this.serializer.stringify(left.toCanonicalValue()),
          this.serializer.stringify(right.toCanonicalValue()),
        ),
      ),
      diagnostics: diagnostics.sort((left, right) =>
        compareStrings(
          this.serializer.stringify(left.toCanonicalValue()),
          this.serializer.stringify(right.toCanonicalValue()),
        ),
      ),
    };
  }

  private findCaseFoldCollisions(
    candidates: readonly DesignFactNodeCandidate[],
    diagnostics: ExtractionDiagnostic[],
  ): ReadonlySet<string> {
    const pathsByFolded = new Map<string, Set<string>>();
    for (const candidate of candidates) {
      if (candidate.node.id.nodeType === "work-item") continue;
      const path = candidate.path.toString();
      const folded = path.toLowerCase();
      const paths = pathsByFolded.get(folded) ?? new Set<string>();
      paths.add(path);
      pathsByFolded.set(folded, paths);
    }
    const collisions = new Set<string>();
    for (const paths of pathsByFolded.values()) {
      if (paths.size < 2) continue;
      const candidatePaths = [...paths].sort(compareStrings);
      for (const path of candidatePaths) collisions.add(path);
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "case-fold-path-collision",
          path: PathKey.create(candidatePaths[0]),
          payload: { candidatePaths },
        }),
      );
    }
    return collisions;
  }

  private admitUniqueNodes(
    candidates: readonly DesignFactNodeCandidate[],
    diagnostics: ExtractionDiagnostic[],
  ): {
    readonly admitted: readonly DesignFactNodeCandidate[];
    readonly duplicateNodeIds: ReadonlySet<string>;
  } {
    const admitted: DesignFactNodeCandidate[] = [];
    const duplicateNodeIds = new Set<string>();
    for (const [nodeId, entries] of groupBy(candidates, (candidate) => candidate.node.id.toString())) {
      if (entries.length === 1) {
        admitted.push(entries[0]);
        continue;
      }
      duplicateNodeIds.add(nodeId);
      const candidatePaths = [...new Set(entries.map((entry) => entry.path.toString()))].sort(compareStrings);
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "duplicate-node-id",
          nodeId: entries[0].node.id,
          path: PathKey.create(candidatePaths[0]),
          payload: { candidatePaths, candidates: entries.length },
        }),
      );
    }
    return { admitted, duplicateNodeIds };
  }

  private resolveWorkItemReferences(
    references: readonly WorkItemReferenceCandidate[],
    nodeById: ReadonlyMap<string, WorldNode>,
    diagnostics: ExtractionDiagnostic[],
  ): readonly Edge[] {
    const result: Edge[] = [];
    for (const reference of references) {
      const source = nodeById.get(reference.sourceNodeId.toString());
      if (!source) continue;
      const workItemId = WorldNodeId.workItem(reference.workItemId);
      if (!nodeById.has(workItemId.toString())) {
        diagnostics.push(
          ExtractionDiagnostic.create({
            code: "unknown-work-item-reference",
            nodeId: reference.sourceNodeId,
            path: reference.path,
            line: reference.line,
            payload: { workItemId: reference.workItemId },
          }),
        );
        continue;
      }
      const role = reference.role.toString();
      const edge =
        role === "product"
          ? Edge.create({
              edgeType: DeclaredKey.create("reflected-in"),
              from: workItemId,
              to: reference.sourceNodeId,
              qualifier: { line: reference.line, path: reference.path.toString() },
            })
          : Edge.create({
              edgeType: DeclaredKey.create(role === "inception" ? "proposed-by" : "traces-to"),
              from: reference.sourceNodeId,
              to: workItemId,
              qualifier: { line: reference.line, path: reference.path.toString() },
            });
      result.push(edge);
    }
    return result;
  }

  private resolveReflections(
    references: readonly ReflectionReferenceCandidate[],
    nodeById: ReadonlyMap<string, WorldNode>,
    duplicateNodeIds: ReadonlySet<string>,
    diagnostics: ExtractionDiagnostic[],
  ): readonly Edge[] {
    const result: Edge[] = [];
    const groups = groupBy(
      references,
      (reference) => `${reference.sourceFragmentId.toString()}\u0000${reference.target}`,
    );
    for (const entries of groups.values()) {
      const reference = entries[0];
      if (entries.length > 1) {
        diagnostics.push(
          ExtractionDiagnostic.create({
            code: "duplicate-reflection-target",
            nodeId: reference.sourceFragmentId,
            path: reference.path,
            line: reference.line,
            payload: { candidates: entries.length, target: reference.target },
          }),
        );
        continue;
      }
      if (!nodeById.has(reference.sourceFragmentId.toString())) continue;
      const match = /^inception:(.+)$/.exec(reference.target);
      let targetId: WorldNodeId;
      try {
        if (!match) throw new Error("invalid role");
        targetId = WorldNodeId.fragment(CorpusRole.inception(), DeclaredKey.create(match[1]));
      } catch {
        diagnostics.push(
          ExtractionDiagnostic.create({
            code: "invalid-reflection-target",
            nodeId: reference.sourceFragmentId,
            path: reference.path,
            line: reference.line,
            payload: { target: reference.target },
          }),
        );
        continue;
      }
      if (duplicateNodeIds.has(targetId.toString())) {
        diagnostics.push(
          ExtractionDiagnostic.create({
            code: "ambiguous-reflection-target",
            nodeId: reference.sourceFragmentId,
            path: reference.path,
            line: reference.line,
            payload: { target: reference.target },
          }),
        );
        continue;
      }
      if (!nodeById.has(targetId.toString())) {
        diagnostics.push(
          ExtractionDiagnostic.create({
            code: "missing-reflection-target",
            nodeId: reference.sourceFragmentId,
            path: reference.path,
            line: reference.line,
            payload: { target: reference.target },
          }),
        );
        continue;
      }
      result.push(
        Edge.create({
          edgeType: DeclaredKey.create("reflected-as"),
          from: targetId,
          to: reference.sourceFragmentId,
          qualifier: { line: reference.line, path: reference.path.toString() },
        }),
      );
    }
    return result;
  }
}
