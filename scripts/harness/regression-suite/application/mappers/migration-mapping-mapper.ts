import type { V0TestMigration } from '../../domain/aggregates/v0-test-migration.js';
import type { MigrationMappingOutput } from '../dto/migrate-v0-tests-output.js';

export class MigrationMappingMapper {
  static toOutput(migration: V0TestMigration): MigrationMappingOutput | null {
    if (migration.migrationStatus === 'migrated' || migration.migrationStatus === 'modified') {
      const mapping = migration.toMigrationMapping();
      return {
        v0TestId: mapping.v0TestId.value,
        v1TestPath: mapping.v1TestPath.value,
        migrationStatus: mapping.migrationStatus,
        biomeModification: mapping.biomeModification
          ? {
              targetApi: mapping.biomeModification.targetApi,
              replacementApi: mapping.biomeModification.replacementApi,
              modificationReason: mapping.biomeModification.modificationReason,
            }
          : null,
      };
    }
    return null;
  }
}
