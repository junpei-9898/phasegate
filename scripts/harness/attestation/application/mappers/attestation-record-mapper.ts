// @unit attestation
// @layer application

import {
  AttestationRecord,
  type AttestationRecordProps,
  type GateResult,
} from "../../domain/entities/attestation-record.js";
import { Digest } from "../../domain/value-objects/digest.js";
import { GranularityClaim } from "../../domain/value-objects/granularity-claim.js";
import { SignatureBlock } from "../../domain/value-objects/signature-block.js";
import { ValidatorOutcome } from "../../domain/value-objects/validator-outcome.js";
import type { AttestationDocument, AttestationDocumentGranularityClaim } from "../dto/attestation-document.js";

/**
 * verify 時に外部 JSON の shape/型が不正なとき送出する例外。
 * errorCode: L1-053（logical_design §2.4）
 */
export class MalformedAttestationError extends Error {
  readonly errorCode = "L1-053";

  constructor(message: string) {
    super(`Malformed attestation: ${message} [L1-053]`);
    this.name = "MalformedAttestationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireString(v: unknown, field: string): string {
  if (typeof v !== "string") {
    throw new MalformedAttestationError(`${field} must be a string`);
  }
  return v;
}

function requireBoolean(v: unknown, field: string): boolean {
  if (typeof v !== "boolean") {
    throw new MalformedAttestationError(`${field} must be a boolean`);
  }
  return v;
}

/**
 * AttestationRecord（domain）↔ AttestationDocument（application DTO）の双方向変換。
 */
export class AttestationRecordMapper {
  /** 集約を plain object へ射影（VO をプリミティブ展開）。 */
  toDocument(record: AttestationRecord): AttestationDocument {
    return {
      schemaVersion: record.schemaVersion as "phasegate-attestation/v1",
      predicateType: record.predicateType,
      subject: {
        command: record.subject.command,
        gateResult: record.subject.gateResult,
        validatorSet: record.subject.validatorSet.map((o) => ({
          validatorId: o.validatorId,
          passed: o.passed,
          skipped: o.skipped,
        })),
      },
      inputs: {
        digestAlgorithm: "sha256",
        sources: record.inputs.sources.map((s) => ({ path: s.path, digest: s.digest.value })),
        inputDigest: record.inputs.inputDigest.value,
      },
      granularity: {
        traceability: {
          validator: record.granularity.traceability.validator,
          level: record.granularity.traceability.level,
          claim: record.granularity.traceability.claim,
          knownLimitations: [...record.granularity.traceability.knownLimitations],
        },
      },
      acBoundScope: [...record.acBoundScope],
      metadata: {
        producedAt: record.metadata.producedAt,
        producer: record.metadata.producer,
        gitCommit: record.metadata.gitCommit,
      },
      signature: {
        mode: record.signature.mode,
        attestationDigest: record.signature.attestationDigest.value,
        algorithm: record.signature.algorithm,
        keyId: record.signature.keyId,
        value: record.signature.value,
      },
    };
  }

  /**
   * verify 時に外部 JSON を検証しつつ集約へ再構築。shape/型不正は MalformedAttestationError。
   * INV 違反（INV-1/3/6）は AttestationRecord.create が AttestationInvariantError を送出する。
   */
  fromDocument(doc: unknown): AttestationRecord {
    if (!isObject(doc)) {
      throw new MalformedAttestationError("root must be an object");
    }

    const schemaVersion = requireString(doc.schemaVersion, "schemaVersion");
    const predicateType = requireString(doc.predicateType, "predicateType");

    const subject = doc.subject;
    if (!isObject(subject)) {
      throw new MalformedAttestationError("subject must be an object");
    }
    const command = requireString(subject.command, "subject.command");
    const gateResultRaw = requireString(subject.gateResult, "subject.gateResult");
    if (gateResultRaw !== "pass" && gateResultRaw !== "fail") {
      throw new MalformedAttestationError('subject.gateResult must be "pass" or "fail"');
    }
    const gateResult = gateResultRaw as GateResult;
    if (!Array.isArray(subject.validatorSet)) {
      throw new MalformedAttestationError("subject.validatorSet must be an array");
    }
    const validatorSet = subject.validatorSet.map((raw, i) => {
      if (!isObject(raw)) {
        throw new MalformedAttestationError(`subject.validatorSet[${i}] must be an object`);
      }
      return ValidatorOutcome.create({
        validatorId: requireString(raw.validatorId, `subject.validatorSet[${i}].validatorId`),
        passed: requireBoolean(raw.passed, `subject.validatorSet[${i}].passed`),
        skipped: requireBoolean(raw.skipped, `subject.validatorSet[${i}].skipped`),
      });
    });

    const inputs = doc.inputs;
    if (!isObject(inputs)) {
      throw new MalformedAttestationError("inputs must be an object");
    }
    if (inputs.digestAlgorithm !== "sha256") {
      throw new MalformedAttestationError('inputs.digestAlgorithm must be "sha256"');
    }
    if (!Array.isArray(inputs.sources)) {
      throw new MalformedAttestationError("inputs.sources must be an array");
    }
    const sources = inputs.sources.map((raw, i) => {
      if (!isObject(raw)) {
        throw new MalformedAttestationError(`inputs.sources[${i}] must be an object`);
      }
      return {
        path: requireString(raw.path, `inputs.sources[${i}].path`),
        digest: this.toDigest(raw.digest, `inputs.sources[${i}].digest`),
      };
    });
    const inputDigest = this.toDigest(inputs.inputDigest, "inputs.inputDigest");

    const granularity = doc.granularity;
    if (!isObject(granularity) || !isObject(granularity.traceability)) {
      throw new MalformedAttestationError("granularity.traceability must be an object");
    }
    const traceability = this.toGranularityClaim(granularity.traceability);

    const acBoundScope = this.toAcBoundScope(doc.acBoundScope);

    const metadata = doc.metadata;
    if (!isObject(metadata)) {
      throw new MalformedAttestationError("metadata must be an object");
    }
    const gitCommit = metadata.gitCommit === null ? null : requireString(metadata.gitCommit, "metadata.gitCommit");

    const signature = doc.signature;
    if (!isObject(signature)) {
      throw new MalformedAttestationError("signature must be an object");
    }
    const mode = requireString(signature.mode, "signature.mode");
    const attestationDigest = this.toDigest(signature.attestationDigest, "signature.attestationDigest");
    // mode の非対応（signed）は verify usecase の mode check で判定するため、ここでは
    // SignatureBlock を直接構築せず、mode をそのまま検証用に保持する必要がある。
    // unsigned-poc のみ SignatureBlock を構築できるので、非対応 mode は shape 検証を通し
    // usecase 側へ委譲するため、props を組み立てる際に signature block を後段で扱う。
    const props: AttestationRecordProps = {
      schemaVersion,
      predicateType,
      subject: { command, gateResult, validatorSet },
      inputs: { digestAlgorithm: "sha256", sources, inputDigest },
      granularity: { traceability },
      metadata: {
        producedAt: requireString(metadata.producedAt, "metadata.producedAt"),
        producer: requireString(metadata.producer, "metadata.producer"),
        gitCommit,
      },
      signature: this.toSignatureBlock(mode, attestationDigest, signature),
      acBoundScope,
    };

    // verify 用の再構築: INV-1/INV-3 は verify usecase が機械的チェックとして検出するため
    // ここでは強制しない（reconstruct）。shape/型不正のみ MalformedAttestationError として弾く。
    return AttestationRecord.reconstruct(props);
  }

  private toAcBoundScope(v: unknown): string[] {
    // H16-03: 後方互換のため未設定は [] とみなす（additive-safe）。
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      throw new MalformedAttestationError("acBoundScope must be an array of strings");
    }
    return v.map((item, i) => requireString(item, `acBoundScope[${i}]`));
  }

  private toDigest(v: unknown, field: string): Digest {
    const raw = requireString(v, field);
    try {
      return Digest.create(raw);
    } catch {
      throw new MalformedAttestationError(`${field} is not a valid sha256 digest`);
    }
  }

  private toGranularityClaim(raw: Record<string, unknown>): GranularityClaim {
    const level = raw.level;
    if (level !== "file" && level !== "ac") {
      throw new MalformedAttestationError('granularity.traceability.level must be "file" or "ac"');
    }
    if (!Array.isArray(raw.knownLimitations)) {
      throw new MalformedAttestationError("granularity.traceability.knownLimitations must be an array");
    }
    const knownLimitations = raw.knownLimitations.map((k, i) =>
      requireString(k, `granularity.traceability.knownLimitations[${i}]`),
    );
    const claim: AttestationDocumentGranularityClaim = {
      validator: requireString(raw.validator, "granularity.traceability.validator"),
      level,
      claim: requireString(raw.claim, "granularity.traceability.claim"),
      knownLimitations,
    };
    return GranularityClaim.create(claim);
  }

  private toSignatureBlock(mode: string, attestationDigest: Digest, raw: Record<string, unknown>): SignatureBlock {
    // unsigned-poc は SignatureBlock で INV-6 を強制。
    // signed（非対応 mode）は SignatureBlock.create が UnsupportedSignatureModeError を送出するが、
    // verify usecase は mode check（exitCode 2）で先に非対応を扱うため、ここでは
    // unsigned-poc のみ通常構築し、それ以外は shape として null 三点組を検証して仮ブロックを組む。
    if (mode === "unsigned-poc") {
      if (raw.algorithm !== null || raw.keyId !== null || raw.value !== null) {
        throw new MalformedAttestationError("unsigned-poc signature must have null algorithm/keyId/value");
      }
      return SignatureBlock.unsignedPoc(attestationDigest);
    }
    // 非対応 mode: shape のみ検証し unsupported として扱えるよう SignatureBlock.create に委譲。
    return SignatureBlock.create({
      mode: mode as "unsigned-poc" | "signed",
      attestationDigest,
      algorithm: (raw.algorithm ?? null) as string | null,
      keyId: (raw.keyId ?? null) as string | null,
      value: (raw.value ?? null) as string | null,
    });
  }
}
