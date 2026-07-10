// @unit ci-governance
// @layer application

import type { FileScannerPort } from "../../domain/ports/file-scanner-port.js";
import type { IntegrityManifestRepositoryPort } from "../../domain/ports/integrity-manifest-repository-port.js";
import type { Sha256HasherPort } from "../../domain/ports/sha256-hasher-port.js";
import type { IntegrityChecker } from "../../domain/services/integrity-checker.js";
import { IntegrityTarget } from "../../domain/value-objects/integrity-target.js";
import type { VerifyIntegrityInput } from "../dto/verify-integrity-input.js";
import type { VerifyIntegrityOutput } from "../dto/verify-integrity-output.js";

/**
 * manifest を読み込み、指示搭載ファイルを再計算して照合する。
 * drift（不一致・追加・欠落・manifest 欠落）を列挙する。ADR-030 §Decision.3.①。
 */
export class VerifyIntegrityUseCase {
  constructor(
    private readonly scanner: FileScannerPort,
    private readonly hasher: Sha256HasherPort,
    private readonly repository: IntegrityManifestRepositoryPort,
    private readonly checker: IntegrityChecker,
  ) {}

  async execute(input: VerifyIntegrityInput = {}): Promise<VerifyIntegrityOutput> {
    const target = IntegrityTarget.defaultTargets();
    const include = input.include ?? target.include;
    const exclude = input.exclude ?? target.exclude;

    const manifestPath = this.repository.getPath();
    const manifest = await this.repository.load();

    const scanned = await this.scanner.scan({ include, exclude });
    const actual = new Map<string, string>();
    for (const path of [...scanned].sort()) {
      actual.set(path, await this.hasher.hashFile(path));
    }

    const drifts = this.checker.computeDrifts(manifest, actual);

    return {
      manifestPath,
      ok: drifts.length === 0,
      drifts,
    };
  }
}
