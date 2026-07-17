// @unit attestation
// @layer application
// @work-item-id WI-306

import { AttestationRecord, type GateResult, type SourceEntry } from "../../domain/entities/attestation-record.js";
import type { ContentHasherPort } from "../../domain/ports/content-hasher-port.js";
import type { AcBoundScopeService } from "../../domain/services/ac-bound-scope-service.js";
import type { GranularityDerivationService } from "../../domain/services/granularity-derivation-service.js";
import { Digest } from "../../domain/value-objects/digest.js";
import { SignatureBlock } from "../../domain/value-objects/signature-block.js";
import { ValidatorOutcome } from "../../domain/value-objects/validator-outcome.js";
import type { AttestationDocument } from "../dto/attestation-document.js";
import type { ProduceAttestationInput } from "../dto/produce-attestation-input.js";
import type { AttestationRecordMapper } from "../mappers/attestation-record-mapper.js";
import type { AcBoundAllowlistPort } from "../ports/ac-bound-allowlist-port.js";
import type { AttestationRepositoryPort } from "../ports/attestation-repository-port.js";
import type { GateResultSourcePort } from "../ports/gate-result-source-port.js";
import type { MatrixSourcePort } from "../ports/matrix-source-port.js";
import type { SourceDigesterPort } from "../ports/source-digester-port.js";
import type { WorldSnapshotRootProvider } from "../ports/world-snapshot-root-provider.js";

const V1_SCHEMA_VERSION = "phasegate-attestation/v1";
const V1_PREDICATE_TYPE = "https://phasegate.dev/attestation/gate-run/v1";
const V2_SCHEMA_VERSION = "phasegate-attestation/v2";
const V2_PREDICATE_TYPE = "https://phasegate.dev/attestation/gate-run/v2";
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
  /** H16-03: acBoundScope 導出用 matrix 供給（省略時は acBoundScope=[]）。 */
  readonly matrixSource?: MatrixSourcePort;
  /** H16-03: acBoundScope 導出用 allowlist 供給（省略時は acBoundScope=[]）。 */
  readonly allowlist?: AcBoundAllowlistPort;
  /** H16-03: acBoundScope 導出サービス（省略時は acBoundScope=[]）。 */
  readonly acBoundScopeService?: AcBoundScopeService;
  /** H16-03: matrix 供給元パス（inputSourcePaths のうち matrix にあたるもの。既定は 2 番目の source）。 */
  readonly matrixFilePath?: string;
  /** WI-306: 配線時はv2、未配線時は既存v1を生成する。 */
  readonly worldSnapshotRootProvider?: WorldSnapshotRootProvider;
}

export interface ProduceAttestationResult {
  readonly document: AttestationDocument | null;
  readonly exitCode: 0 | 1 | 2;
  readonly error?: string;
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

    // 3b. World root providerはv2 opt-in。失敗や不正digestをv1へdowngradeしない。
    let worldSnapshotRoot: Digest | undefined;
    if (this.deps.worldSnapshotRootProvider) {
      try {
        worldSnapshotRoot = Digest.create(await this.deps.worldSnapshotRootProvider.getWorldSnapshotRoot());
      } catch (error) {
        return {
          document: null,
          exitCode: 2,
          error: `cannot obtain worldSnapshotRoot: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
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
      acBoundScope: [],
      worldSnapshotRoot,
    });
    const inputDigest = preInputRecord.computeInputDigest(this.deps.hasher);

    // 5. granularity 導出（domain service）
    // 5b. acBoundScope 導出（H16-03）: matrixSource + allowlist + AcBoundScopeService。
    //     いずれか未配線なら acBoundScope=[]。
    const acBoundScope = await this.deriveAcBoundScope();

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
      acBoundScope,
      worldSnapshotRoot,
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
    acBoundScope: readonly string[];
    worldSnapshotRoot?: Digest;
  }): AttestationRecord {
    const granularity = this.deps.granularityService.derive(args.validatorSet);
    return AttestationRecord.create({
      schemaVersion: args.worldSnapshotRoot ? V2_SCHEMA_VERSION : V1_SCHEMA_VERSION,
      predicateType: args.worldSnapshotRoot ? V2_PREDICATE_TYPE : V1_PREDICATE_TYPE,
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
      acBoundScope: args.acBoundScope,
      ...(args.worldSnapshotRoot ? { worldSnapshotRoot: args.worldSnapshotRoot } : {}),
    });
  }

  /**
   * H16-03: matrixSource + allowlist + AcBoundScopeService から acBoundScope を導出する。
   * いずれかのポート/サービスが未配線なら [] を返す（additive-safe）。
   * matrix の読み込みに失敗した場合も [] を返す（produce は attest の記録が主目的であり、
   * 過大主張の防止は verify の再導出比較が担保する）。
   */
  private async deriveAcBoundScope(): Promise<string[]> {
    if (!this.deps.matrixSource || !this.deps.allowlist || !this.deps.acBoundScopeService) {
      return [];
    }
    try {
      const allowlist = await this.deps.allowlist.getAcBoundStories();
      if (allowlist.length === 0) return [];
      const matrix = await this.deps.matrixSource.load(this.deps.matrixFilePath);
      return this.deps.acBoundScopeService.derive(matrix, allowlist);
    } catch {
      return [];
    }
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
