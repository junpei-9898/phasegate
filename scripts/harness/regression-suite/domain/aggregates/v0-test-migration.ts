// @layer domain
import type { V0TestId } from '../value-objects/v0-test-id.js';
import type { V1TestPath } from '../value-objects/v1-test-path.js';
import type { BiomeModificationSpec } from '../value-objects/biome-modification-spec.js';
import { MigrationMapping } from '../value-objects/migration-mapping.js';

export type MigrationStatus = 'pending' | 'migrated' | 'modified' | 'skipped';
export type SkipReason = 'out-of-scope' | 'orchestration-migrated';

export class V0TestMigration {
  readonly v0TestId: V0TestId;
  private _migrationStatus: MigrationStatus;
  private _v1TestPath: V1TestPath | null;
  private _biomeModificationSpec: BiomeModificationSpec | null;
  private _skipReason: SkipReason | null;

  private constructor(v0TestId: V0TestId) {
    this.v0TestId = v0TestId;
    this._migrationStatus = 'pending';
    this._v1TestPath = null;
    this._biomeModificationSpec = null;
    this._skipReason = null;
  }

  static create(v0TestId: V0TestId): V0TestMigration {
    // V0TestId already validates that path is non-empty
    return new V0TestMigration(v0TestId);
  }

  get migrationStatus(): MigrationStatus {
    return this._migrationStatus;
  }

  get v1TestPath(): V1TestPath | null {
    return this._v1TestPath;
  }

  get biomeModificationSpec(): BiomeModificationSpec | null {
    return this._biomeModificationSpec;
  }

  get skipReason(): SkipReason | null {
    return this._skipReason;
  }

  migrate(v1TestPath: V1TestPath): void {
    if (this._migrationStatus !== 'pending') {
      throw new Error(
        `MigrationAlreadyCompletedError: Cannot migrate from status '${this._migrationStatus}'`
      );
    }
    this._migrationStatus = 'migrated';
    this._v1TestPath = v1TestPath;
    this._biomeModificationSpec = null;
    this._skipReason = null;
  }

  migrateWithModification(v1TestPath: V1TestPath, biomeSpec: BiomeModificationSpec): void {
    if (this._migrationStatus !== 'pending') {
      throw new Error(
        `MigrationAlreadyCompletedError: Cannot migrateWithModification from status '${this._migrationStatus}'`
      );
    }
    this._migrationStatus = 'modified';
    this._v1TestPath = v1TestPath;
    this._biomeModificationSpec = biomeSpec;
    this._skipReason = null;
  }

  skip(reason: SkipReason): void {
    if (this._migrationStatus !== 'pending') {
      throw new Error(
        `MigrationAlreadyCompletedError: Cannot skip from status '${this._migrationStatus}'`
      );
    }
    this._migrationStatus = 'skipped';
    this._skipReason = reason;
    this._v1TestPath = null;
    this._biomeModificationSpec = null;
  }

  toMigrationMapping(): MigrationMapping {
    if (this._migrationStatus !== 'migrated' && this._migrationStatus !== 'modified') {
      throw new Error(
        `InvalidMigrationStateError: Cannot create MigrationMapping from status '${this._migrationStatus}'`
      );
    }
    return MigrationMapping.create({
      v0TestId: this.v0TestId,
      v1TestPath: this._v1TestPath!,
      migrationStatus: this._migrationStatus,
      biomeModification: this._biomeModificationSpec,
    });
  }
}
