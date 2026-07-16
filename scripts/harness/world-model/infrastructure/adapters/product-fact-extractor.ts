// @unit world-model
// @layer infrastructure
// @work-item-id WI-289, WI-291

import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import type { DesignFactSource } from "./design-fact-extraction.js";
import { FileSystemDesignFactScope, type MarkdownDesignFactExtractor } from "./markdown-design-fact-extractor.js";

export interface ProductFactExtractorDeps {
  readonly rootDir: string;
  readonly markdownExtractor: MarkdownDesignFactExtractor;
  readonly productRoot?: string;
}

export class ProductFactExtractor extends FileSystemDesignFactScope implements DesignFactSource {
  constructor(deps: ProductFactExtractorDeps) {
    super({
      rootDir: deps.rootDir,
      relativeRoot: deps.productRoot ?? "docs/product",
      role: CorpusRole.product(),
      markdownExtractor: deps.markdownExtractor,
      include: (relativePath) => relativePath.endsWith(".md"),
      skip: (relativePath) => /\/units\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*_unit\.md$/.test(relativePath),
      metadata: (relativePath, ownerIndex) => ({
        storyIds: ownerIndex.storyIdsBySourcePath.get(relativePath),
      }),
    });
  }
}
