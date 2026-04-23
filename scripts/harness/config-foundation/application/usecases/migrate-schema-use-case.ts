/**
 * @layer application
 * @unit config-foundation
 *
 * MigrateSchemaUseCase
 * phasegate.config.json の schema を v2 から v3 へアップグレードする。
 * v3 は `architecture` キーの存在で判定する。既に v3 の場合は no-op（alreadyUpToDate=true）。
 *
 * 現時点では v3 のみサポート。targetVersion != 'v3' は UnsupportedSchemaVersionError。
 */

import type { ConfigRepositoryPort } from '../../domain/ports/config-repository-port.js';

export type MigrateSchemaInput = {
  readonly targetVersion: 'v3';
  readonly configPath?: string;
};

export type MigrateSchemaOutput = {
  readonly configPath: string;
  readonly migrated: boolean;
  readonly alreadyUpToDate: boolean;
  readonly appliedChanges: readonly string[];
};

export class UnsupportedSchemaVersionError extends Error {
  constructor(version: string) {
    super(`Unsupported schema version: ${version}. Only 'v3' is supported.`);
    this.name = 'UnsupportedSchemaVersionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidConfigShapeError extends Error {
  constructor(configPath: string) {
    super(`Config is not a JSON object: ${configPath}`);
    this.name = 'InvalidConfigShapeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const V3_ARCHITECTURE_DEFAULT = Object.freeze({ preset: 'clean' });

export class MigrateSchemaUseCase {
  private readonly configRepository: ConfigRepositoryPort;

  constructor(deps: { configRepository: ConfigRepositoryPort }) {
    this.configRepository = deps.configRepository;
  }

  async execute(input: MigrateSchemaInput): Promise<Readonly<MigrateSchemaOutput>> {
    if (input.targetVersion !== 'v3') {
      throw new UnsupportedSchemaVersionError(input.targetVersion);
    }

    const loaded = await this.configRepository.load(input.configPath);

    if (!isPlainObject(loaded.document)) {
      throw new InvalidConfigShapeError(loaded.path);
    }

    if ('architecture' in loaded.document) {
      return Object.freeze({
        configPath: loaded.path,
        migrated: false,
        alreadyUpToDate: true,
        appliedChanges: Object.freeze([]),
      });
    }

    const upgraded: Record<string, unknown> = {
      ...loaded.document,
      architecture: { ...V3_ARCHITECTURE_DEFAULT },
    };
    await this.configRepository.save(loaded.path, upgraded);

    return Object.freeze({
      configPath: loaded.path,
      migrated: true,
      alreadyUpToDate: false,
      appliedChanges: Object.freeze([
        'architecture: { preset: "clean" } を追加',
      ]),
    });
  }
}
