// @unit regression-suite
// @layer infrastructure
// @story H15-01
import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { MarkdownMigrationMappingRepositoryAdapter } from '../../../regression-suite/infrastructure/adapters/markdown-migration-mapping-repository-adapter.js';
import { V0TestMigration } from '../../../regression-suite/domain/aggregates/v0-test-migration.js';
import { V0TestId } from '../../../regression-suite/domain/value-objects/v0-test-id.js';
import { V1TestPath } from '../../../regression-suite/domain/value-objects/v1-test-path.js';
import { BiomeModificationSpec } from '../../../regression-suite/domain/value-objects/biome-modification-spec.js';

const buildMigratedAggregate = (v0: string, v1: string): V0TestMigration => {
  const migration = V0TestMigration.create(V0TestId.create(v0));
  migration.migrate(V1TestPath.create(v1));
  return migration;
};

target('MarkdownMigrationMappingRepositoryAdapter（実 FS 永続化）', () => {
  // IT-ADP-MigrationRepo-001
  describe('save: migrated 状態の集約を Markdown テーブル行として実ファイルに追記すること', () => {
    context('migrated 状態の V0TestMigration を保存する場合', () => {
      it('v0_v1_test_mapping.md に v0TestId/v1TestPath/status=migrated の行が書き出されること', async () => {
        // Arrange
        const dir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-migrepo-'));
        const filePath = path.join(dir, 'v0_v1_test_mapping.md');
        try {
          const adapter = new MarkdownMigrationMappingRepositoryAdapter(filePath);
          const migration = buildMigratedAggregate('scripts/__tests__/x.test.ts', 'scripts/harness/x.test.ts');

          // Act
          await adapter.save(migration);

          // Assert
          const content = await readFile(filePath, 'utf-8');
          expect(content).toContain('scripts/__tests__/x.test.ts');
          expect(content).toContain('scripts/harness/x.test.ts');
          expect(content).toContain('| migrated |');
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-MigrationRepo-002
  describe('save: modified 状態の集約に biomeModification 情報を含めて書き出すこと', () => {
    context('BiomeModificationSpec 付きの modified 集約を保存する場合', () => {
      it('書き出された行に targetApi/replacementApi の情報が含まれること', async () => {
        // Arrange
        const dir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-migrepo-mod-'));
        const filePath = path.join(dir, 'v0_v1_test_mapping.md');
        try {
          const adapter = new MarkdownMigrationMappingRepositoryAdapter(filePath);
          const migration = V0TestMigration.create(V0TestId.create('scripts/__tests__/y.test.ts'));
          migration.migrateWithModification(
            V1TestPath.create('scripts/harness/y.test.ts'),
            BiomeModificationSpec.create({
              targetApi: 'oldApi',
              replacementApi: 'newApi',
              modificationReason: 'Biome 移行に伴う API 差し替え',
            }),
          );

          // Act
          await adapter.save(migration);

          // Assert
          const content = await readFile(filePath, 'utf-8');
          expect(content).toContain('| modified |');
          expect(content).toContain('oldApi');
          expect(content).toContain('newApi');
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-MigrationRepo-003
  describe('save: pending / skipped 状態の集約は永続化しないこと', () => {
    context('skipped 状態の V0TestMigration を保存する場合', () => {
      it('ファイルが作成されず（no-op）例外も発生しないこと', async () => {
        // Arrange
        const dir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-migrepo-skip-'));
        const filePath = path.join(dir, 'v0_v1_test_mapping.md');
        try {
          const adapter = new MarkdownMigrationMappingRepositoryAdapter(filePath);
          const migration = V0TestMigration.create(V0TestId.create('scripts/__tests__/z.test.ts'));
          migration.skip('out-of-scope');

          // Act
          await adapter.save(migration);

          // Assert: skipped は no-op なのでファイルは作られない
          await expect(access(filePath)).rejects.toThrow();
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-MigrationRepo-004
  describe('save: 複数集約の連続保存でテーブル行が追記されること', () => {
    context('2 件の migrated 集約を順に保存する場合', () => {
      it('両方の v0TestId が同一ファイルに含まれること', async () => {
        // Arrange
        const dir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-migrepo-append-'));
        const filePath = path.join(dir, 'v0_v1_test_mapping.md');
        try {
          const adapter = new MarkdownMigrationMappingRepositoryAdapter(filePath);

          // Act
          await adapter.save(buildMigratedAggregate('scripts/__tests__/a.test.ts', 'scripts/harness/a.test.ts'));
          await adapter.save(buildMigratedAggregate('scripts/__tests__/b.test.ts', 'scripts/harness/b.test.ts'));

          // Assert
          const content = await readFile(filePath, 'utf-8');
          expect(content).toContain('scripts/__tests__/a.test.ts');
          expect(content).toContain('scripts/__tests__/b.test.ts');
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });
  });
});
