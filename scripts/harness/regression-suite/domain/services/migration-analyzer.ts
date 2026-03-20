import { V0TestMigration } from '../aggregates/v0-test-migration.js';
import { V1TestPath } from '../value-objects/v1-test-path.js';
import { BiomeModificationSpec } from '../value-objects/biome-modification-spec.js';
import type { V0SpecReaderPort } from '../ports/v0-spec-reader-port.js';
import type { MigrationMappingRepositoryPort } from '../ports/migration-mapping-repository-port.js';

export interface MigrationAnalyzerOptions {
  dryRun?: boolean;
  outOfScopePattern?: string[];
  orchestrationMigratedPattern?: string[];
  biomeModificationRequired?: boolean;
}

export class MigrationAnalyzer {
  constructor(
    private readonly v0SpecReaderPort: V0SpecReaderPort,
    private readonly migrationMappingRepositoryPort: MigrationMappingRepositoryPort
  ) {}

  async analyzeAll(options: MigrationAnalyzerOptions = {}): Promise<readonly V0TestMigration[]> {
    let v0TestIds;
    try {
      v0TestIds = await this.v0SpecReaderPort.readAll();
    } catch (err) {
      throw new Error(`V0SpecReadError: ${err instanceof Error ? err.message : String(err)}`);
    }

    const migrations: V0TestMigration[] = [];

    for (const v0TestId of v0TestIds) {
      const migration = V0TestMigration.create(v0TestId);

      // Check out-of-scope patterns
      if (options.outOfScopePattern?.some((pattern) => v0TestId.value.includes(pattern))) {
        migration.skip('out-of-scope');
      } else if (
        options.orchestrationMigratedPattern?.some((pattern) => v0TestId.value.includes(pattern))
      ) {
        migration.skip('orchestration-migrated');
      } else if (options.biomeModificationRequired) {
        // Biome modification required
        const v1TestPath = V1TestPath.create(
          v0TestId.value.replace('scripts/__tests__/', 'scripts/harness/__tests__/unit/')
        );
        const biomeSpec = BiomeModificationSpec.create({
          targetApi: 'eslint-plugin-api',
          replacementApi: 'biome-lint-rule',
          modificationReason: 'ESLint固有APIをBiome対応APIに置換',
        });
        migration.migrateWithModification(v1TestPath, biomeSpec);
      } else {
        // Normal migration
        const v1TestPath = V1TestPath.create(
          v0TestId.value.replace('scripts/__tests__/', 'scripts/harness/__tests__/unit/')
        );
        migration.migrate(v1TestPath);
      }

      if (!options.dryRun) {
        try {
          await this.migrationMappingRepositoryPort.save(migration);
        } catch (err) {
          throw new Error(`MigrationPersistenceError: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      migrations.push(migration);
    }

    return migrations;
  }
}
