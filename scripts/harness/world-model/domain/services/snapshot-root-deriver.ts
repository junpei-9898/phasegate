// @unit world-model
// @layer domain
// @work-item-id WI-287
import type { Edge } from "../entities/edge.js";
import type { ExtractionDiagnostic } from "../entities/extraction-diagnostic.js";
import { Snapshot } from "../entities/snapshot.js";
import type { WorldNode } from "../entities/world-node.js";
import type { WorldHashingPort } from "../ports/world-hashing-port.js";
import { EvaluationId } from "../value-objects/evaluation-id.js";
import type { Sha256Digest } from "../value-objects/sha256-digest.js";
import type { WorldNodeId } from "../value-objects/world-node-id.js";
import type { CanonicalJsonObject, CanonicalJsonSerializer } from "./canonical-json-serializer.js";

export interface CorpusRootInput {
  readonly schemaVersion: string;
  readonly extractorVersion: string;
  readonly corpusConfigDigest: Sha256Digest;
  readonly nodes: readonly WorldNode[];
  readonly edges: readonly Edge[];
  readonly extractionDiagnostics: readonly ExtractionDiagnostic[];
}

export interface CanonicalDeclaration {
  readonly id: WorldNodeId;
  readonly value: CanonicalJsonObject;
}

export interface ConstraintRootInput {
  readonly schemaVersion: string;
  readonly rulesetVersion: string;
  readonly constraintConfigDigest: Sha256Digest;
  readonly constraints: readonly CanonicalDeclaration[];
  readonly explicitClaims: readonly CanonicalDeclaration[];
  readonly aliases: readonly CanonicalDeclaration[];
  readonly declarationDiagnostics: readonly ExtractionDiagnostic[];
}

export interface EvaluationIdInput {
  readonly schemaVersion: string;
  readonly rulesetVersion: string;
  readonly corpusRoot: Sha256Digest;
  readonly constraintRoot: Sha256Digest;
  readonly evaluationConfigDigest: Sha256Digest;
  readonly policyInputsDigest: Sha256Digest;
}

export interface RootDerivation {
  readonly root: Sha256Digest;
  readonly canonicalBytes: Uint8Array;
}

export interface EvaluationIdDerivation {
  readonly evaluationId: EvaluationId;
  readonly canonicalBytes: Uint8Array;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const compareTuples = (left: readonly string[], right: readonly string[]): number => {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const compared = compareStrings(left[index] ?? "", right[index] ?? "");
    if (compared !== 0) {
      return compared;
    }
  }
  return 0;
};

const assertVersion = (name: string, value: string): void => {
  if (value.trim().length === 0) {
    throw new Error(`${name} must not be empty`);
  }
};

export class SnapshotRootDeriver {
  constructor(
    private readonly serializer: CanonicalJsonSerializer,
    private readonly hashingPort: WorldHashingPort,
  ) {}

  private sortedNodes(input: readonly WorldNode[]): readonly WorldNode[] {
    return [...input].sort((left, right) => compareStrings(left.id.toString(), right.id.toString()));
  }

  private sortedEdges(input: readonly Edge[]): readonly Edge[] {
    return [...input].sort((left, right) =>
      compareTuples(
        [left.edgeType.toString(), left.from.toString(), left.to.toString(), this.serializer.stringify(left.qualifier)],
        [
          right.edgeType.toString(),
          right.from.toString(),
          right.to.toString(),
          this.serializer.stringify(right.qualifier),
        ],
      ),
    );
  }

  private sortedDiagnostics(input: readonly ExtractionDiagnostic[]): readonly ExtractionDiagnostic[] {
    return [...input].sort((left, right) =>
      compareTuples(
        [
          left.code,
          left.nodeId?.toString() ?? "",
          left.path?.toString() ?? "",
          String(left.line ?? 0).padStart(10, "0"),
          this.serializer.stringify(left.payload),
        ],
        [
          right.code,
          right.nodeId?.toString() ?? "",
          right.path?.toString() ?? "",
          String(right.line ?? 0).padStart(10, "0"),
          this.serializer.stringify(right.payload),
        ],
      ),
    );
  }

  private corpusProjection(input: CorpusRootInput): {
    readonly nodes: readonly WorldNode[];
    readonly edges: readonly Edge[];
    readonly diagnostics: readonly ExtractionDiagnostic[];
    readonly value: CanonicalJsonObject;
  } {
    assertVersion("schemaVersion", input.schemaVersion);
    assertVersion("extractorVersion", input.extractorVersion);
    const nodes = this.sortedNodes(input.nodes);
    const edges = this.sortedEdges(input.edges);
    const diagnostics = this.sortedDiagnostics(input.extractionDiagnostics);
    return {
      nodes,
      edges,
      diagnostics,
      value: {
        corpusConfigDigest: input.corpusConfigDigest.toString(),
        edges: edges.map((edge) => edge.toCanonicalValue()),
        extractionDiagnostics: diagnostics.map((diagnostic) => diagnostic.toCanonicalValue()),
        extractorVersion: input.extractorVersion,
        nodes: nodes.map((node) => node.toCanonicalValue()),
        schemaVersion: input.schemaVersion,
      },
    };
  }

  deriveCorpusRoot(input: CorpusRootInput): RootDerivation {
    const projection = this.corpusProjection(input);
    const canonicalBytes = this.serializer.serialize(projection.value);
    return Object.freeze({
      root: this.hashingPort.sha256(canonicalBytes),
      canonicalBytes,
    });
  }

  buildSnapshot(input: CorpusRootInput): Snapshot {
    const projection = this.corpusProjection(input);
    const canonicalBytes = this.serializer.serialize(projection.value);
    const corpusRoot = this.hashingPort.sha256(canonicalBytes);
    return Snapshot.create({
      schemaVersion: input.schemaVersion,
      extractorVersion: input.extractorVersion,
      corpusConfigDigest: input.corpusConfigDigest,
      nodes: projection.nodes,
      edges: projection.edges,
      extractionDiagnostics: projection.diagnostics,
      corpusRoot,
      canonicalBytes,
    });
  }

  private sortedDeclarations(declarations: readonly CanonicalDeclaration[]): readonly CanonicalDeclaration[] {
    return [...declarations].sort((left, right) => compareStrings(left.id.toString(), right.id.toString()));
  }

  deriveConstraintRoot(input: ConstraintRootInput): RootDerivation {
    assertVersion("schemaVersion", input.schemaVersion);
    assertVersion("rulesetVersion", input.rulesetVersion);
    const toValue = (declaration: CanonicalDeclaration): CanonicalJsonObject => ({
      id: declaration.id.toString(),
      value: declaration.value,
    });
    const projection: CanonicalJsonObject = {
      aliases: this.sortedDeclarations(input.aliases).map(toValue),
      constraintConfigDigest: input.constraintConfigDigest.toString(),
      constraints: this.sortedDeclarations(input.constraints).map(toValue),
      declarationDiagnostics: this.sortedDiagnostics(input.declarationDiagnostics).map((diagnostic) =>
        diagnostic.toCanonicalValue(),
      ),
      explicitClaims: this.sortedDeclarations(input.explicitClaims).map(toValue),
      rulesetVersion: input.rulesetVersion,
      schemaVersion: input.schemaVersion,
    };
    const canonicalBytes = this.serializer.serialize(projection);
    return Object.freeze({
      root: this.hashingPort.sha256(canonicalBytes),
      canonicalBytes,
    });
  }

  deriveEvaluationId(input: EvaluationIdInput): EvaluationIdDerivation {
    assertVersion("schemaVersion", input.schemaVersion);
    assertVersion("rulesetVersion", input.rulesetVersion);
    const projection: CanonicalJsonObject = {
      constraintRoot: input.constraintRoot.toString(),
      corpusRoot: input.corpusRoot.toString(),
      evaluationConfigDigest: input.evaluationConfigDigest.toString(),
      policyInputsDigest: input.policyInputsDigest.toString(),
      rulesetVersion: input.rulesetVersion,
      schemaVersion: input.schemaVersion,
    };
    const canonicalBytes = this.serializer.serialize(projection);
    return Object.freeze({
      evaluationId: EvaluationId.fromDigest(this.hashingPort.sha256(canonicalBytes)),
      canonicalBytes,
    });
  }
}
