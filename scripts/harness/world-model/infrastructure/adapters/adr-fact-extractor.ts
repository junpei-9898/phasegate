// @unit world-model
// @layer infrastructure
// @work-item-id WI-289

import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import type { DesignFactSource } from "./design-fact-extraction.js";
import { FileSystemDesignFactScope, type MarkdownDesignFactExtractor } from "./markdown-design-fact-extractor.js";

export interface AdrFactExtractorDeps {
  readonly rootDir: string;
  readonly markdownExtractor: MarkdownDesignFactExtractor;
}

export class AdrFactExtractor extends FileSystemDesignFactScope implements DesignFactSource {
  constructor(deps: AdrFactExtractorDeps) {
    super({
      rootDir: deps.rootDir,
      relativeRoot: "docs/ADR",
      role: CorpusRole.adr(),
      markdownExtractor: deps.markdownExtractor,
      include: (relativePath) => relativePath.endsWith(".md"),
      skip: () => false,
      metadata: () => ({}),
    });
  }
}
