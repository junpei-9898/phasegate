// @unit world-model
// @layer application
// @work-item-id WI-291

export type WorldJsonValue = null | boolean | number | string | readonly WorldJsonValue[] | WorldJsonObject;

export interface WorldJsonObject {
  readonly [key: string]: WorldJsonValue;
}

export interface WorldInventoryCountDto {
  readonly value: string;
  readonly count: number;
}

export interface WorldExtractionDiagnosticDto extends WorldJsonObject {
  readonly code: string;
  readonly line: number | null;
  readonly nodeId: string | null;
  readonly pathKey: string | null;
  readonly payload: WorldJsonObject;
}

export interface WorldInspectionDto {
  readonly snapshotId: string;
  readonly schemaVersion: string;
  readonly extractorVersion: string;
  readonly corpusRoot: string;
  readonly summary: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly diagnosticCount: number;
    readonly hardDiagnosticCount: number;
  };
  readonly inventory: {
    readonly nodeTypes: readonly WorldInventoryCountDto[];
    readonly corpusRoles: readonly WorldInventoryCountDto[];
    readonly artifactKinds: readonly WorldInventoryCountDto[];
  };
  readonly nodes: readonly WorldJsonObject[];
  readonly edges: readonly WorldJsonObject[];
  readonly diagnostics: readonly WorldExtractionDiagnosticDto[];
}
