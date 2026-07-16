// @unit world-model
// @layer infrastructure
// @work-item-id WI-289

import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import { WorldNode } from "../../domain/entities/world-node.js";
import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { TextContentNormalizer } from "../../domain/services/text-content-normalizer.js";
import { ArtifactKind } from "../../domain/value-objects/artifact-kind.js";
import type { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import { DeclaredKey } from "../../domain/value-objects/declared-key.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import type {
  DesignFactCandidateExtraction,
  DesignFactNodeCandidate,
  ReflectionReferenceCandidate,
  TraceabilityDesignFactIndex,
  WorkItemReferenceCandidate,
} from "./design-fact-extraction.js";

const FRAGMENT_MARKER = /^\s*<!--\s*@world-fragment-id\s+(\S+)\s*-->\s*$/;
const REFLECTION_MARKER = /^\s*<!--\s*@world-reflects\s+(\S+)\s*-->\s*$/;
const WORK_ITEM_MARKER = /^\s*<!--\s*@work-item-id\s+(.+?)\s*-->\s*$/;
const BARE_WORK_ITEM_MARKER = /^\s*@work-item-id\s+(.+?)\s*$/;
const MIGRATION_MARKER = /^\s*<!--\s*@world-fragment-migration\s+complete\s*-->\s*$/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

interface ParsedLine {
  readonly text: string;
  readonly line: number;
  readonly inFence: boolean;
}

interface FragmentPrelude {
  readonly markerIndex: number;
  readonly preludeStart: number;
  readonly preludeEnd: number;
  readonly headingIndex: number;
  readonly key: string;
  readonly headingLevel: number;
  readonly headingText: string;
  readonly workItemLines: readonly { readonly value: string; readonly line: number }[];
  readonly reflectionLines: readonly { readonly value: string; readonly line: number }[];
}

export interface MarkdownDesignFactInput {
  readonly path: PathKey;
  readonly role: CorpusRole;
  readonly bytes: Uint8Array;
  readonly unitId?: string;
  readonly storyIds?: readonly string[];
  readonly ownerWorkItemId?: string;
}

export interface MarkdownDesignFactExtractorDeps {
  readonly hashingPort: WorldHashingPort;
  readonly normalizer?: TextContentNormalizer;
}

const toParsedLines = (text: string): readonly ParsedLine[] => {
  const result: ParsedLine[] = [];
  let activeFence: "`" | "~" | null = null;
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const currentFence = activeFence;
    const fence = FENCE.exec(lines[index]);
    result.push({ text: lines[index], line: index + 1, inFence: currentFence !== null });
    if (!fence) continue;
    const character = fence[1][0] as "`" | "~";
    if (activeFence === null) activeFence = character;
    else if (activeFence === character) activeFence = null;
  }
  return result;
};

const isAllowedPreludeLine = (line: ParsedLine): boolean =>
  !line.inFence &&
  (FRAGMENT_MARKER.test(line.text) || REFLECTION_MARKER.test(line.text) || WORK_ITEM_MARKER.test(line.text));

const looksLikeMarkerDeclaration = (line: string, marker: string): boolean =>
  new RegExp(`^\\s*(?:<!--\\s*)?${marker}`).test(line);

const diagnostic = (
  code: string,
  pathKey: PathKey,
  line: number | undefined,
  payload: Record<string, string | number | boolean | null | readonly string[]>,
): ExtractionDiagnostic => ExtractionDiagnostic.create({ code, path: pathKey, line, payload });

const parseWorkItemIds = (value: string): readonly string[] => [...new Set(value.match(/\bWI-\d+\b/g) ?? [])];

const findFrontmatterEnd = (lines: readonly ParsedLine[]): number | null => {
  if (lines[0]?.text !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].text === "---") return index;
  }
  return null;
};

export class MarkdownDesignFactExtractor {
  private readonly hashingPort: WorldHashingPort;
  private readonly normalizer: TextContentNormalizer;

  constructor(deps: MarkdownDesignFactExtractorDeps) {
    this.hashingPort = deps.hashingPort;
    this.normalizer = deps.normalizer ?? new TextContentNormalizer();
  }

  extractFile(input: MarkdownDesignFactInput): DesignFactCandidateExtraction {
    const normalized = this.normalizer.normalize(input.bytes);
    if (!normalized.ok) {
      return {
        nodeCandidates: [],
        workItemReferences: [],
        reflectionReferences: [],
        diagnostics: [
          ExtractionDiagnostic.create({
            code: normalized.diagnostic.code,
            path: input.path,
            payload: normalized.diagnostic.payload,
          }),
        ],
      };
    }

    const lines = toParsedLines(normalized.text);
    const diagnostics: ExtractionDiagnostic[] = [];
    const preludes = this.parseFragmentPreludes(lines, input.path, diagnostics);
    const admittedPreludes = preludes
      .map((prelude) => {
        try {
          return { prelude, key: DeclaredKey.create(prelude.key) };
        } catch {
          diagnostics.push(
            diagnostic("malformed-fragment-marker", input.path, lines[prelude.markerIndex].line, {
              raw: lines[prelude.markerIndex].text,
            }),
          );
          return null;
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    const completion = this.parseMigrationCompletion(lines, input.path, admittedPreludes.length, diagnostics);
    const migrationState = completion ? "explicit" : preludes.length > 0 ? "mixed" : "whole-file";
    const artifactDigest = this.hashingPort.sha256(normalized.bytes);
    const artifact = WorldNode.artifact({
      artifactKind: ArtifactKind.designDocument(),
      corpusRole: input.role,
      path: input.path,
      digest: artifactDigest,
      attributes: {
        migrationState,
        ...(input.unitId === undefined ? {} : { unitId: input.unitId }),
        ...(input.storyIds === undefined ? {} : { storyIds: [...input.storyIds].sort(compareStrings) }),
        ...(input.ownerWorkItemId === undefined ? {} : { ownerWorkItemId: input.ownerWorkItemId }),
      },
    });
    const nodeCandidates: DesignFactNodeCandidate[] = [{ node: artifact, path: input.path }];
    const workItemReferences: WorkItemReferenceCandidate[] = [];
    const reflectionReferences: ReflectionReferenceCandidate[] = [];
    const boundWorkItemLines = new Set<number>();

    for (let index = 0; index < admittedPreludes.length; index += 1) {
      const { prelude, key } = admittedPreludes[index];
      const nextHeadingIndex = admittedPreludes[index + 1]?.prelude.headingIndex ?? lines.length;
      const fragmentBytes = new TextEncoder().encode(
        lines
          .slice(prelude.headingIndex, nextHeadingIndex)
          .map((line) => line.text)
          .join("\n"),
      );
      const fragment = WorldNode.explicitFragment({
        corpusRole: input.role,
        declaredKey: key,
        artifactId: artifact.id,
        digest: this.hashingPort.sha256(fragmentBytes),
        attributes: {
          locator: {
            endLine: nextHeadingIndex,
            headingLevel: prelude.headingLevel,
            headingLine: prelude.headingIndex + 1,
            headingText: prelude.headingText,
            markerLine: prelude.markerIndex + 1,
            startLine: prelude.headingIndex + 1,
          },
          migrationState,
        },
      });
      nodeCandidates.push({ node: fragment, path: input.path, line: prelude.markerIndex + 1 });

      for (const declaration of prelude.workItemLines) {
        boundWorkItemLines.add(declaration.line);
        this.appendWorkItemReferences(
          declaration.value,
          declaration.line,
          fragment.id,
          input,
          workItemReferences,
          diagnostics,
        );
      }
      for (const declaration of prelude.reflectionLines) {
        if (input.role.toString() !== "product") {
          diagnostics.push(
            diagnostic("invalid-reflection-source-role", input.path, declaration.line, {
              role: input.role.toString(),
              target: declaration.value,
            }),
          );
          continue;
        }
        reflectionReferences.push({
          sourceFragmentId: fragment.id,
          target: declaration.value,
          path: input.path,
          line: declaration.line,
        });
      }
    }

    if (!completion) {
      const legacy = WorldNode.legacyFragment({
        artifactKind: ArtifactKind.designDocument(),
        corpusRole: input.role,
        path: input.path,
        artifactId: artifact.id,
        digest: artifactDigest,
        attributes: {
          locator: { endLine: lines.length, startLine: 1 },
          migrationState,
        },
      });
      nodeCandidates.push({ node: legacy, path: input.path, line: 1 });
    }

    for (const line of lines) {
      if (line.inFence || boundWorkItemLines.has(line.line)) continue;
      const match = WORK_ITEM_MARKER.exec(line.text) ?? BARE_WORK_ITEM_MARKER.exec(line.text);
      if (match) {
        this.appendWorkItemReferences(match[1], line.line, artifact.id, input, workItemReferences, diagnostics);
      } else if (looksLikeMarkerDeclaration(line.text, "@work-item-id")) {
        diagnostics.push(diagnostic("malformed-work-item-reference", input.path, line.line, { raw: line.text }));
      }
      if (looksLikeMarkerDeclaration(line.text, "@world-reflects")) {
        if (!REFLECTION_MARKER.test(line.text)) {
          diagnostics.push(diagnostic("malformed-reflection-marker", input.path, line.line, { raw: line.text }));
        } else {
          const bound = preludes.some(
            (prelude) => line.line >= prelude.preludeStart + 1 && line.line <= prelude.preludeEnd + 1,
          );
          if (!bound)
            diagnostics.push(diagnostic("orphan-reflection-marker", input.path, line.line, { raw: line.text }));
        }
      }
    }

    return {
      nodeCandidates,
      workItemReferences,
      reflectionReferences,
      diagnostics: diagnostics.sort((left, right) => {
        const code = compareStrings(left.code, right.code);
        if (code !== 0) return code;
        return (left.line ?? 0) - (right.line ?? 0);
      }),
    };
  }

  private parseFragmentPreludes(
    lines: readonly ParsedLine[],
    pathKey: PathKey,
    diagnostics: ExtractionDiagnostic[],
  ): readonly FragmentPrelude[] {
    const result: FragmentPrelude[] = [];
    const processed = new Set<number>();
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.inFence) continue;
      if (looksLikeMarkerDeclaration(line.text, "@world-fragment-id") && !FRAGMENT_MARKER.test(line.text)) {
        diagnostics.push(diagnostic("malformed-fragment-marker", pathKey, line.line, { raw: line.text }));
        continue;
      }
      const marker = FRAGMENT_MARKER.exec(line.text);
      if (!marker || processed.has(index)) continue;

      let start = index;
      while (start > 0 && isAllowedPreludeLine(lines[start - 1])) start -= 1;
      let end = index;
      while (end + 1 < lines.length && isAllowedPreludeLine(lines[end + 1])) end += 1;
      for (let candidate = start; candidate <= end; candidate += 1) processed.add(candidate);
      const fragmentMarkers = lines.slice(start, end + 1).filter((candidate) => FRAGMENT_MARKER.test(candidate.text));
      const heading = lines[end + 1] ? HEADING.exec(lines[end + 1].text) : null;
      if (fragmentMarkers.length !== 1) {
        diagnostics.push(
          diagnostic("multiple-fragment-markers", pathKey, line.line, { candidates: fragmentMarkers.length }),
        );
        continue;
      }
      if (!heading) {
        diagnostics.push(diagnostic("orphan-fragment-marker", pathKey, line.line, { raw: line.text }));
        continue;
      }
      const workItemLines = lines.slice(start, end + 1).flatMap((candidate) => {
        const match = WORK_ITEM_MARKER.exec(candidate.text);
        return match ? [{ value: match[1], line: candidate.line }] : [];
      });
      const reflectionLines = lines.slice(start, end + 1).flatMap((candidate) => {
        const match = REFLECTION_MARKER.exec(candidate.text);
        return match ? [{ value: match[1], line: candidate.line }] : [];
      });
      result.push({
        markerIndex: index,
        preludeStart: start,
        preludeEnd: end,
        headingIndex: end + 1,
        key: marker[1],
        headingLevel: heading[1].length,
        headingText: heading[2],
        workItemLines,
        reflectionLines,
      });
    }
    return result.sort((left, right) => left.headingIndex - right.headingIndex);
  }

  private parseMigrationCompletion(
    lines: readonly ParsedLine[],
    pathKey: PathKey,
    fragmentCount: number,
    diagnostics: ExtractionDiagnostic[],
  ): boolean {
    const exact: ParsedLine[] = [];
    for (const line of lines) {
      if (line.inFence) continue;
      if (looksLikeMarkerDeclaration(line.text, "@world-fragment-migration") && !MIGRATION_MARKER.test(line.text)) {
        diagnostics.push(diagnostic("malformed-migration-marker", pathKey, line.line, { raw: line.text }));
      } else if (MIGRATION_MARKER.test(line.text)) exact.push(line);
    }
    if (exact.length === 0) return false;
    if (exact.length > 1) {
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "duplicate-migration-marker",
          path: pathKey,
          line: exact[0].line,
          payload: { candidates: exact.length },
        }),
      );
      return false;
    }
    const firstHeading = lines.findIndex((line) => !line.inFence && HEADING.test(line.text));
    const frontmatterEnd = findFrontmatterEnd(lines);
    const validPosition =
      frontmatterEnd === null
        ? firstHeading < 0 || exact[0].line - 1 < firstHeading
        : exact[0].line - 1 === frontmatterEnd + 1;
    if (!validPosition) {
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "misplaced-migration-marker",
          path: pathKey,
          line: exact[0].line,
          payload: {},
        }),
      );
      return false;
    }
    if (fragmentCount === 0) {
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "migration-complete-without-fragments",
          path: pathKey,
          line: exact[0].line,
          payload: {},
        }),
      );
      return false;
    }
    return true;
  }

  private appendWorkItemReferences(
    value: string,
    line: number,
    sourceNodeId: WorkItemReferenceCandidate["sourceNodeId"],
    input: MarkdownDesignFactInput,
    references: WorkItemReferenceCandidate[],
    diagnostics: ExtractionDiagnostic[],
  ): void {
    const workItemIds = parseWorkItemIds(value);
    if (workItemIds.length === 0) {
      diagnostics.push(diagnostic("malformed-work-item-reference", input.path, line, { raw: value }));
      return;
    }
    for (const workItemId of workItemIds) {
      references.push({ sourceNodeId, workItemId, role: input.role, path: input.path, line });
    }
  }
}

export interface FileSystemDesignFactScopeDeps {
  readonly rootDir: string;
  readonly relativeRoot: string;
  readonly role: CorpusRole;
  readonly markdownExtractor: MarkdownDesignFactExtractor;
  readonly include: (relativePath: string) => boolean;
  readonly skip: (relativePath: string) => boolean;
  readonly metadata: (
    relativePath: string,
    ownerIndex: TraceabilityDesignFactIndex,
  ) => Pick<MarkdownDesignFactInput, "unitId" | "storyIds" | "ownerWorkItemId">;
}

export class FileSystemDesignFactScope {
  private readonly deps: FileSystemDesignFactScopeDeps;

  constructor(deps: FileSystemDesignFactScopeDeps) {
    this.deps = deps;
  }

  async extract(ownerIndex: TraceabilityDesignFactIndex): Promise<DesignFactCandidateExtraction> {
    const result: {
      nodeCandidates: DesignFactNodeCandidate[];
      workItemReferences: WorkItemReferenceCandidate[];
      reflectionReferences: ReflectionReferenceCandidate[];
      diagnostics: ExtractionDiagnostic[];
    } = { nodeCandidates: [], workItemReferences: [], reflectionReferences: [], diagnostics: [] };
    const absoluteRoot = path.join(this.deps.rootDir, this.deps.relativeRoot);
    const visit = async (directory: string): Promise<void> => {
      let entries: Dirent[];
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        const relativePath = path.relative(this.deps.rootDir, directory).split(path.sep).join("/");
        result.diagnostics.push(
          ExtractionDiagnostic.create({
            code: "corpus-read-failure",
            path: PathKey.create(relativePath),
            payload: { message: error instanceof Error ? error.message : String(error) },
          }),
        );
        return;
      }
      entries.sort((left, right) => compareStrings(left.name, right.name));
      for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);
        const relativePath = path.relative(this.deps.rootDir, absolutePath).split(path.sep).join("/");
        if (entry.isDirectory()) {
          await visit(absolutePath);
          continue;
        }
        if (this.deps.skip(relativePath)) continue;
        const pathKey = PathKey.create(relativePath);
        if (entry.isSymbolicLink()) {
          result.diagnostics.push(diagnostic("unsupported-file-type", pathKey, undefined, { fileType: "symlink" }));
          continue;
        }
        if (!entry.isFile() || !this.deps.include(relativePath)) {
          result.diagnostics.push(
            diagnostic("unsupported-corpus-file", pathKey, undefined, { extension: path.extname(relativePath) }),
          );
          continue;
        }
        try {
          const extraction = this.deps.markdownExtractor.extractFile({
            path: pathKey,
            role: this.deps.role,
            bytes: await readFile(absolutePath),
            ...this.deps.metadata(relativePath, ownerIndex),
          });
          result.nodeCandidates.push(...extraction.nodeCandidates);
          result.workItemReferences.push(...extraction.workItemReferences);
          result.reflectionReferences.push(...extraction.reflectionReferences);
          result.diagnostics.push(...extraction.diagnostics);
        } catch (error) {
          result.diagnostics.push(
            diagnostic("corpus-read-failure", pathKey, undefined, {
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      }
    };
    await visit(absoluteRoot);
    return result;
  }
}
