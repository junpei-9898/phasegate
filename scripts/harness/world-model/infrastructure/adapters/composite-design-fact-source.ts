// @unit world-model
// @layer infrastructure
// @work-item-id WI-291

import type {
  DesignFactCandidateExtraction,
  DesignFactSource,
  TraceabilityDesignFactIndex,
} from "./design-fact-extraction.js";

export class CompositeDesignFactSource implements DesignFactSource {
  constructor(private readonly sources: readonly DesignFactSource[]) {}

  async extract(ownerIndex: TraceabilityDesignFactIndex): Promise<DesignFactCandidateExtraction> {
    const results = await Promise.all(this.sources.map((source) => source.extract(ownerIndex)));
    return {
      nodeCandidates: results.flatMap((result) => result.nodeCandidates),
      workItemReferences: results.flatMap((result) => result.workItemReferences),
      reflectionReferences: results.flatMap((result) => result.reflectionReferences),
      diagnostics: results.flatMap((result) => result.diagnostics),
    };
  }
}
