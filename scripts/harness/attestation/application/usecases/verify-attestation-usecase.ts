// @unit attestation
// @layer application

import type { AttestationRecord } from "../../domain/entities/attestation-record.js";
import type { ContentHasherPort } from "../../domain/ports/content-hasher-port.js";
import type { GranularityDerivationService } from "../../domain/services/granularity-derivation-service.js";
import type { AcBoundScopeService } from "../../domain/services/ac-bound-scope-service.js";
import type { VerifyAttestationInput } from "../dto/verify-attestation-input.js";
import type { VerifyAttestationChecks, VerifyAttestationOutput } from "../dto/verify-attestation-output.js";
import type { AttestationRecordMapper } from "../mappers/attestation-record-mapper.js";
import type { AttestationRepositoryPort } from "../ports/attestation-repository-port.js";
import type { SourceDigesterPort } from "../ports/source-digester-port.js";
import type { MatrixSourcePort } from "../ports/matrix-source-port.js";
import type { AcBoundAllowlistPort } from "../ports/ac-bound-allowlist-port.js";

export interface VerifyAttestationDeps {
  readonly repository: AttestationRepositoryPort;
  readonly sourceDigester: SourceDigesterPort;
  readonly hasher: ContentHasherPort;
  readonly granularityService: GranularityDerivationService;
  readonly mapper: AttestationRecordMapper;
  /** H16-03: acBoundScope 再導出用（省略時は空 allowlist として扱い、格納が [] のときのみ合格）。 */
  readonly matrixSource?: MatrixSourcePort;
  readonly allowlist?: AcBoundAllowlistPort;
  readonly acBoundScopeService?: AcBoundScopeService;
  /** H16-03: matrix パスの明示指定（省略時は inputs.sources から解決）。 */
  readonly matrixFilePath?: string;
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

    // 6b. acBoundScope を stored matrix + allowlist から再導出 == 格納値（anti-laundering, H16-03）
    const acBoundScopeOk = await this.checkAcBoundScope(record, mismatches);

    const checks: VerifyAttestationChecks = {
      schema: true,
      mode: true,
      attestationDigest: attestationDigestOk,
      inputHashes: inputHashesOk,
      granularity: granularityOk,
      acBoundScope: acBoundScopeOk,
    };
    const ok = attestationDigestOk && inputHashesOk && granularityOk && acBoundScopeOk;

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
      acBoundScope: false,
      ...partialChecks,
    };
    return { output: { ok: false, checks, mismatches }, exitCode: 2 };
  }

  /**
   * H16-03: acBoundScope を stored matrix + config allowlist から再導出し格納値と比較する（anti-laundering）。
   *
   * - ポート/サービスが未配線: 格納 acBoundScope が [] のときのみ合格（後方互換。空 allowlist 相当）。
   * - matrix/allowlist が読めない・parse 不能: fail-closed（false, Q2）。
   * - matrix パスは inputs.sources（ハッシュ検証済み入力）から解決する（Q3）。
   */
  private async checkAcBoundScope(record: AttestationRecord, mismatches: string[]): Promise<boolean> {
    const stored = [...record.acBoundScope].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    if (!this.deps.matrixSource || !this.deps.allowlist || !this.deps.acBoundScopeService) {
      // 未配線: 格納が空のときのみ合格（空 allowlist で再導出すれば [] になるため）。
      if (stored.length === 0) return true;
      mismatches.push("acBoundScope check unavailable: matrix source not wired but stored acBoundScope is non-empty");
      return false;
    }

    let rederived: string[];
    try {
      const allowlist = await this.deps.allowlist.getAcBoundStories();
      const matrixPath = this.deps.matrixFilePath ?? this.resolveMatrixPath(record);
      const matrix = await this.deps.matrixSource.load(matrixPath);
      rederived = this.deps.acBoundScopeService.derive(matrix, allowlist);
    } catch (e) {
      // FAIL-CLOSED（Q2）: 再導出入力が読めない/parse 不能は不一致として扱う。
      mismatches.push(`acBoundScope re-derivation failed (fail-closed): ${errMsg(e)}`);
      return false;
    }

    const rederivedSorted = [...rederived].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const equal = stored.length === rederivedSorted.length && stored.every((s, i) => s === rederivedSorted[i]);
    if (!equal) {
      mismatches.push(
        `acBoundScope mismatch: stored [${stored.join(",")}], re-derived [${rederivedSorted.join(",")}]`,
      );
    }
    return equal;
  }

  /** inputs.sources から matrix にあたるパスを解決する（Q3）。 */
  private resolveMatrixPath(record: AttestationRecord): string | undefined {
    const matrixEntry = record.inputs.sources.find((s) => s.path.includes("requirement-test-matrix"));
    return matrixEntry?.path;
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
