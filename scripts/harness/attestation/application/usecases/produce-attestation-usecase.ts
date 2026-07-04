// @unit attestation
// @layer application

import { AttestationRecord, type GateResult, type SourceEntry } from "../../domain/entities/attestation-record.js";
import type { ContentHasherPort } from "../../domain/ports/content-hasher-port.js";
import type { GranularityDerivationService } from "../../domain/services/granularity-derivation-service.js";
import { SignatureBlock } from "../../domain/value-objects/signature-block.js";
import { ValidatorOutcome } from "../../domain/value-objects/validator-outcome.js";
import type { AttestationDocument } from "../dto/attestation-document.js";
import type { ProduceAttestationInput } from "../dto/produce-attestation-input.js";
import type { AttestationRecordMapper } from "../mappers/attestation-record-mapper.js";
import type { AttestationRepositoryPort } from "../ports/attestation-repository-port.js";
import type { GateResultSourcePort } from "../ports/gate-result-source-port.js";
import type { SourceDigesterPort } from "../ports/source-digester-port.js";

const SCHEMA_VERSION = "phasegate-attestation/v1";
const PREDICATE_TYPE = "https://phasegate.dev/attestation/gate-run/v1";
const DEFAULT_INPUT_SOURCES: readonly string[] = Object.freeze([
  "phasegate.config.json",
  ".harness/requirement-test-matrix.json",
]);

export interface ProduceAttestationDeps {
  readonly gateResultSource: GateResultSourcePort;
  readonly sourceDigester: SourceDigesterPort;
  readonly hasher: ContentHasherPort;
  readonly repository: AttestationRepositoryPort;
  readonly granularityService: GranularityDerivationService;
  readonly mapper: AttestationRecordMapper;
  /** git commit SHA 取得（決定論的 source 化のため）。取得不能なら null。 */
  readonly gitCommitProvider: () => Promise<string | null>;
  /** metadata.producer の pkg version。 */
  readonly pkgVersion: string;
  /** metadata.producedAt 用クロック。 */
  readonly clock?: () => Date;
  /** 入力 source パス群（既定は config + matrix）。 */
  readonly inputSourcePaths?: readonly string[];
}

export interface ProduceAttestationResult {
  readonly document: AttestationDocument | null;
  readonly exitCode: 0 | 1 | 2;
}

/**
 * H16-01: gate 結果取得 → source digest 取得 → granularity 導出 → 集約構築 → 封印 → 出力。
 */
export class ProduceAttestationUseCase {
  constructor(private readonly deps: ProduceAttestationDeps) {}

  async execute(input: ProduceAttestationInput): Promise<ProduceAttestationResult> {
    // 1. mode == "signed" は not-yet-implemented（record 出力なし・exit 2）
    if (input.mode === "signed") {
      return { document: null, exitCode: 2 };
    }

    // 2. gate 結果取得（validatorSet と gateResult 組み立て）
    const gate = await this.deps.gateResultSource.fetchGateResult();
    const validatorSet = gate.validatorResults.map((r) =>
      ValidatorOutcome.create({ validatorId: r.validatorId, passed: r.passed, skipped: r.skipped }),
    );
    const gateResult: GateResult = gate.allPassed ? "pass" : "fail";

    // 3. require-pass && gate fail → record を一切生成/出力せず exit 1
    if (input.requirePass && gateResult !== "pass") {
      return { document: null, exitCode: 1 };
    }

    // 4. inputs.sources 構築（config / matrix の sha256 + git commit SHA）と inputDigest 算出
    const sources = await this.buildSources();
    const preInputRecord = this.assembleRecord({
      validatorSet,
      gateResult,
      sources,
      inputDigest: sources[0].digest, // 仮置き。直後に computeInputDigest で確定
      producedAt: "1970-01-01T00:00:00Z",
      producer: `phasegate-attestation/${this.deps.pkgVersion}`,
      gitCommit: null,
    });
    const inputDigest = preInputRecord.computeInputDigest(this.deps.hasher);

    // 5. granularity 導出（domain service）
    // 6. metadata 構築
    const now = (this.deps.clock ?? (() => new Date()))().toISOString();
    const gitCommit = await this.deps.gitCommitProvider();

    // 7. 集約構築 → seal で attestationDigest 確定（INV-4）
    const record = this.assembleRecord({
      validatorSet,
      gateResult,
      sources,
      inputDigest,
      producedAt: now,
      producer: `phasegate-attestation/${this.deps.pkgVersion}`,
      gitCommit,
    });
    const sealed = record.seal(this.deps.hasher);

    // 8. document へ射影して永続化
    const document = this.deps.mapper.toDocument(sealed);
    await this.deps.repository.write(input.out, document);

    // 9. 成功
    return { document, exitCode: 0 };
  }

  private assembleRecord(args: {
    validatorSet: ValidatorOutcome[];
    gateResult: GateResult;
    sources: SourceEntry[];
    inputDigest: SourceEntry["digest"];
    producedAt: string;
    producer: string;
    gitCommit: string | null;
  }): AttestationRecord {
    const granularity = this.deps.granularityService.derive(args.validatorSet);
    return AttestationRecord.create({
      schemaVersion: SCHEMA_VERSION,
      predicateType: PREDICATE_TYPE,
      subject: {
        command: "phasegate:ci-check",
        gateResult: args.gateResult,
        validatorSet: args.validatorSet,
      },
      inputs: {
        digestAlgorithm: "sha256",
        sources: args.sources,
        inputDigest: args.inputDigest,
      },
      granularity: { traceability: granularity },
      metadata: {
        producedAt: args.producedAt,
        producer: args.producer,
        gitCommit: args.gitCommit,
      },
      // 仮の unsigned-poc block（seal 前）。seal が正しい digest で置換する。
      signature: SignatureBlock.unsignedPoc(args.inputDigest),
    });
  }

  private async buildSources(): Promise<SourceEntry[]> {
    const paths = this.deps.inputSourcePaths ?? DEFAULT_INPUT_SOURCES;
    const sources: SourceEntry[] = [];
    for (const path of paths) {
      const digest = await this.deps.sourceDigester.digestFile(path);
      sources.push({ path, digest });
    }
    // git commit SHA を source エントリとして取り込む（inputDigest に含める）
    const gitCommit = await this.deps.gitCommitProvider();
    if (gitCommit !== null) {
      sources.push({ path: "git:HEAD", digest: this.deps.hasher.sha256(gitCommit) });
    }
    return sources;
  }
}
