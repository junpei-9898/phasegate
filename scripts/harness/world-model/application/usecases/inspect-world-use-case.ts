// @unit world-model
// @layer application
// @work-item-id WI-291

import type {
  WorldExtractionDiagnosticDto,
  WorldInspectionDto,
  WorldInventoryCountDto,
  WorldJsonObject,
} from "../dto/world-inspection-dto.js";
import type { BuildSnapshotContract } from "./build-snapshot-use-case.js";

export interface InspectWorldContract {
  execute(): Promise<WorldInspectionDto>;
}

export interface InspectWorldUseCaseDeps {
  readonly buildSnapshot: BuildSnapshotContract;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const countValues = (values: readonly string[]): readonly WorldInventoryCountDto[] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([value, count]) => ({ value, count }));
};

export class InspectWorldUseCase implements InspectWorldContract {
  constructor(private readonly deps: InspectWorldUseCaseDeps) {}

  async execute(): Promise<WorldInspectionDto> {
    const snapshot = await this.deps.buildSnapshot.execute();
    const nodes = snapshot.nodes
      .map((node) => node.toCanonicalValue() as WorldJsonObject)
      .sort((left, right) => compareStrings(String(left.id), String(right.id)));
    const edges = snapshot.edges
      .map((edge) => edge.toCanonicalValue() as WorldJsonObject)
      .sort((left, right) => compareStrings(JSON.stringify(left), JSON.stringify(right)));
    const diagnostics = snapshot.extractionDiagnostics
      .map((diagnostic) => diagnostic.toCanonicalValue() as WorldExtractionDiagnosticDto)
      .sort((left, right) => compareStrings(JSON.stringify(left), JSON.stringify(right)));
    const artifactNodes = snapshot.nodes.filter((node) => node.projection.type === "artifact");
    const hardDiagnosticCount = snapshot.extractionDiagnostics.filter(
      (diagnostic) => diagnostic.code !== "not-present",
    ).length;
    return {
      snapshotId: snapshot.id.toString(),
      schemaVersion: snapshot.schemaVersion,
      extractorVersion: snapshot.extractorVersion,
      corpusRoot: snapshot.corpusRoot.toString(),
      summary: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        diagnosticCount: diagnostics.length,
        hardDiagnosticCount,
      },
      inventory: {
        nodeTypes: countValues(snapshot.nodes.map((node) => node.id.nodeType)),
        corpusRoles: countValues(
          artifactNodes.map((node) => (node.projection.type === "artifact" ? node.projection.corpusRole : "")),
        ),
        artifactKinds: countValues(
          artifactNodes.map((node) => (node.projection.type === "artifact" ? node.projection.artifactKind : "")),
        ),
      },
      nodes,
      edges,
      diagnostics,
    };
  }
}
