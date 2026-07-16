// @unit world-model
// @layer infrastructure
// @work-item-id WI-289, WI-291

import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import type { DesignFactSource } from "./design-fact-extraction.js";
import { FileSystemDesignFactScope, type MarkdownDesignFactExtractor } from "./markdown-design-fact-extractor.js";

export interface ProposalFactExtractorDeps {
  readonly rootDir: string;
  readonly markdownExtractor: MarkdownDesignFactExtractor;
  readonly inceptionRoot?: string;
}

export class ProposalFactExtractor extends FileSystemDesignFactScope implements DesignFactSource {
  constructor(deps: ProposalFactExtractorDeps) {
    super({
      rootDir: deps.rootDir,
      relativeRoot: deps.inceptionRoot ?? "docs/inception",
      role: CorpusRole.inception(),
      markdownExtractor: deps.markdownExtractor,
      include: (relativePath) => relativePath.endsWith(".md"),
      skip: () => false,
      metadata: (relativePath, ownerIndex) => ({
        ownerWorkItemId: ownerIndex.workItemIdByDescriptionPath.get(relativePath),
      }),
    });
  }
}
