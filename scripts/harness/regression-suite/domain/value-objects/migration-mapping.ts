import type { V0TestId } from './v0-test-id.js';
import type { V1TestPath } from './v1-test-path.js';
import type { BiomeModificationSpec } from './biome-modification-spec.js';

export interface MigrationMappingProps {
  v0TestId: V0TestId;
  v1TestPath: V1TestPath;
  migrationStatus: 'migrated' | 'modified';
  biomeModification: BiomeModificationSpec | null;
}

export class MigrationMapping {
  readonly v0TestId: V0TestId;
  readonly v1TestPath: V1TestPath;
  readonly migrationStatus: 'migrated' | 'modified';
  readonly biomeModification: BiomeModificationSpec | null;

  private constructor(props: MigrationMappingProps) {
    this.v0TestId = props.v0TestId;
    this.v1TestPath = props.v1TestPath;
    this.migrationStatus = props.migrationStatus;
    this.biomeModification = props.biomeModification;
    Object.freeze(this);
  }

  static create(props: MigrationMappingProps): MigrationMapping {
    return new MigrationMapping(props);
  }

  equals(other: MigrationMapping): boolean {
    return (
      this.v0TestId.equals(other.v0TestId) &&
      this.v1TestPath.equals(other.v1TestPath) &&
      this.migrationStatus === other.migrationStatus
    );
  }
}
