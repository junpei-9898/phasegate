// @layer application
import { MigrationAnalyzer } from '../../domain/services/migration-analyzer.js';
import type { V0SpecReaderPort } from '../../domain/ports/v0-spec-reader-port.js';
import type { MigrationMappingRepositoryPort } from '../../domain/ports/migration-mapping-repository-port.js';
import { MigrationMappingMapper } from '../mappers/migration-mapping-mapper.js';
import type { MigrateV0TestsInput } from '../dto/migrate-v0-tests-input.js';
import type { MigrateV0TestsOutput } from '../dto/migrate-v0-tests-output.js';

export class MigrateV0TestsUseCase {
  private readonly migrationAnalyzer: MigrationAnalyzer;

  constructor(
    private readonly v0SpecReaderPort: V0SpecReaderPort,
    private readonly migrationMappingRepositoryPort: MigrationMappingRepositoryPort
  ) {
    this.migrationAnalyzer = new MigrationAnalyzer(
      v0SpecReaderPort,
      migrationMappingRepositoryPort
    );
  }

  async execute(input: MigrateV0TestsInput = {}): Promise<MigrateV0TestsOutput> {
    const migrations = await this.migrationAnalyzer.analyzeAll({
      dryRun: !(input.confirmExecute ?? false),
      outOfScopePattern: input.outOfScopePattern,
      biomeModificationRequired: input.biomeModificationRequired,
    });

    const migratedCount = migrations.filter((m) => m.migrationStatus === 'migrated').length;
    const modifiedCount = migrations.filter((m) => m.migrationStatus === 'modified').length;
    const skippedCount = migrations.filter((m) => m.migrationStatus === 'skipped').length;

    const mappingOutputs = migrations
      .map((m) => MigrationMappingMapper.toOutput(m))
      .filter((m) => m !== null) as NonNullable<ReturnType<typeof MigrationMappingMapper.toOutput>>[];

    return {
      mappings: mappingOutputs,
      totalCount: migrations.length,
      migratedCount,
      modifiedCount,
      skippedCount,
    };
  }
}
