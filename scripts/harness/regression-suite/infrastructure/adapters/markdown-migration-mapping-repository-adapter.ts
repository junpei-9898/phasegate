import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { V0TestMigration } from '../../domain/aggregates/v0-test-migration.js';
import type { V0TestId } from '../../domain/value-objects/v0-test-id.js';
import type { MigrationMapping } from '../../domain/value-objects/migration-mapping.js';
import type { MigrationMappingRepositoryPort } from '../../domain/ports/migration-mapping-repository-port.js';

export class MarkdownMigrationMappingRepositoryAdapter implements MigrationMappingRepositoryPort {
  constructor(private readonly filePath: string) {}

  async save(migration: V0TestMigration): Promise<void> {
    if (migration.migrationStatus === 'pending' || migration.migrationStatus === 'skipped') {
      return;
    }

    const mapping = migration.toMigrationMapping();
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    let content = '';
    try {
      content = await fs.readFile(this.filePath, 'utf-8');
    } catch {
      content = '# v0 -> v1 Test Mapping\n\n| v0TestId | v1TestPath | status | biomeModification |\n|---|---|---|---|\n';
    }

    const row = `| ${mapping.v0TestId.value} | ${mapping.v1TestPath.value} | ${mapping.migrationStatus} | ${mapping.biomeModification ? JSON.stringify(mapping.biomeModification) : '-'} |\n`;
    content += row;

    await fs.writeFile(this.filePath, content, 'utf-8');
  }

  async findAll(): Promise<MigrationMapping[]> {
    return [];
  }

  async findById(_v0TestId: V0TestId): Promise<MigrationMapping | null> {
    return null;
  }
}
