// @unit ci-governance
// @layer application

import type { FileScannerPort } from "../../domain/ports/file-scanner-port.js";
import type { IntegrityManifestRepositoryPort } from "../../domain/ports/integrity-manifest-repository-port.js";
import type { Sha256HasherPort } from "../../domain/ports/sha256-hasher-port.js";
import { IntegrityManifest } from "../../domain/value-objects/integrity-manifest.js";
import { IntegrityTarget } from "../../domain/value-objects/integrity-target.js";
import type { PinIntegrityInput } from "../dto/pin-integrity-input.js";
import type { PinIntegrityOutput } from "../dto/pin-integrity-output.js";

/**
 * 指示搭載ファイル群の SHA-256 を再計算して manifest を書き出す。
 * pin は常に「意図的な更新」なので overwrite 制御は行わない（dry-run のみ温存）。
 * ADR-030 §Decision.3.①。
 */
export class PinIntegrityUseCase {
  constructor(
    private readonly scanner: FileScannerPort,
    private readonly hasher: Sha256HasherPort,
    private readonly repository: IntegrityManifestRepositoryPort,
  ) {}

  async execute(input: PinIntegrityInput = {}): Promise<PinIntegrityOutput> {
    const target = IntegrityTarget.defaultTargets();
    const include = input.include ?? target.include;
    const exclude = input.exclude ?? target.exclude;
    const dryRun = input.dryRun === true;

    const savedPath = this.repository.getPath();

    const scanned = await this.scanner.scan({ include, exclude });
    const sortedPaths = [...scanned].sort();

    const files = new Map<string, string>();
    for (const path of sortedPaths) {
      files.set(path, await this.hasher.hashFile(path));
    }

    const manifest = IntegrityManifest.create({ files });
    const outputFiles = manifest.sortedEntries().map(([path, digest]) => ({ path, digest }));

    if (dryRun) {
      return {
        savedPath,
        entryCount: outputFiles.length,
        dryRun: true,
        files: outputFiles,
      };
    }

    const writtenPath = await this.repository.save(manifest);
    return {
      savedPath: writtenPath,
      entryCount: outputFiles.length,
      dryRun: false,
      files: outputFiles,
    };
  }
}
