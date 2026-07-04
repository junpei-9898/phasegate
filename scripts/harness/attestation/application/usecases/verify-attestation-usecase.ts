// @unit attestation
// @layer application

import type { AttestationRecord } from "../../domain/entities/attestation-record.js";
import type { ContentHasherPort } from "../../domain/ports/content-hasher-port.js";
import type { GranularityDerivationService } from "../../domain/services/granularity-derivation-service.js";
import type { VerifyAttestationInput } from "../dto/verify-attestation-input.js";
import type { VerifyAttestationChecks, VerifyAttestationOutput } from "../dto/verify-attestation-output.js";
import type { AttestationRecordMapper } from "../mappers/attestation-record-mapper.js";
import type { AttestationRepositoryPort } from "../ports/attestation-repository-port.js";
import type { SourceDigesterPort } from "../ports/source-digester-port.js";

export interface VerifyAttestationDeps {
  readonly repository: AttestationRepositoryPort;
  readonly sourceDigester: SourceDigesterPort;
  readonly hasher: ContentHasherPort;
  readonly granularityService: GranularityDerivationService;
  readonly mapper: AttestationRecordMapper;
}

export interface VerifyAttestationResult {
  readonly output: VerifyAttestationOutput;
  readonly exitCode: 0 | 1 | 2;
}

const SUPPORTED_MODE = "unsigned-poc";

/**
 * H16-02: 既存 record を読み込み、機械的 5 チェックを再計算で行う。
 */
export class VerifyAttestationUseCase {
  constructor(private readonly deps: VerifyAttestationDeps) {}

  async execute(input: VerifyAttestationInput): Promise<VerifyAttestationResult> {
    // 1. read（不在/parse 失敗 → exitCode 2, schema fail）
    let raw: unknown;
    try {
      raw = await this.deps.repository.read(input.filePath);
    } catch (e) {
      return this.fail2({ schema: false }, [`cannot read attestation: ${errMsg(e)}`]);
    }

    // 3(先出し). mode サポート判定は shape に依存しないため、生の signature.mode を先に確認する。
    //   非対応 mode（signed）は exitCode 2（mode check fail）。
    const rawMode = extractMode(raw);
    if (rawMode !== null && rawMode !== SUPPORTED_MODE) {
      return this.fail2({ schema: true, mode: false }, [`unsupported signature mode: "${rawMode}"`]);
    }

    // 2. shape/型検証（不正 → exitCode 2, schema fail）
    let record: AttestationRecord;
    try {
      record = this.deps.mapper.fromDocument(raw);
    } catch (e) {
      return this.fail2({ schema: false }, [`malformed attestation: ${errMsg(e)}`]);
    }

    // ここまで schema OK, mode OK
    const mismatches: string[] = [];

    // 4. attestationDigest 再計算 == 格納値
    const recomputedAttestation = record.computeAttestationDigest(this.deps.hasher);
    const attestationDigestOk = recomputedAttestation.equals(record.signature.attestationDigest);
    if (!attestationDigestOk) {
      mismatches.push(
        `attestationDigest mismatch: stored ${record.signature.attestationDigest.value}, recomputed ${recomputedAttestation.value}`,
      );
    }

    // 5. inputs.sources[].digest を現在ファイルから再計算 == 格納値
    let inputHashesOk = true;
    for (const source of record.inputs.sources) {
      if (source.path === "git:HEAD") {
        // git commit source は現在の HEAD ではなく生成時点の値を証明する。
        // ファイル再読込の対象外（再照合は inputDigest 経由の整合で担保）。
        continue;
      }
      let current: string;
      try {
        current = (await this.deps.sourceDigester.digestFile(source.path)).value;
      } catch (e) {
        inputHashesOk = false;
        mismatches.push(`cannot re-hash source "${source.path}": ${errMsg(e)}`);
        continue;
      }
      if (current !== source.digest.value) {
        inputHashesOk = false;
        mismatches.push(`input hash mismatch for "${source.path}": stored ${source.digest.value}, current ${current}`);
      }
    }

    // 6. granularity を validatorSet から再導出 == 格納値（anti-laundering）
    const rederived = this.deps.granularityService.derive(record.subject.validatorSet);
    const granularityOk = rederived.equals(record.granularity.traceability);
    if (!granularityOk) {
      mismatches.push("granularity mismatch: stored granularity does not match re-derived value");
    }

    const checks: VerifyAttestationChecks = {
      schema: true,
      mode: true,
      attestationDigest: attestationDigestOk,
      inputHashes: inputHashesOk,
      granularity: granularityOk,
    };
    const ok = attestationDigestOk && inputHashesOk && granularityOk;

    return {
      output: { ok, checks, mismatches },
      exitCode: ok ? 0 : 1,
    };
  }

  private fail2(partialChecks: Partial<VerifyAttestationChecks>, mismatches: string[]): VerifyAttestationResult {
    const checks: VerifyAttestationChecks = {
      schema: false,
      mode: false,
      attestationDigest: false,
      inputHashes: false,
      granularity: false,
      ...partialChecks,
    };
    return { output: { ok: false, checks, mismatches }, exitCode: 2 };
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function extractMode(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const signature = (raw as Record<string, unknown>).signature;
  if (typeof signature !== "object" || signature === null) return null;
  const mode = (signature as Record<string, unknown>).mode;
  return typeof mode === "string" ? mode : null;
}
