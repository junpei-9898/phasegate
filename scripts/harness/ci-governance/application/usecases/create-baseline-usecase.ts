// @unit ci-governance
// @layer application

import type { FileScannerPort } from '../../domain/ports/file-scanner-port.js';
import type { FileHasherPort } from '../../domain/ports/file-hasher-port.js';
import type { BaselineRepositoryPort } from '../../domain/ports/baseline-repository-port.js';
import { BaselineEntry } from '../../domain/value-objects/baseline-entry.js';
import { BaselineSnapshot } from '../../domain/value-objects/baseline-snapshot.js';
import type { CreateBaselineInput } from '../dto/create-baseline-input.js';
import type { CreateBaselineOutput } from '../dto/create-baseline-output.js';

export const DEFAULT_BASELINE_INCLUDE: readonly string[] = Object.freeze([
  'scripts/**/*.ts',
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx',
  'docs/product/construction/**/*.md',
  'docs/inception/**/*.md',
]);

export const DEFAULT_BASELINE_EXCLUDE: readonly string[] = Object.freeze([
  'node_modules/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.spec.ts',
]);

export class CreateBaselineUseCase {
  constructor(
    private readonly scanner: FileScannerPort,
    private readonly hasher: FileHasherPort,
    private readonly repository: BaselineRepositoryPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateBaselineInput = {}): Promise<CreateBaselineOutput> {
    const include = input.include ?? DEFAULT_BASELINE_INCLUDE;
    const exclude = input.exclude ?? DEFAULT_BASELINE_EXCLUDE;
    const dryRun = input.dryRun === true;
    const force = input.force === true;

    const savedPath = this.repository.getPath();

    if (!dryRun && !force && (await this.repository.exists())) {
      return {
        savedPath,
        entryCount: 0,
        dryRun: false,
        overwriteBlocked: true,
        files: [],
      };
    }

    const scanned = await this.scanner.scan({ include, exclude });
    const sortedPaths = [...scanned].sort();

    const entries: BaselineEntry[] = [];
    for (const p of sortedPaths) {
      const sha1 = await this.hasher.hashFile(p);
      entries.push(BaselineEntry.create({ path: p, sha1 }));
    }

    const snapshot = BaselineSnapshot.create({
      createdAt: this.clock().toISOString(),
      algorithm: 'sha1',
      entries,
    });

    const outputFiles = entries.map((e) => ({ path: e.path, sha1: e.sha1 }));

    if (dryRun) {
      return {
        savedPath,
        entryCount: snapshot.entryCount,
        dryRun: true,
        overwriteBlocked: false,
        files: outputFiles,
      };
    }

    const writtenPath = await this.repository.save(snapshot);
    return {
      savedPath: writtenPath,
      entryCount: snapshot.entryCount,
      dryRun: false,
      overwriteBlocked: false,
      files: outputFiles,
    };
  }
}
