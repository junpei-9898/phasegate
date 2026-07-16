// @unit world-model
// @layer infrastructure
// @work-item-id WI-290, WI-291

import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { TypeScriptSourceFactExtractor } from "./type-script-source-fact-extractor.js";

export interface TestReferenceSourceFactExtractorDeps {
  readonly rootDir: string;
  readonly hashingPort: WorldHashingPort;
  readonly sourceRoot?: string;
}

export class TestReferenceSourceFactExtractor extends TypeScriptSourceFactExtractor {
  constructor(deps: TestReferenceSourceFactExtractorDeps) {
    super({
      ...deps,
      sourceKind: "test",
      include: (relativePath) => relativePath.includes("/__tests__/"),
    });
  }
}
