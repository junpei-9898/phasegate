// @unit traceability-model
// @layer infrastructure
// @work-item-id WI-288

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  RawTraceabilityDiagnostic,
  RawTraceabilityStory,
  RawTraceabilityTestAnnotation,
  RawTraceabilityUnit,
  RawTraceabilityWorkItem,
  TraceabilityWorldReadSourceDto,
  TraceabilityWorldReadSourcePort,
} from "../../application/ports/traceability-world-read-source-port.js";
import type { MarkdownUnitDefinitionGateway } from "../gateways/markdown-unit-definition-gateway.js";
import { parseTestTags } from "../parsers/source-metadata-parser.js";
import { parseStoryCatalogEntries } from "../parsers/story-catalog-parser.js";
import { parseWorkItemFrontmatter } from "../parsers/work-item-frontmatter-parser.js";

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const toProjectRelativePath = (rootDir: string, absolutePath: string): string =>
  path.relative(rootDir, absolutePath).split(path.sep).join("/");

const collectFiles = async (rootDir: string, accept: (fileName: string) => boolean): Promise<readonly string[]> => {
  const result: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareStrings(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile() && accept(entry.name)) {
        result.push(absolutePath);
      }
    }
  };
  await visit(rootDir);
  return result;
};

const sourceDiagnostic = (
  code: string,
  subjectId: string | null,
  sourcePaths: readonly string[],
  error: unknown,
): RawTraceabilityDiagnostic => ({
  code,
  subjectId,
  sourcePaths,
  message: error instanceof Error ? error.message : String(error),
});

const classifyTestType = (filePath: string): RawTraceabilityTestAnnotation["testType"] => {
  if (filePath.includes("/e2e/") || filePath.includes("/scenario/")) {
    return "scenario";
  }
  if (filePath.includes("/integration/") || /\.it\.test\.[cm]?[jt]sx?$/.test(filePath)) {
    return "it";
  }
  return "unit";
};

export interface FileSystemTraceabilityWorldReadAdapterDeps {
  readonly rootDir: string;
  readonly productDocsRoot: string;
  readonly designDocsRoot: string;
  readonly storyCatalogPath: string;
  readonly inceptionRoot: string;
  readonly testRoots: readonly string[];
  readonly unitDefinitionGateway: MarkdownUnitDefinitionGateway;
}

export class FileSystemTraceabilityWorldReadAdapter implements TraceabilityWorldReadSourcePort {
  private readonly deps: FileSystemTraceabilityWorldReadAdapterDeps;

  constructor(deps: FileSystemTraceabilityWorldReadAdapterDeps) {
    this.deps = deps;
  }

  async read(): Promise<TraceabilityWorldReadSourceDto> {
    const diagnostics: RawTraceabilityDiagnostic[] = [];
    const [units, stories, workItems, testAnnotations] = await Promise.all([
      this.readUnits(diagnostics),
      this.readStories(diagnostics),
      this.readWorkItems(diagnostics),
      this.readTestAnnotations(diagnostics),
    ]);
    return {
      units,
      stories,
      workItems,
      testAnnotations,
      diagnostics,
    };
  }

  private async readUnits(diagnostics: RawTraceabilityDiagnostic[]): Promise<readonly RawTraceabilityUnit[]> {
    try {
      const unitIds = await this.deps.unitDefinitionGateway.getAllUnitNames();
      const result: RawTraceabilityUnit[] = [];
      for (const unitId of unitIds) {
        const constructionRoot = await this.deps.unitDefinitionGateway.findConstructionRoot(unitId);
        result.push({
          unitId,
          definitionPath: path.posix.join(this.deps.productDocsRoot, "units", `${unitId}_unit.md`),
          constructionRoot: constructionRoot?.value ?? null,
        });
      }
      return result;
    } catch (error) {
      diagnostics.push(
        sourceDiagnostic(
          "TM-WORLD-READ-UNIT-SOURCE-ERROR",
          null,
          [path.posix.join(this.deps.productDocsRoot, "units")],
          error,
        ),
      );
      return [];
    }
  }

  private async readStories(diagnostics: RawTraceabilityDiagnostic[]): Promise<readonly RawTraceabilityStory[]> {
    try {
      const absolutePath = path.join(this.deps.rootDir, this.deps.storyCatalogPath);
      const content = await readFile(absolutePath, "utf8");
      return parseStoryCatalogEntries(content).map((entry) => ({
        storyId: entry.storyId,
        legacyIds: [...entry.legacyIds],
        sourcePath: this.deps.storyCatalogPath,
        line: entry.lineNumber,
        acceptanceCriteria: entry.acceptanceCriteria.map((criterion) => ({
          acId: criterion.acId,
          line: criterion.lineNumber,
        })),
      }));
    } catch (error) {
      diagnostics.push(sourceDiagnostic("TM-WORLD-READ-STORY-SOURCE-ERROR", null, [this.deps.storyCatalogPath], error));
      return [];
    }
  }

  private async readWorkItems(diagnostics: RawTraceabilityDiagnostic[]): Promise<readonly RawTraceabilityWorkItem[]> {
    const absoluteRoot = path.join(this.deps.rootDir, this.deps.inceptionRoot);
    let files: readonly string[];
    try {
      files = await collectFiles(absoluteRoot, (fileName) => fileName === "description.md");
    } catch (error) {
      diagnostics.push(
        sourceDiagnostic("TM-WORLD-READ-WORK-ITEM-SOURCE-ERROR", null, [this.deps.inceptionRoot], error),
      );
      return [];
    }

    const result: RawTraceabilityWorkItem[] = [];
    for (const absolutePath of files) {
      const directoryId = path.basename(path.dirname(absolutePath));
      if (!/^WI-/.test(directoryId)) continue;
      const relativePath = toProjectRelativePath(this.deps.rootDir, absolutePath);
      try {
        const frontmatter = parseWorkItemFrontmatter(await readFile(absolutePath, "utf8"));
        if (!frontmatter) {
          diagnostics.push({
            code: "TM-WORLD-READ-MISSING-WORK-ITEM-FRONTMATTER",
            subjectId: directoryId,
            sourcePaths: [relativePath],
            message: `WorkItem ${directoryId} has no readable frontmatter`,
          });
          continue;
        }
        result.push({
          directoryId,
          workItemId: frontmatter.id,
          legacyId: frontmatter.legacyId ?? null,
          type: frontmatter.type,
          severity: frontmatter.severity ?? null,
          status: frontmatter.status ?? null,
          affects: [...(frontmatter.affects ?? [])],
          descriptionPath: relativePath,
        });
      } catch (error) {
        diagnostics.push(sourceDiagnostic("TM-WORLD-READ-WORK-ITEM-PARSE-ERROR", directoryId, [relativePath], error));
      }
    }
    return result;
  }

  private async readTestAnnotations(
    diagnostics: RawTraceabilityDiagnostic[],
  ): Promise<readonly RawTraceabilityTestAnnotation[]> {
    const result: RawTraceabilityTestAnnotation[] = [];
    for (const testRoot of this.deps.testRoots) {
      const absoluteRoot = path.join(this.deps.rootDir, testRoot);
      let files: readonly string[];
      try {
        files = await collectFiles(absoluteRoot, (fileName) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(fileName));
      } catch (error) {
        diagnostics.push(sourceDiagnostic("TM-WORLD-READ-TEST-SOURCE-ERROR", null, [testRoot], error));
        continue;
      }
      for (const absolutePath of files) {
        const relativePath = toProjectRelativePath(this.deps.rootDir, absolutePath);
        try {
          const tags = parseTestTags(await readFile(absolutePath, "utf8"));
          for (const tag of tags) {
            result.push({
              storyId: tag.value,
              filePath: relativePath,
              line: tag.lineNumber,
              testType: classifyTestType(relativePath),
            });
          }
        } catch (error) {
          diagnostics.push(sourceDiagnostic("TM-WORLD-READ-TEST-PARSE-ERROR", null, [relativePath], error));
        }
      }
    }
    return result;
  }
}
