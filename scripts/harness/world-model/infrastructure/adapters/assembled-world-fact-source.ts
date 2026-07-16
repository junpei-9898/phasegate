// @unit world-model
// @layer infrastructure
// @work-item-id WI-291

import type { WorldFactBatch, WorldFactSourcePort } from "../../application/ports/world-fact-source-port.js";

export interface WorldFactExtractorContract {
  extract(): Promise<WorldFactBatch>;
}

export class AssembledWorldFactSource implements WorldFactSourcePort {
  constructor(private readonly extractors: readonly WorldFactExtractorContract[]) {}

  async extract(): Promise<readonly WorldFactBatch[]> {
    return Promise.all(this.extractors.map((extractor) => extractor.extract()));
  }
}
