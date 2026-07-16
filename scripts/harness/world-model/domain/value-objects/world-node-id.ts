// @unit world-model
// @layer domain
// @work-item-id WI-287
import { ArtifactKind } from "./artifact-kind.js";
import { CorpusRole } from "./corpus-role.js";
import { DeclaredKey } from "./declared-key.js";
import { decodeWorldIdComponent, encodeWorldIdComponent, PathKey } from "./path-key.js";
import { Sha256Digest } from "./sha256-digest.js";

export type WorldNodeType =
  | "artifact"
  | "source-file"
  | "fragment"
  | "work-item"
  | "test-reference"
  | "explicit-claim"
  | "constraint"
  | "snapshot";

export type TestReferenceBinding = "ac" | "file";
export type TestReferenceType = "unit" | "it" | "scenario";

export interface TestReferenceIdInput {
  readonly storyId: string;
  readonly acId: string;
  readonly binding?: TestReferenceBinding;
  readonly testType: TestReferenceType;
  readonly filePath: PathKey;
  readonly testName?: string;
}

export class InvalidWorldNodeIdError extends Error {
  constructor(value: string) {
    super(`Invalid World node ID: "${value}"`);
    this.name = "InvalidWorldNodeIdError";
  }
}

const assertArtifactRole = (kind: ArtifactKind, role: CorpusRole): void => {
  const valid =
    (kind.value === "design-document" &&
      (role.value === "product" || role.value === "inception" || role.value === "adr")) ||
    (kind.value === "generated-artifact" && role.value === "generated") ||
    (kind.value === "external-declaration" && role.value === "external");
  if (!valid) {
    throw new InvalidWorldNodeIdError(`${kind.toString()}:${role.toString()}`);
  }
};

const reconstruct = (candidate: WorldNodeId, source: string): WorldNodeId => {
  if (candidate.toString() !== source) {
    throw new InvalidWorldNodeIdError(source);
  }
  return candidate;
};

export class WorldNodeId {
  readonly value: string;
  readonly nodeType: WorldNodeType;

  private constructor(value: string, nodeType: WorldNodeType) {
    this.value = value;
    this.nodeType = nodeType;
    Object.freeze(this);
  }

  static artifact(kind: ArtifactKind, role: CorpusRole, path: PathKey): WorldNodeId {
    assertArtifactRole(kind, role);
    return new WorldNodeId(
      `pgw:v1:artifact:${kind.toString()}:${role.toString()}:${path.toEncodedString()}`,
      "artifact",
    );
  }

  static sourceFile(path: PathKey): WorldNodeId {
    return new WorldNodeId(`pgw:v1:source-file:${path.toEncodedString()}`, "source-file");
  }

  static fragment(role: CorpusRole, key: DeclaredKey): WorldNodeId {
    return new WorldNodeId(`pgw:v1:fragment:${role.toString()}:${key.toString()}`, "fragment");
  }

  static legacyFragment(kind: ArtifactKind, role: CorpusRole, path: PathKey): WorldNodeId {
    assertArtifactRole(kind, role);
    return new WorldNodeId(
      `pgw:v1:fragment:legacy:${kind.toString()}:${role.toString()}:${path.toEncodedString()}`,
      "fragment",
    );
  }

  static workItem(workItemId: string): WorldNodeId {
    if (!/^WI-\d+$/.test(workItemId)) {
      throw new InvalidWorldNodeIdError(workItemId);
    }
    return new WorldNodeId(`pgw:v1:work-item:${workItemId}`, "work-item");
  }

  static testReference(input: TestReferenceIdInput): WorldNodeId {
    const binding = input.binding ?? "file";
    if (binding !== "ac" && binding !== "file") {
      throw new InvalidWorldNodeIdError(binding);
    }
    if (input.testType !== "unit" && input.testType !== "it" && input.testType !== "scenario") {
      throw new InvalidWorldNodeIdError(input.testType);
    }
    const storyId = encodeWorldIdComponent(input.storyId);
    const acId = encodeWorldIdComponent(input.acId);
    const nameKey = input.testName === undefined ? "none" : `value:${encodeWorldIdComponent(input.testName)}`;
    return new WorldNodeId(
      [
        "pgw:v1:test-reference",
        storyId,
        acId,
        binding,
        input.testType,
        input.filePath.toEncodedString(),
        "name",
        nameKey,
      ].join(":"),
      "test-reference",
    );
  }

  static explicitClaim(key: DeclaredKey): WorldNodeId {
    return new WorldNodeId(`pgw:v1:explicit-claim:${key.toString()}`, "explicit-claim");
  }

  static constraint(key: DeclaredKey): WorldNodeId {
    return new WorldNodeId(`pgw:v1:constraint:${key.toString()}`, "constraint");
  }

  static snapshot(corpusRoot: Sha256Digest): WorldNodeId {
    return new WorldNodeId(`pgw:v1:snapshot:${corpusRoot.toString()}`, "snapshot");
  }

  static parse(value: string): WorldNodeId {
    try {
      let match = /^pgw:v1:artifact:([^:]+):([^:]+):(.+)$/.exec(value);
      if (match) {
        return reconstruct(
          WorldNodeId.artifact(
            ArtifactKind.parse(match[1]),
            CorpusRole.parse(match[2]),
            PathKey.fromEncodedString(match[3]),
          ),
          value,
        );
      }

      match = /^pgw:v1:source-file:(.+)$/.exec(value);
      if (match) {
        return reconstruct(WorldNodeId.sourceFile(PathKey.fromEncodedString(match[1])), value);
      }

      match = /^pgw:v1:fragment:legacy:([^:]+):([^:]+):(.+)$/.exec(value);
      if (match) {
        return reconstruct(
          WorldNodeId.legacyFragment(
            ArtifactKind.parse(match[1]),
            CorpusRole.parse(match[2]),
            PathKey.fromEncodedString(match[3]),
          ),
          value,
        );
      }

      match = /^pgw:v1:fragment:([^:]+):(.+)$/.exec(value);
      if (match) {
        return reconstruct(WorldNodeId.fragment(CorpusRole.parse(match[1]), DeclaredKey.create(match[2])), value);
      }

      match = /^pgw:v1:work-item:(WI-\d+)$/.exec(value);
      if (match) {
        return reconstruct(WorldNodeId.workItem(match[1]), value);
      }

      match = /^pgw:v1:test-reference:([^:]+):([^:]+):(ac|file):(unit|it|scenario):(.+):name:(none|value:(.*))$/.exec(
        value,
      );
      if (match) {
        const testName = match[6] === "none" ? undefined : decodeWorldIdComponent(match[7]);
        return reconstruct(
          WorldNodeId.testReference({
            storyId: decodeWorldIdComponent(match[1]),
            acId: decodeWorldIdComponent(match[2]),
            binding: match[3] as TestReferenceBinding,
            testType: match[4] as TestReferenceType,
            filePath: PathKey.fromEncodedString(match[5]),
            testName,
          }),
          value,
        );
      }

      match = /^pgw:v1:explicit-claim:(.+)$/.exec(value);
      if (match) {
        return reconstruct(WorldNodeId.explicitClaim(DeclaredKey.create(match[1])), value);
      }

      match = /^pgw:v1:constraint:(.+)$/.exec(value);
      if (match) {
        return reconstruct(WorldNodeId.constraint(DeclaredKey.create(match[1])), value);
      }

      match = /^pgw:v1:snapshot:(sha256:[0-9a-f]{64})$/.exec(value);
      if (match) {
        return reconstruct(WorldNodeId.snapshot(Sha256Digest.create(match[1])), value);
      }
    } catch {
      throw new InvalidWorldNodeIdError(value);
    }
    throw new InvalidWorldNodeIdError(value);
  }

  equals(other: WorldNodeId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
