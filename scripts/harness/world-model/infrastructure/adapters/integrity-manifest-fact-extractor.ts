// @unit world-model
// @layer infrastructure
// @work-item-id WI-290

import { WorldNode } from "../../domain/entities/world-node.js";
import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { type CanonicalJsonObject, CanonicalJsonSerializer } from "../../domain/services/canonical-json-serializer.js";
import { ArtifactKind } from "../../domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import {
  assertExactKeys,
  OwnerProjectionError,
  projectionDiagnostic,
  readOptionalJson,
  requireObject,
  requireString,
} from "./json-fact-extractor-support.js";
import type { RuntimeFactExtraction } from "./runtime-fact-extraction.js";

const DEFAULT_INTEGRITY_PATH = "phasegate.integrity.json";
const RAW_SHA256 = /^[0-9a-f]{64}$/;
const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

interface IntegrityProjection {
  readonly version: 1;
  readonly algorithm: "sha256";
  readonly declarations: readonly {
    readonly path: string;
    readonly digest: string;
  }[];
}

export interface IntegrityManifestFactExtractorDeps {
  readonly rootDir: string;
  readonly hashingPort: WorldHashingPort;
  readonly manifestPath?: string;
  readonly serializer?: CanonicalJsonSerializer;
}

export class IntegrityManifestFactExtractor {
  private readonly deps: IntegrityManifestFactExtractorDeps;
  private readonly serializer: CanonicalJsonSerializer;

  constructor(deps: IntegrityManifestFactExtractorDeps) {
    this.deps = deps;
    this.serializer = deps.serializer ?? new CanonicalJsonSerializer();
  }

  async extract(): Promise<RuntimeFactExtraction> {
    const relativePath = this.deps.manifestPath ?? DEFAULT_INTEGRITY_PATH;
    const read = await readOptionalJson(this.deps.rootDir, relativePath, "integrity");
    if (read.state !== "present") {
      return { nodes: [], edges: [], diagnostics: [read.diagnostic] };
    }
    try {
      const projection = this.project(read.value);
      const artifact = WorldNode.artifact({
        artifactKind: ArtifactKind.externalDeclaration(),
        corpusRole: CorpusRole.external(),
        path: read.path,
        digest: this.deps.hashingPort.sha256(this.serializer.serialize(projection)),
        attributes: projection as unknown as CanonicalJsonObject,
      });
      return { nodes: [artifact], edges: [], diagnostics: [] };
    } catch (error) {
      return {
        nodes: [],
        edges: [],
        diagnostics: [projectionDiagnostic(read.path, "integrity", error)],
      };
    }
  }

  private project(value: unknown): IntegrityProjection {
    const root = requireObject(value, "integrity");
    assertExactKeys(root, ["version", "algorithm", "files"], "integrity");
    if (root.version !== 1 || root.algorithm !== "sha256") {
      throw new OwnerProjectionError("unsupported-provider-schema", "unsupported integrity schema", {
        algorithm: typeof root.algorithm === "string" ? root.algorithm : null,
        version: typeof root.version === "number" ? root.version : -1,
      });
    }
    const files = requireObject(root.files, "integrity.files");
    const declarations = Object.entries(files).map(([filePath, rawDigest]) => {
      PathKey.create(filePath);
      const digest = requireString(rawDigest, `integrity.files.${filePath}`);
      if (!RAW_SHA256.test(digest)) {
        throw new OwnerProjectionError("malformed-provider-document", `integrity digest is invalid for ${filePath}`, {
          filePath,
        });
      }
      return { path: filePath, digest: `sha256:${digest}` };
    });
    return {
      version: 1,
      algorithm: "sha256",
      declarations: declarations.sort((left, right) => compareStrings(left.path, right.path)),
    };
  }
}
