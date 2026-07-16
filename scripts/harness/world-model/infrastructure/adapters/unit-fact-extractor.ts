// @unit world-model
// @layer infrastructure
// @work-item-id WI-289

import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import type {
  DesignFactCandidateExtraction,
  DesignFactSource,
  TraceabilityDesignFactIndex,
} from "./design-fact-extraction.js";
import { FileSystemDesignFactScope, type MarkdownDesignFactExtractor } from "./markdown-design-fact-extractor.js";

export interface UnitFactExtractorDeps {
  readonly rootDir: string;
  readonly markdownExtractor: MarkdownDesignFactExtractor;
}

export class UnitFactExtractor extends FileSystemDesignFactScope implements DesignFactSource {
  constructor(deps: UnitFactExtractorDeps) {
    super({
      rootDir: deps.rootDir,
      relativeRoot: "docs/product/units",
      role: CorpusRole.product(),
      markdownExtractor: deps.markdownExtractor,
      include: (relativePath) => /\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*_unit\.md$/.test(relativePath),
      skip: (relativePath) => !/\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*_unit\.md$/.test(relativePath),
      metadata: (relativePath, ownerIndex) => ({
        unitId: ownerIndex.unitIdByDefinitionPath.get(relativePath),
      }),
    });
  }

  override async extract(ownerIndex: TraceabilityDesignFactIndex): Promise<DesignFactCandidateExtraction> {
    const extracted = await super.extract(ownerIndex);
    const invalidPaths = new Map<string, "noncanonical-unit-definition-path" | "unknown-unit-definition-owner">();
    for (const candidate of extracted.nodeCandidates) {
      if (candidate.node.projection.type !== "artifact") continue;
      const fileName = candidate.path.toString().split("/").at(-1) ?? "";
      if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*_unit\.md$/.test(fileName)) {
        invalidPaths.set(candidate.path.toString(), "noncanonical-unit-definition-path");
      } else if (candidate.node.attributes.unitId === undefined) {
        invalidPaths.set(candidate.path.toString(), "unknown-unit-definition-owner");
      }
    }
    const diagnostics = [...extracted.diagnostics];
    for (const [invalidPath, code] of invalidPaths) {
      const candidate = extracted.nodeCandidates.find((entry) => entry.path.toString() === invalidPath);
      if (candidate) {
        diagnostics.push(
          ExtractionDiagnostic.create({
            code,
            path: candidate.path,
            payload: { fileName: invalidPath.split("/").at(-1) ?? invalidPath },
          }),
        );
      }
    }
    return {
      nodeCandidates: extracted.nodeCandidates.filter((candidate) => !invalidPaths.has(candidate.path.toString())),
      workItemReferences: extracted.workItemReferences.filter(
        (reference) => !invalidPaths.has(reference.path.toString()),
      ),
      reflectionReferences: extracted.reflectionReferences.filter(
        (reference) => !invalidPaths.has(reference.path.toString()),
      ),
      diagnostics,
    };
  }
}
