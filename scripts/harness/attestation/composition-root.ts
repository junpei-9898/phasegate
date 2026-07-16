/**
 * @layer infrastructure
 * @unit attestation
 *
 * Composition Root — attestation Unit の依存性組み立て。
 * createAttestationModule() は adapters + usecases + handlers を組み立て、
 * 公開する 2 ハンドラ（attest / verify-attestation）を返す。
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AttestationRecordMapper } from "./application/mappers/attestation-record-mapper.js";
import type { Sha256Capability } from "./application/ports/sha256-capability.js";
import { ProduceAttestationUseCase } from "./application/usecases/produce-attestation-usecase.js";
import { VerifyAttestationUseCase } from "./application/usecases/verify-attestation-usecase.js";
import { AcBoundScopeService } from "./domain/services/ac-bound-scope-service.js";
import { GranularityDerivationService } from "./domain/services/granularity-derivation-service.js";
import { CiCheckGateResultAdapter } from "./infrastructure/adapters/ci-check-gate-result-adapter.js";
import { ConfigAcBoundAllowlistAdapter } from "./infrastructure/adapters/config-ac-bound-allowlist-adapter.js";
import { FileSystemAttestationRepositoryAdapter } from "./infrastructure/adapters/file-system-attestation-repository-adapter.js";
import { FileSystemMatrixSourceAdapter } from "./infrastructure/adapters/file-system-matrix-source-adapter.js";
import { FileSystemSourceDigesterAdapter } from "./infrastructure/adapters/file-system-source-digester-adapter.js";
import { NodeCryptoContentHasherAdapter } from "./infrastructure/adapters/node-crypto-content-hasher-adapter.js";
import { NodeCryptoSha256Capability } from "./infrastructure/adapters/node-crypto-sha256-capability.js";
import { AttestHandler } from "./presentation/handlers/attest-handler.js";
import { VerifyAttestationHandler } from "./presentation/handlers/verify-attestation-handler.js";

const execFileAsync = promisify(execFile);

export interface AttestationModule {
  readonly attestHandler: AttestHandler;
  readonly verifyAttestationHandler: VerifyAttestationHandler;
}

export interface AttestationModuleOptions {
  /** metadata.producer の pkg version。既定 "0.0.0"。 */
  readonly pkgVersion?: string;
  /** git commit SHA 取得器のオーバーライド（テスト用）。既定は `git rev-parse HEAD`。 */
  readonly gitCommitProvider?: () => Promise<string | null>;
  /** ci-check subprocess の main.ts パスオーバーライド（テスト用）。 */
  readonly mainTsPath?: string;
  /** metadata.producedAt 用クロックのオーバーライド（テスト用）。 */
  readonly clock?: () => Date;
}

/**
 * Unit非依存のplain SHA-256 public capabilityを生成する。
 */
export function createSha256Capability(): Sha256Capability {
  return new NodeCryptoSha256Capability();
}

/**
 * attestation Unit のモジュールを組み立てる。
 * @param rootDir プロジェクトルート（source digest / repository の baseDir）。
 */
export function createAttestationModule(rootDir: string, options?: AttestationModuleOptions): AttestationModule {
  // Infrastructure adapters
  const sha256Capability = createSha256Capability();
  const hasher = new NodeCryptoContentHasherAdapter(sha256Capability);
  const sourceDigester = new FileSystemSourceDigesterAdapter(rootDir);
  const gateResultSource = new CiCheckGateResultAdapter({ mainTsPath: options?.mainTsPath });
  const repository = new FileSystemAttestationRepositoryAdapter(rootDir);

  // Domain services / mappers
  const granularityService = new GranularityDerivationService();
  const acBoundScopeService = new AcBoundScopeService();
  const mapper = new AttestationRecordMapper();

  // H16-03: acBoundScope 導出用 adapter（matrix 供給 + config allowlist）。
  const matrixSource = new FileSystemMatrixSourceAdapter(rootDir);
  const allowlist = new ConfigAcBoundAllowlistAdapter();

  const gitCommitProvider = options?.gitCommitProvider ?? (() => defaultGitCommitProvider(rootDir));

  // Use cases
  const produceUseCase = new ProduceAttestationUseCase({
    gateResultSource,
    sourceDigester,
    hasher,
    repository,
    granularityService,
    mapper,
    gitCommitProvider,
    pkgVersion: options?.pkgVersion ?? "0.0.0",
    clock: options?.clock,
    matrixSource,
    allowlist,
    acBoundScopeService,
  });
  const verifyUseCase = new VerifyAttestationUseCase({
    repository,
    sourceDigester,
    hasher,
    granularityService,
    mapper,
    matrixSource,
    allowlist,
    acBoundScopeService,
  });

  // Handlers
  const attestHandler = new AttestHandler(produceUseCase);
  const verifyAttestationHandler = new VerifyAttestationHandler(verifyUseCase);

  return { attestHandler, verifyAttestationHandler };
}

async function defaultGitCommitProvider(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd });
    const sha = stdout.trim();
    return sha.length > 0 ? sha : null;
  } catch {
    return null;
  }
}
