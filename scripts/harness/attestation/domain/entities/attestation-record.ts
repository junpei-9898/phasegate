// @unit attestation
// @layer domain

import type { ContentHasherPort } from "../ports/content-hasher-port.js";
import { GranularityDerivationService } from "../services/granularity-derivation-service.js";
import type { Digest } from "../value-objects/digest.js";
import type { GranularityClaim } from "../value-objects/granularity-claim.js";
import { SignatureBlock } from "../value-objects/signature-block.js";
import type { ValidatorOutcome } from "../value-objects/validator-outcome.js";

export type GateResult = "pass" | "fail";

export interface SourceEntry {
  readonly path: string;
  readonly digest: Digest;
}

export interface SubjectSection {
  readonly command: string;
  readonly gateResult: GateResult;
  readonly validatorSet: readonly ValidatorOutcome[];
}

export interface InputsSection {
  readonly digestAlgorithm: "sha256";
  readonly sources: readonly SourceEntry[];
  readonly inputDigest: Digest;
}

export interface MetadataSection {
  readonly producedAt: string;
  readonly producer: string;
  readonly gitCommit: string | null;
}

export interface AttestationRecordProps {
  readonly schemaVersion: string;
  readonly predicateType: string;
  readonly subject: SubjectSection;
  readonly inputs: InputsSection;
  readonly granularity: { readonly traceability: GranularityClaim };
  readonly metadata: MetadataSection;
  readonly signature: SignatureBlock;
  /**
   * H16-03 / WI-227: 実際に ac-bound かつ L3-005 スコープ内で pass した story-id（昇順）。
   * canonical payload に含まれ attestationDigest でカバーされる。granularity.level とは独立。
   * 省略時は [] として扱う（additive-safe）。
   */
  readonly acBoundScope?: readonly string[];
}

/**
 * INV-1/2/3/6 のいずれかに違反した場合の集約不変条件違反例外。
 * errorCode: L1-051（logical_design §2.4）
 */
export class AttestationInvariantError extends Error {
  readonly errorCode = "L1-051";

  constructor(message: string) {
    super(`${message} [L1-051]`);
    this.name = "AttestationInvariantError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const derivationService = new GranularityDerivationService();

/**
 * canonical JSON 直列化（§1.4.1）: キー昇順ソート（再帰）・空白なし・配列順序保持。
 * この規則が record format の中核契約であり、生成と検証で完全一致する必要がある。
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(record[k])}`);
  return `{${entries.join(",")}}`;
}

/**
 * attestation ドキュメント1件を整合性境界として扱う単一集約。
 */
export class AttestationRecord {
  readonly schemaVersion: string;
  readonly predicateType: string;
  readonly subject: SubjectSection;
  readonly inputs: InputsSection;
  readonly granularity: { readonly traceability: GranularityClaim };
  readonly metadata: MetadataSection;
  readonly signature: SignatureBlock;
  readonly acBoundScope: readonly string[];

  private constructor(props: AttestationRecordProps) {
    this.schemaVersion = props.schemaVersion;
    this.predicateType = props.predicateType;
    this.subject = props.subject;
    this.inputs = props.inputs;
    this.granularity = props.granularity;
    this.metadata = props.metadata;
    this.signature = props.signature;
    this.acBoundScope = Object.freeze([...(props.acBoundScope ?? [])]);
    Object.freeze(this);
  }

  static create(props: AttestationRecordProps): AttestationRecord {
    // INV-1: gateResult == "pass" iff validatorSet.every(passed || skipped)
    const allGreen = props.subject.validatorSet.every((o) => o.isGreen());
    const expectedGateResult: GateResult = allGreen ? "pass" : "fail";
    if (props.subject.gateResult !== expectedGateResult) {
      throw new AttestationInvariantError(
        `INV-1 violated: gateResult "${props.subject.gateResult}" does not match validatorSet allPassed rule (expected "${expectedGateResult}")`,
      );
    }

    // INV-3: granularity == GranularityDerivationService.derive(validatorSet)
    const derived = derivationService.derive(props.subject.validatorSet);
    if (!props.granularity.traceability.equals(derived)) {
      throw new AttestationInvariantError(
        "INV-3 violated: granularity.traceability does not match mechanically derived granularity (anti-laundering)",
      );
    }

    // INV-6: unsigned-poc のとき algorithm/keyId/value は null（SignatureBlock.create で保証済み）
    // INV-2: attestationDigest present iff mode set —
    //   SignatureBlock は常に mode + attestationDigest を持つため構造的に成立
    if (props.signature.mode === "unsigned-poc") {
      if (props.signature.algorithm !== null || props.signature.keyId !== null || props.signature.value !== null) {
        throw new AttestationInvariantError(
          "INV-6 violated: unsigned-poc signature must have null algorithm/keyId/value",
        );
      }
    }

    return new AttestationRecord(props);
  }

  /**
   * 既存 document を「格納されたまま」に再構築する（verify 用）。
   * INV-1/INV-3 を強制しない — verify はこれらを機械的チェックとして検出し
   * check 失敗（exitCode 1）として報告する責務を持つため、ここで例外を投げてはならない。
   * SignatureBlock 側の INV-6 は VO 構築時に既に保証されている。
   */
  static reconstruct(props: AttestationRecordProps): AttestationRecord {
    return new AttestationRecord(props);
  }

  gateResult(): GateResult {
    return this.subject.gateResult;
  }

  /**
   * §1.4.2: sources を path 昇順で安定ソートした `[{ path, digest }]` の canonical JSON の sha256。
   */
  computeInputDigest(hasher: ContentHasherPort): Digest {
    const sorted = [...this.inputs.sources]
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
      .map((s) => ({ path: s.path, digest: s.digest.value }));
    return hasher.sha256(canonicalStringify(sorted));
  }

  /**
   * §1.4.1 step1-3: signature ブロック全体と volatile metadata（producedAt/gitCommit）を
   * 除去した plain object を返す（producer は決定論的なので残す）。
   */
  toCanonicalPayload(): Record<string, unknown> {
    return {
      schemaVersion: this.schemaVersion,
      predicateType: this.predicateType,
      subject: {
        command: this.subject.command,
        gateResult: this.subject.gateResult,
        validatorSet: this.subject.validatorSet.map((o) => ({
          validatorId: o.validatorId,
          passed: o.passed,
          skipped: o.skipped,
        })),
      },
      inputs: {
        digestAlgorithm: this.inputs.digestAlgorithm,
        sources: this.inputs.sources.map((s) => ({ path: s.path, digest: s.digest.value })),
        inputDigest: this.inputs.inputDigest.value,
      },
      granularity: {
        traceability: {
          validator: this.granularity.traceability.validator,
          level: this.granularity.traceability.level,
          claim: this.granularity.traceability.claim,
          knownLimitations: [...this.granularity.traceability.knownLimitations],
        },
      },
      // H16-03: acBoundScope は canonical payload に含める（attestationDigest でカバー）。
      acBoundScope: [...this.acBoundScope],
      metadata: {
        producer: this.metadata.producer,
      },
    };
  }

  /**
   * §1.4.1 step4: canonical payload の canonical JSON を sha256 にかけて attestationDigest を得る。
   */
  computeAttestationDigest(hasher: ContentHasherPort): Digest {
    return hasher.sha256(canonicalStringify(this.toCanonicalPayload()));
  }

  /**
   * computeAttestationDigest() を signature.attestationDigest に反映した封印済み record を返す（INV-4）。
   */
  seal(hasher: ContentHasherPort): AttestationRecord {
    const digest = this.computeAttestationDigest(hasher);
    return AttestationRecord.create({
      schemaVersion: this.schemaVersion,
      predicateType: this.predicateType,
      subject: this.subject,
      inputs: this.inputs,
      granularity: this.granularity,
      metadata: this.metadata,
      signature: SignatureBlock.unsignedPoc(digest),
      acBoundScope: this.acBoundScope,
    });
  }

  equals(other: AttestationRecord): boolean {
    if (this.schemaVersion !== other.schemaVersion) return false;
    if (this.predicateType !== other.predicateType) return false;
    if (this.subject.command !== other.subject.command) return false;
    if (this.subject.gateResult !== other.subject.gateResult) return false;
    if (this.subject.validatorSet.length !== other.subject.validatorSet.length) return false;
    if (!this.subject.validatorSet.every((o, i) => o.equals(other.subject.validatorSet[i]))) {
      return false;
    }
    if (this.inputs.digestAlgorithm !== other.inputs.digestAlgorithm) return false;
    if (!this.inputs.inputDigest.equals(other.inputs.inputDigest)) return false;
    if (this.inputs.sources.length !== other.inputs.sources.length) return false;
    if (
      !this.inputs.sources.every(
        (s, i) => s.path === other.inputs.sources[i].path && s.digest.equals(other.inputs.sources[i].digest),
      )
    ) {
      return false;
    }
    if (!this.granularity.traceability.equals(other.granularity.traceability)) return false;
    if (this.acBoundScope.length !== other.acBoundScope.length) return false;
    if (!this.acBoundScope.every((s, i) => s === other.acBoundScope[i])) return false;
    if (!this.signature.equals(other.signature)) return false;
    return true;
  }
}
