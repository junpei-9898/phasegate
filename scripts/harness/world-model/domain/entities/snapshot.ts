// @unit world-model
// @layer domain
// @work-item-id WI-287

import type { EvaluationId } from "../value-objects/evaluation-id.js";
import type { Sha256Digest } from "../value-objects/sha256-digest.js";
import { WorldNodeId } from "../value-objects/world-node-id.js";
import type { Edge } from "./edge.js";
import type { ExtractionDiagnostic } from "./extraction-diagnostic.js";
import type { WorldNode } from "./world-node.js";

export interface SnapshotProps {
  readonly schemaVersion: string;
  readonly extractorVersion: string;
  readonly corpusConfigDigest: Sha256Digest;
  readonly nodes: readonly WorldNode[];
  readonly edges: readonly Edge[];
  readonly extractionDiagnostics: readonly ExtractionDiagnostic[];
  readonly corpusRoot: Sha256Digest;
  readonly canonicalBytes: Uint8Array;
  readonly constraintRoot?: Sha256Digest;
  readonly evaluationId?: EvaluationId;
}

export class Snapshot {
  readonly id: WorldNodeId;
  readonly schemaVersion: string;
  readonly extractorVersion: string;
  readonly corpusConfigDigest: Sha256Digest;
  readonly nodes: readonly WorldNode[];
  readonly edges: readonly Edge[];
  readonly extractionDiagnostics: readonly ExtractionDiagnostic[];
  readonly corpusRoot: Sha256Digest;
  readonly constraintRoot?: Sha256Digest;
  readonly evaluationId?: EvaluationId;
  private readonly canonicalBytesValue: Uint8Array;

  private constructor(props: SnapshotProps) {
    this.id = WorldNodeId.snapshot(props.corpusRoot);
    this.schemaVersion = props.schemaVersion;
    this.extractorVersion = props.extractorVersion;
    this.corpusConfigDigest = props.corpusConfigDigest;
    this.nodes = Object.freeze([...props.nodes]);
    this.edges = Object.freeze([...props.edges]);
    this.extractionDiagnostics = Object.freeze([...props.extractionDiagnostics]);
    this.corpusRoot = props.corpusRoot;
    this.canonicalBytesValue = Uint8Array.from(props.canonicalBytes);
    this.constraintRoot = props.constraintRoot;
    this.evaluationId = props.evaluationId;
    Object.freeze(this);
  }

  static create(props: SnapshotProps): Snapshot {
    return new Snapshot(props);
  }

  get canonicalBytes(): Uint8Array {
    return Uint8Array.from(this.canonicalBytesValue);
  }

  withEvaluationRoots(constraintRoot: Sha256Digest, evaluationId: EvaluationId): Snapshot {
    return new Snapshot({
      schemaVersion: this.schemaVersion,
      extractorVersion: this.extractorVersion,
      corpusConfigDigest: this.corpusConfigDigest,
      nodes: this.nodes,
      edges: this.edges,
      extractionDiagnostics: this.extractionDiagnostics,
      corpusRoot: this.corpusRoot,
      canonicalBytes: this.canonicalBytes,
      constraintRoot,
      evaluationId,
    });
  }
}
