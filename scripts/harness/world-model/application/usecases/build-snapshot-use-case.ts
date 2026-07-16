// @unit world-model
// @layer application
// @work-item-id WI-291

import type { Edge } from "../../domain/entities/edge.js";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import type { Snapshot } from "../../domain/entities/snapshot.js";
import type { WorldNode } from "../../domain/entities/world-node.js";
import type { CanonicalJsonSerializer } from "../../domain/services/canonical-json-serializer.js";
import type { SnapshotRootDeriver } from "../../domain/services/snapshot-root-deriver.js";
import type { Sha256Digest } from "../../domain/value-objects/sha256-digest.js";
import type { WorldFactSourcePort } from "../ports/world-fact-source-port.js";

export interface BuildSnapshotContract {
  execute(): Promise<Snapshot>;
}

export interface BuildSnapshotUseCaseDeps {
  readonly factSource: WorldFactSourcePort;
  readonly rootDeriver: SnapshotRootDeriver;
  readonly serializer: CanonicalJsonSerializer;
  readonly schemaVersion: string;
  readonly extractorVersion: string;
  readonly corpusConfigDigest: Sha256Digest;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export class BuildSnapshotUseCase implements BuildSnapshotContract {
  constructor(private readonly deps: BuildSnapshotUseCaseDeps) {}

  async execute(): Promise<Snapshot> {
    const batches = await this.deps.factSource.extract();
    const diagnostics = batches.flatMap((batch) => batch.diagnostics);
    const nodes = this.admitNodes(
      batches.flatMap((batch) => batch.nodes),
      diagnostics,
    );
    const edges = this.admitEdges(
      batches.flatMap((batch) => batch.edges),
      new Set(nodes.map((node) => node.id.toString())),
      diagnostics,
    );
    return this.deps.rootDeriver.buildSnapshot({
      schemaVersion: this.deps.schemaVersion,
      extractorVersion: this.deps.extractorVersion,
      corpusConfigDigest: this.deps.corpusConfigDigest,
      nodes,
      edges,
      extractionDiagnostics: diagnostics,
    });
  }

  private admitNodes(candidates: readonly WorldNode[], diagnostics: ExtractionDiagnostic[]): readonly WorldNode[] {
    const grouped = new Map<string, WorldNode[]>();
    for (const candidate of candidates) {
      const key = candidate.id.toString();
      grouped.set(key, [...(grouped.get(key) ?? []), candidate]);
    }
    const admitted: WorldNode[] = [];
    for (const [nodeId, entries] of [...grouped.entries()].sort(([left], [right]) => compareStrings(left, right))) {
      if (entries.length === 1) {
        admitted.push(entries[0]);
        continue;
      }
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "duplicate-node-id",
          nodeId: entries[0].id,
          payload: {
            candidates: entries.length,
            candidateFacts: entries
              .map((entry) => this.deps.serializer.stringify(entry.toCanonicalValue()))
              .sort(compareStrings),
            nodeId,
          },
        }),
      );
    }
    return admitted;
  }

  private admitEdges(
    candidates: readonly Edge[],
    nodeIds: ReadonlySet<string>,
    diagnostics: ExtractionDiagnostic[],
  ): readonly Edge[] {
    const unique = new Map<string, Edge>();
    for (const edge of candidates) {
      const key = this.deps.serializer.stringify(edge.toCanonicalValue());
      if (!unique.has(key)) unique.set(key, edge);
    }
    const admitted: Edge[] = [];
    for (const [edgeKey, edge] of [...unique.entries()].sort(([left], [right]) => compareStrings(left, right))) {
      const missingEndpoints = [edge.from.toString(), edge.to.toString()]
        .filter((endpoint) => !nodeIds.has(endpoint))
        .sort(compareStrings);
      if (missingEndpoints.length === 0) {
        admitted.push(edge);
        continue;
      }
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "missing-edge-endpoint",
          payload: { edge: edgeKey, missingEndpoints },
        }),
      );
    }
    return admitted;
  }
}
