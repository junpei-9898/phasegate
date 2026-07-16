// @unit world-model
// @layer infrastructure
// @work-item-id WI-290

import type { Edge } from "../../domain/entities/edge.js";
import type { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import type { WorldNode } from "../../domain/entities/world-node.js";

export interface RuntimeFactExtraction {
  readonly nodes: readonly WorldNode[];
  readonly edges: readonly Edge[];
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export const EMPTY_RUNTIME_FACT_EXTRACTION: RuntimeFactExtraction = Object.freeze({
  nodes: Object.freeze([]),
  edges: Object.freeze([]),
  diagnostics: Object.freeze([]),
});
