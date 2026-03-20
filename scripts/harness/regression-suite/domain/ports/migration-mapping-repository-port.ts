import type { V0TestMigration } from '../aggregates/v0-test-migration.js';
import type { V0TestId } from '../value-objects/v0-test-id.js';
import type { MigrationMapping } from '../value-objects/migration-mapping.js';

export interface MigrationMappingRepositoryPort {
  save(migration: V0TestMigration): Promise<void>;
  findAll(): Promise<MigrationMapping[]>;
  findById(v0TestId: V0TestId): Promise<MigrationMapping | null>;
}
