import { MigrationAnalyzer } from '../../domain/services/migration-analyzer.js';
import type { V0SpecReaderPort } from '../../domain/ports/v0-spec-reader-port.js';
import type { MigrationMappingRepositoryPort } from '../../domain/ports/migration-mapping-repository-port.js';
import type { AnalyzeMigrationInput } from '../dto/analyze-migration-input.js';
import type { AnalyzeMigrationOutput } from '../dto/analyze-migration-output.js';

export class AnalyzeV0MigrationUseCase {
  private readonly migrationAnalyzer: MigrationAnalyzer;

  constructor(
    v0SpecReaderPort: V0SpecReaderPort,
    migrationMappingRepositoryPort: MigrationMappingRepositoryPort
  ) {
    this.migrationAnalyzer = new MigrationAnalyzer(
      v0SpecReaderPort,
      migrationMappingRepositoryPort
    );
  }

  async execute(input: AnalyzeMigrationInput = {}): Promise<AnalyzeMigrationOutput> {
    const migrations = await this.migrationAnalyzer.analyzeAll({
      dryRun: input.dryRun ?? true,
      outOfScopePattern: input.outOfScopePattern,
      orchestrationMigratedPattern: input.orchestrationMigratedPattern,
    });

    const migratedCount = migrations.filter((m) => m.migrationStatus === 'migrated').length;
    const modifiedCount = migrations.filter((m) => m.migrationStatus === 'modified').length;
    const skippedCount = migrations.filter((m) => m.migrationStatus === 'skipped').length;

    return {
      totalCount: migrations.length,
      migratedCount,
      modifiedCount,
      skippedCount,
    };
  }
}
