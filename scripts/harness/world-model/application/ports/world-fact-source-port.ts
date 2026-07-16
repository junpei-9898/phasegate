// @unit world-model
// @layer application
// @work-item-id WI-291

import type { Edge } from "../../domain/entities/edge.js";
import type { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import type { WorldNode } from "../../domain/entities/world-node.js";

export interface WorldFactBatch {
  readonly nodes: readonly WorldNode[];
  readonly edges: readonly Edge[];
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

export interface WorldFactSourcePort {
  extract(): Promise<readonly WorldFactBatch[]>;
}
