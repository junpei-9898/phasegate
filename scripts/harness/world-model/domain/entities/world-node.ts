// @unit world-model
// @layer domain
// @work-item-id WI-287
import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { ArtifactKind } from "../value-objects/artifact-kind.js";
import type { CorpusRole } from "../value-objects/corpus-role.js";
import type { DeclaredKey } from "../value-objects/declared-key.js";
import type { PathKey } from "../value-objects/path-key.js";
import type { Sha256Digest } from "../value-objects/sha256-digest.js";
import { WorldNodeId } from "../value-objects/world-node-id.js";

export type WorldNodeProjection =
  | {
      readonly type: "artifact";
      readonly artifactKind: string;
      readonly corpusRole: string;
      readonly pathKey: string;
    }
  | { readonly type: "source-file"; readonly pathKey: string }
  | {
      readonly type: "fragment";
      readonly identityMode: "explicit" | "legacy-whole-file";
      readonly corpusRole: string;
      readonly artifactId: string;
    }
  | { readonly type: "work-item"; readonly providerId: string };

interface CommonNodeProps {
  readonly digest: Sha256Digest;
  readonly attributes?: CanonicalJsonObject;
}

export interface ArtifactNodeProps extends CommonNodeProps {
  readonly artifactKind: ArtifactKind;
  readonly corpusRole: CorpusRole;
  readonly path: PathKey;
}

export interface SourceFileNodeProps extends CommonNodeProps {
  readonly path: PathKey;
}

export interface ExplicitFragmentNodeProps extends CommonNodeProps {
  readonly corpusRole: CorpusRole;
  readonly declaredKey: DeclaredKey;
  readonly artifactId: WorldNodeId;
}

export interface LegacyFragmentNodeProps extends CommonNodeProps {
  readonly artifactKind: ArtifactKind;
  readonly corpusRole: CorpusRole;
  readonly path: PathKey;
  readonly artifactId: WorldNodeId;
}

export interface WorkItemNodeProps extends CommonNodeProps {
  readonly workItemId: string;
}

export class InvalidWorldNodeError extends Error {
  constructor(message: string) {
    super(`Invalid World node: ${message}`);
    this.name = "InvalidWorldNodeError";
  }
}

export class WorldNode {
  readonly id: WorldNodeId;
  readonly contentDigest: Sha256Digest;
  readonly projection: WorldNodeProjection;
  readonly attributes: CanonicalJsonObject;

  private constructor(
    id: WorldNodeId,
    contentDigest: Sha256Digest,
    projection: WorldNodeProjection,
    attributes?: CanonicalJsonObject,
  ) {
    this.id = id;
    this.contentDigest = contentDigest;
    this.projection = Object.freeze({ ...projection });
    this.attributes = Object.freeze({ ...(attributes ?? {}) });
    Object.freeze(this);
  }

  static artifact(props: ArtifactNodeProps): WorldNode {
    const id = WorldNodeId.artifact(props.artifactKind, props.corpusRole, props.path);
    return new WorldNode(
      id,
      props.digest,
      {
        type: "artifact",
        artifactKind: props.artifactKind.toString(),
        corpusRole: props.corpusRole.toString(),
        pathKey: props.path.toString(),
      },
      props.attributes,
    );
  }

  static sourceFile(props: SourceFileNodeProps): WorldNode {
    return new WorldNode(
      WorldNodeId.sourceFile(props.path),
      props.digest,
      { type: "source-file", pathKey: props.path.toString() },
      props.attributes,
    );
  }

  static explicitFragment(props: ExplicitFragmentNodeProps): WorldNode {
    if (props.artifactId.nodeType !== "artifact") {
      throw new InvalidWorldNodeError("explicit Fragment parent must be an Artifact");
    }
    const parentRole = /^pgw:v1:artifact:[^:]+:([^:]+):/.exec(props.artifactId.toString())?.[1];
    if (parentRole !== props.corpusRole.toString()) {
      throw new InvalidWorldNodeError("explicit Fragment corpus role must match its parent Artifact");
    }
    return new WorldNode(
      WorldNodeId.fragment(props.corpusRole, props.declaredKey),
      props.digest,
      {
        type: "fragment",
        identityMode: "explicit",
        corpusRole: props.corpusRole.toString(),
        artifactId: props.artifactId.toString(),
      },
      props.attributes,
    );
  }

  static legacyFragment(props: LegacyFragmentNodeProps): WorldNode {
    const expectedArtifactId = WorldNodeId.artifact(props.artifactKind, props.corpusRole, props.path);
    if (!props.artifactId.equals(expectedArtifactId)) {
      throw new InvalidWorldNodeError("legacy Fragment parent does not match its artifact tuple");
    }
    return new WorldNode(
      WorldNodeId.legacyFragment(props.artifactKind, props.corpusRole, props.path),
      props.digest,
      {
        type: "fragment",
        identityMode: "legacy-whole-file",
        corpusRole: props.corpusRole.toString(),
        artifactId: props.artifactId.toString(),
      },
      props.attributes,
    );
  }

  static workItem(props: WorkItemNodeProps): WorldNode {
    return new WorldNode(
      WorldNodeId.workItem(props.workItemId),
      props.digest,
      { type: "work-item", providerId: props.workItemId },
      props.attributes,
    );
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      attributes: this.attributes,
      contentDigest: this.contentDigest.toString(),
      id: this.id.toString(),
      nodeType: this.id.nodeType,
      projection: this.projection as CanonicalJsonObject,
    };
  }
}
