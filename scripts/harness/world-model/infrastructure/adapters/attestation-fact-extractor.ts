// @unit world-model
// @layer infrastructure
// @work-item-id WI-290
// @work-item-id WI-306

import type {
  AttestationDocument,
  VerifyAttestationHandler,
  VerifyAttestationOutput,
} from "../../../attestation/index.js";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import { WorldNode } from "../../domain/entities/world-node.js";
import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { type CanonicalJsonObject, CanonicalJsonSerializer } from "../../domain/services/canonical-json-serializer.js";
import { ArtifactKind } from "../../domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import {
  assertExactKeys,
  OwnerProjectionError,
  projectionDiagnostic,
  readOptionalJson,
  requireArray,
  requireBoolean,
  requireObject,
  requireString,
} from "./json-fact-extractor-support.js";
import type { RuntimeFactExtraction } from "./runtime-fact-extraction.js";

const DEFAULT_ATTESTATION_PATH = ".harness/attestation.json";
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export interface AttestationVerificationFacade {
  verify(filePath: string): Promise<VerifyAttestationOutput>;
}

export class AttestationVerificationHandlerAdapter implements AttestationVerificationFacade {
  constructor(private readonly handler: Pick<VerifyAttestationHandler, "handle">) {}

  async verify(filePath: string): Promise<VerifyAttestationOutput> {
    const result = await this.handler.handle({ file: filePath, emitJson: true });
    const parsed = JSON.parse(result.output) as VerifyAttestationOutput;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.ok !== "boolean" ||
      typeof parsed.checks !== "object" ||
      parsed.checks === null ||
      !Array.isArray(parsed.mismatches)
    ) {
      throw new Error("public attestation verify handler returned an invalid DTO");
    }
    return parsed;
  }
}

export interface AttestationFactExtractorDeps {
  readonly rootDir: string;
  readonly hashingPort: WorldHashingPort;
  readonly verificationFacade: AttestationVerificationFacade;
  readonly attestationPath?: string;
  readonly serializer?: CanonicalJsonSerializer;
}

export class AttestationFactExtractor {
  private readonly deps: AttestationFactExtractorDeps;
  private readonly serializer: CanonicalJsonSerializer;

  constructor(deps: AttestationFactExtractorDeps) {
    this.deps = deps;
    this.serializer = deps.serializer ?? new CanonicalJsonSerializer();
  }

  async extract(): Promise<RuntimeFactExtraction> {
    const relativePath = this.deps.attestationPath ?? DEFAULT_ATTESTATION_PATH;
    const read = await readOptionalJson(this.deps.rootDir, relativePath, "attestation");
    if (read.state !== "present") {
      return { nodes: [], edges: [], diagnostics: [read.diagnostic] };
    }
    try {
      const document = this.parseDocument(read.value);
      let verification: VerifyAttestationOutput;
      try {
        verification = await this.deps.verificationFacade.verify(relativePath);
      } catch (error) {
        return {
          nodes: [],
          edges: [],
          diagnostics: [
            ExtractionDiagnostic.create({
              code: "attestation-verification-failure",
              path: read.path,
              payload: { message: error instanceof Error ? error.message : String(error) },
            }),
          ],
        };
      }
      const projection = this.project(document, verification);
      const artifact = WorldNode.artifact({
        artifactKind: ArtifactKind.generatedArtifact(),
        corpusRole: CorpusRole.generated(),
        path: read.path,
        digest: this.deps.hashingPort.sha256(this.serializer.serialize(projection)),
        attributes: projection as unknown as CanonicalJsonObject,
      });
      return { nodes: [artifact], edges: [], diagnostics: [] };
    } catch (error) {
      return {
        nodes: [],
        edges: [],
        diagnostics: [projectionDiagnostic(read.path, "attestation", error)],
      };
    }
  }

  private parseDocument(value: unknown): AttestationDocument {
    const root = requireObject(value, "attestation");
    const schemaVersion = requireString(root.schemaVersion, "attestation.schemaVersion");
    const isV2 = schemaVersion === "phasegate-attestation/v2";
    assertExactKeys(
      root,
      [
        "schemaVersion",
        "predicateType",
        "subject",
        "inputs",
        "granularity",
        "acBoundScope",
        "metadata",
        "signature",
        ...(isV2 ? ["worldSnapshotRoot"] : []),
      ],
      "attestation",
    );
    if (schemaVersion !== "phasegate-attestation/v1" && !isV2) {
      throw new OwnerProjectionError(
        "unsupported-provider-schema",
        `unsupported attestation schema: ${schemaVersion}`,
        { schemaVersion },
      );
    }
    const predicateType = requireString(root.predicateType, "attestation.predicateType");
    const expectedPredicate = `https://phasegate.dev/attestation/gate-run/${isV2 ? "v2" : "v1"}`;
    if (predicateType !== expectedPredicate) {
      throw new OwnerProjectionError("malformed-provider-document", "attestation predicateType is inconsistent");
    }
    const worldSnapshotRoot = isV2 ? requireString(root.worldSnapshotRoot, "attestation.worldSnapshotRoot") : undefined;
    if (worldSnapshotRoot !== undefined) this.assertDigest(worldSnapshotRoot, "attestation.worldSnapshotRoot");

    const subject = requireObject(root.subject, "attestation.subject");
    assertExactKeys(subject, ["command", "gateResult", "validatorSet"], "attestation.subject");
    const command = requireString(subject.command, "attestation.subject.command");
    const gateResultRaw = requireString(subject.gateResult, "attestation.subject.gateResult");
    if (gateResultRaw !== "pass" && gateResultRaw !== "fail") {
      throw new OwnerProjectionError("malformed-provider-document", "attestation gateResult is invalid");
    }
    const gateResult: "pass" | "fail" = gateResultRaw;
    const validatorSet = requireArray(subject.validatorSet, "attestation.subject.validatorSet").map((raw, index) => {
      const field = `attestation.subject.validatorSet[${index}]`;
      const outcome = requireObject(raw, field);
      assertExactKeys(outcome, ["validatorId", "passed", "skipped"], field);
      return {
        validatorId: requireString(outcome.validatorId, `${field}.validatorId`),
        passed: requireBoolean(outcome.passed, `${field}.passed`),
        skipped: requireBoolean(outcome.skipped, `${field}.skipped`),
      };
    });

    const inputs = requireObject(root.inputs, "attestation.inputs");
    assertExactKeys(inputs, ["digestAlgorithm", "sources", "inputDigest"], "attestation.inputs");
    if (inputs.digestAlgorithm !== "sha256") {
      throw new OwnerProjectionError("malformed-provider-document", "attestation digestAlgorithm is invalid");
    }
    const sources = requireArray(inputs.sources, "attestation.inputs.sources").map((raw, index) => {
      const field = `attestation.inputs.sources[${index}]`;
      const source = requireObject(raw, field);
      assertExactKeys(source, ["path", "digest"], field);
      const digest = requireString(source.digest, `${field}.digest`);
      this.assertDigest(digest, `${field}.digest`);
      return {
        path: requireString(source.path, `${field}.path`),
        digest,
      };
    });
    const inputDigest = requireString(inputs.inputDigest, "attestation.inputs.inputDigest");
    this.assertDigest(inputDigest, "attestation.inputs.inputDigest");

    const granularity = requireObject(root.granularity, "attestation.granularity");
    assertExactKeys(granularity, ["traceability"], "attestation.granularity");
    const traceability = requireObject(granularity.traceability, "attestation.granularity.traceability");
    assertExactKeys(
      traceability,
      ["validator", "level", "claim", "knownLimitations"],
      "attestation.granularity.traceability",
    );
    const levelRaw = requireString(traceability.level, "attestation.granularity.traceability.level");
    if (levelRaw !== "file" && levelRaw !== "ac") {
      throw new OwnerProjectionError("malformed-provider-document", "attestation granularity level is invalid");
    }
    const level: "file" | "ac" = levelRaw;
    const knownLimitations = requireArray(
      traceability.knownLimitations,
      "attestation.granularity.traceability.knownLimitations",
    ).map((item, index) => requireString(item, `attestation.granularity.traceability.knownLimitations[${index}]`));
    const acBoundScope = requireArray(root.acBoundScope, "attestation.acBoundScope").map((item, index) =>
      requireString(item, `attestation.acBoundScope[${index}]`),
    );

    const metadata = requireObject(root.metadata, "attestation.metadata");
    assertExactKeys(metadata, ["producedAt", "producer", "gitCommit"], "attestation.metadata");
    const gitCommit =
      metadata.gitCommit === null ? null : requireString(metadata.gitCommit, "attestation.metadata.gitCommit");

    const signature = requireObject(root.signature, "attestation.signature");
    assertExactKeys(signature, ["mode", "attestationDigest", "algorithm", "keyId", "value"], "attestation.signature");
    const modeRaw = requireString(signature.mode, "attestation.signature.mode");
    if (modeRaw !== "unsigned-poc" && modeRaw !== "signed") {
      throw new OwnerProjectionError("malformed-provider-document", "attestation signature mode is invalid");
    }
    const mode: "unsigned-poc" | "signed" = modeRaw;
    const attestationDigest = requireString(signature.attestationDigest, "attestation.signature.attestationDigest");
    this.assertDigest(attestationDigest, "attestation.signature.attestationDigest");
    const nullableString = (candidate: unknown, field: string): string | null =>
      candidate === null ? null : requireString(candidate, field);

    const common = {
      subject: { command, gateResult, validatorSet },
      inputs: {
        digestAlgorithm: "sha256" as const,
        sources,
        inputDigest,
      },
      granularity: {
        traceability: {
          validator: requireString(traceability.validator, "attestation.granularity.traceability.validator"),
          level,
          claim: requireString(traceability.claim, "attestation.granularity.traceability.claim"),
          knownLimitations,
        },
      },
      acBoundScope,
      metadata: {
        producedAt: requireString(metadata.producedAt, "attestation.metadata.producedAt"),
        producer: requireString(metadata.producer, "attestation.metadata.producer"),
        gitCommit,
      },
      signature: {
        mode,
        attestationDigest,
        algorithm: nullableString(signature.algorithm, "attestation.signature.algorithm"),
        keyId: nullableString(signature.keyId, "attestation.signature.keyId"),
        value: nullableString(signature.value, "attestation.signature.value"),
      },
    };
    if (isV2) {
      if (worldSnapshotRoot === undefined) {
        throw new OwnerProjectionError("malformed-provider-document", "attestation v2 root is missing");
      }
      return {
        ...common,
        schemaVersion: "phasegate-attestation/v2",
        predicateType: "https://phasegate.dev/attestation/gate-run/v2",
        worldSnapshotRoot,
      };
    }
    return {
      ...common,
      schemaVersion: "phasegate-attestation/v1",
      predicateType: "https://phasegate.dev/attestation/gate-run/v1",
    };
  }

  private project(document: AttestationDocument, verification: VerifyAttestationOutput): CanonicalJsonObject {
    return {
      schemaVersion: document.schemaVersion,
      predicateType: document.predicateType,
      subject: {
        command: document.subject.command,
        gateResult: document.subject.gateResult,
        validatorSet: [...document.subject.validatorSet]
          .sort((left, right) => compareStrings(left.validatorId, right.validatorId))
          .map((outcome) => ({
            validatorId: outcome.validatorId,
            passed: outcome.passed,
            skipped: outcome.skipped,
          })),
      },
      inputs: {
        digestAlgorithm: document.inputs.digestAlgorithm,
        sources: document.inputs.sources
          .filter((source) => source.path !== "git:HEAD")
          .map((source) => ({ path: source.path, digest: source.digest }))
          .sort((left, right) => compareStrings(left.path, right.path)),
      },
      granularity: {
        traceability: {
          validator: document.granularity.traceability.validator,
          level: document.granularity.traceability.level,
          claim: document.granularity.traceability.claim,
          knownLimitations: [...document.granularity.traceability.knownLimitations].sort(compareStrings),
        },
      },
      acBoundScope: [...document.acBoundScope].sort(compareStrings),
      verificationStatus: {
        ok: verification.ok,
        checks: {
          schema: verification.checks.schema,
          mode: verification.checks.mode,
          attestationDigest: verification.checks.attestationDigest,
          inputHashes: verification.checks.inputHashes,
          granularity: verification.checks.granularity,
          acBoundScope: verification.checks.acBoundScope,
        },
      },
    };
  }

  private assertDigest(value: string, field: string): void {
    if (!SHA256.test(value)) {
      throw new OwnerProjectionError("malformed-provider-document", `${field} is not SHA-256`, { field });
    }
  }
}
