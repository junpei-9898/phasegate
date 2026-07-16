// @unit world-model
// @layer infrastructure
// @work-item-id WI-290

import type { RequirementTestMatrixDto } from "../../../nyquist-validation/index.js";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import { WorldNode } from "../../domain/entities/world-node.js";
import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { type CanonicalJsonObject, CanonicalJsonSerializer } from "../../domain/services/canonical-json-serializer.js";
import { ArtifactKind } from "../../domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import type { TestReferenceBinding, TestReferenceType } from "../../domain/value-objects/world-node-id.js";
import {
  assertExactKeys,
  OwnerProjectionError,
  projectionDiagnostic,
  readOptionalJson,
  requireArray,
  requireObject,
  requireString,
} from "./json-fact-extractor-support.js";
import type { RuntimeFactExtraction } from "./runtime-fact-extraction.js";

const DEFAULT_MATRIX_PATH = ".harness/requirement-test-matrix.json";
const SUPPORTED_VERSIONS = new Set(["1.0", "1.1"]);

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const compareAcIds = (left: string, right: string): number => {
  const leftNumber = /^AC-(\d+)$/.exec(left);
  const rightNumber = /^AC-(\d+)$/.exec(right);
  if (leftNumber && rightNumber) {
    const difference = Number(leftNumber[1]) - Number(rightNumber[1]);
    if (difference !== 0) return difference;
  }
  return compareStrings(left, right);
};

interface MatrixReferenceProjection {
  readonly storyId: string;
  readonly acId: string;
  readonly binding: TestReferenceBinding;
  readonly testType: TestReferenceType;
  readonly filePath: string;
  readonly testName: string | null;
}

interface MatrixProjection {
  readonly version: RequirementTestMatrixDto["version"];
  readonly stories: readonly {
    readonly storyId: string;
    readonly storyMappings: readonly {
      readonly acId: string;
      readonly testReferences: readonly MatrixReferenceProjection[];
    }[];
  }[];
}

export interface MatrixFactExtractorDeps {
  readonly rootDir: string;
  readonly hashingPort: WorldHashingPort;
  readonly matrixPath?: string;
  readonly serializer?: CanonicalJsonSerializer;
}

export class MatrixFactExtractor {
  private readonly deps: MatrixFactExtractorDeps;
  private readonly serializer: CanonicalJsonSerializer;

  constructor(deps: MatrixFactExtractorDeps) {
    this.deps = deps;
    this.serializer = deps.serializer ?? new CanonicalJsonSerializer();
  }

  async extract(): Promise<RuntimeFactExtraction> {
    const relativePath = this.deps.matrixPath ?? DEFAULT_MATRIX_PATH;
    const read = await readOptionalJson(this.deps.rootDir, relativePath, "matrix");
    if (read.state !== "present") {
      return { nodes: [], edges: [], diagnostics: [read.diagnostic] };
    }
    try {
      const projection = this.project(read.value);
      const artifact = WorldNode.artifact({
        artifactKind: ArtifactKind.generatedArtifact(),
        corpusRole: CorpusRole.generated(),
        path: read.path,
        digest: this.deps.hashingPort.sha256(this.serializer.serialize(projection)),
        attributes: projection as unknown as CanonicalJsonObject,
      });
      const candidates = projection.stories.flatMap((story) =>
        story.storyMappings.flatMap((mapping) =>
          mapping.testReferences.map((reference) =>
            WorldNode.testReference({
              storyId: reference.storyId,
              acId: reference.acId,
              binding: reference.binding,
              testType: reference.testType,
              filePath: PathKey.create(reference.filePath),
              testName: reference.testName ?? undefined,
              digest: this.deps.hashingPort.sha256(this.serializer.serialize(reference)),
              attributes: { matrixPath: relativePath },
            }),
          ),
        ),
      );
      const diagnostics: ExtractionDiagnostic[] = [];
      const references = this.admitUniqueReferences(candidates, read.path, diagnostics);
      return {
        nodes: [artifact, ...references].sort((left, right) => compareStrings(left.id.toString(), right.id.toString())),
        edges: [],
        diagnostics,
      };
    } catch (error) {
      return {
        nodes: [],
        edges: [],
        diagnostics: [projectionDiagnostic(read.path, "matrix", error)],
      };
    }
  }

  private project(value: unknown): MatrixProjection {
    const root = requireObject(value, "matrix");
    assertExactKeys(root, ["version", "generatedAt", "stories"], "matrix");
    const version = requireString(root.version, "matrix.version");
    if (!SUPPORTED_VERSIONS.has(version)) {
      throw new OwnerProjectionError("unsupported-provider-schema", `unsupported matrix version: ${version}`, {
        schemaVersion: version,
      });
    }
    requireString(root.generatedAt, "matrix.generatedAt");
    const stories = requireArray(root.stories, "matrix.stories").map((rawStory, storyIndex) => {
      const story = requireObject(rawStory, `matrix.stories[${storyIndex}]`);
      assertExactKeys(story, ["storyId", "storyMappings"], `matrix.stories[${storyIndex}]`);
      const storyId = requireString(story.storyId, `matrix.stories[${storyIndex}].storyId`);
      const storyMappings = requireArray(story.storyMappings, `matrix.stories[${storyIndex}].storyMappings`).map(
        (rawMapping, mappingIndex) => {
          const field = `matrix.stories[${storyIndex}].storyMappings[${mappingIndex}]`;
          const mapping = requireObject(rawMapping, field);
          assertExactKeys(mapping, ["acId", "testReferences"], field);
          const acId = requireString(mapping.acId, `${field}.acId`);
          const testReferences = requireArray(mapping.testReferences, `${field}.testReferences`).map(
            (rawReference, referenceIndex) =>
              this.projectReference(rawReference, `${field}.testReferences[${referenceIndex}]`, storyId, acId),
          );
          return {
            acId,
            testReferences: testReferences.sort((left, right) =>
              compareStrings(this.referenceKey(left), this.referenceKey(right)),
            ),
          };
        },
      );
      return {
        storyId,
        storyMappings: storyMappings.sort((left, right) => compareAcIds(left.acId, right.acId)),
      };
    });
    return {
      version,
      stories: stories.sort((left, right) => compareStrings(left.storyId, right.storyId)),
    };
  }

  private projectReference(value: unknown, field: string, storyId: string, acId: string): MatrixReferenceProjection {
    const reference = requireObject(value, field);
    assertExactKeys(reference, ["filePath", "testType", "testName", "binding"], field);
    const filePath = requireString(reference.filePath, `${field}.filePath`);
    PathKey.create(filePath);
    const testType = requireString(reference.testType, `${field}.testType`);
    if (testType !== "unit" && testType !== "it" && testType !== "scenario") {
      throw new OwnerProjectionError("malformed-provider-document", `${field}.testType is invalid`, {
        field: `${field}.testType`,
      });
    }
    const binding = reference.binding === undefined ? "file" : requireString(reference.binding, `${field}.binding`);
    if (binding !== "ac" && binding !== "file") {
      throw new OwnerProjectionError("malformed-provider-document", `${field}.binding is invalid`, {
        field: `${field}.binding`,
      });
    }
    const testName = reference.testName === undefined ? null : requireString(reference.testName, `${field}.testName`);
    return {
      storyId,
      acId,
      binding,
      testType,
      filePath,
      testName,
    };
  }

  private admitUniqueReferences(
    candidates: readonly WorldNode[],
    pathKey: PathKey,
    diagnostics: ExtractionDiagnostic[],
  ): readonly WorldNode[] {
    const groups = new Map<string, WorldNode[]>();
    for (const candidate of candidates) {
      const id = candidate.id.toString();
      const current = groups.get(id) ?? [];
      current.push(candidate);
      groups.set(id, current);
    }
    const admitted: WorldNode[] = [];
    for (const [id, entries] of groups) {
      if (entries.length === 1) {
        admitted.push(entries[0]);
        continue;
      }
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "duplicate-node-id",
          nodeId: entries[0].id,
          path: pathKey,
          payload: { candidates: entries.length, provider: "matrix", testReferenceId: id },
        }),
      );
    }
    return admitted;
  }

  private referenceKey(reference: MatrixReferenceProjection): string {
    return [
      reference.storyId,
      reference.acId,
      reference.binding,
      reference.testType,
      reference.filePath,
      reference.testName ?? "",
    ].join("\u0000");
  }
}
