// @unit world-model
// @layer infrastructure
// @work-item-id WI-290

import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { TypeScriptSourceFactExtractor } from "./type-script-source-fact-extractor.js";

export interface SourceMetadataFactExtractorDeps {
  readonly rootDir: string;
  readonly hashingPort: WorldHashingPort;
}

export class SourceMetadataFactExtractor extends TypeScriptSourceFactExtractor {
  constructor(deps: SourceMetadataFactExtractorDeps) {
    super({
      ...deps,
      sourceKind: "implementation",
      include: (relativePath) => !relativePath.includes("/__tests__/"),
    });
  }
}
