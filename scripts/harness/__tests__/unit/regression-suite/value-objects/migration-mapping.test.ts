// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { V0TestMigration } from '../../../../regression-suite/domain/aggregates/v0-test-migration.js';
import { V0TestId } from '../../../../regression-suite/domain/value-objects/v0-test-id.js';
import { V1TestPath } from '../../../../regression-suite/domain/value-objects/v1-test-path.js';
import { BiomeModificationSpec } from '../../../../regression-suite/domain/value-objects/biome-modification-spec.js';

const createMigratedMigration = () => {
  const m = V0TestMigration.create(V0TestId.create('scripts/__tests__/unit/harness-error.test.ts'));
  m.migrate(V1TestPath.create('scripts/harness/__tests__/unit/harness-error/harness-error.test.ts'));
  return m;
};

const createModifiedMigration = () => {
  const m = V0TestMigration.create(V0TestId.create('scripts/__tests__/unit/harness-error.test.ts'));
  m.migrateWithModification(
    V1TestPath.create('scripts/harness/__tests__/unit/harness-error/harness-error.test.ts'),
    BiomeModificationSpec.create({ targetApi: 'eslint-api', replacementApi: 'biome-api', modificationReason: '置換理由' })
  );
  return m;
};

target('MigrationMapping', () => {
  // UT-RS-080
  describe('migrated状態のV0TestMigrationからMigrationMappingを生成する場合', () => {
    context('migrate()済みの集約からtoMigrationMapping()を呼び出した場合', () => {
      it("MigrationMapping.migrationStatus='migrated'・biomeModification=null", () => {
        const migration = createMigratedMigration();
        const actual = migration.toMigrationMapping();
        expect(actual.migrationStatus).toBe('migrated');
        expect(actual.biomeModification).toBeNull();
        expect(actual.v1TestPath).not.toBeNull();
      });
    });
  });

  // UT-RS-081
  describe('modified状態のV0TestMigrationからMigrationMappingを生成する場合', () => {
    context('migrateWithModification()済みの集約からtoMigrationMapping()を呼び出した場合', () => {
      it("MigrationMapping.migrationStatus='modified'・biomeModification が非null", () => {
        const migration = createModifiedMigration();
        const actual = migration.toMigrationMapping();
        expect(actual.migrationStatus).toBe('modified');
        expect(actual.biomeModification).not.toBeNull();
      });
    });
  });

  // UT-RS-082
  describe('equals: 同一v0TestId/v1TestPath/migrationStatusのMigrationMappingを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = createMigratedMigration().toMigrationMapping();
      const b = createMigratedMigration().toMigrationMapping();
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-083
  describe('immutable: MigrationMappingは読み取り専用', () => {
    it('値を変更しようとしても元の値が保持される', () => {
      const mapping = createMigratedMigration().toMigrationMapping();
      const originalStatus = mapping.migrationStatus;
      try { (mapping as unknown as Record<string, unknown>)['migrationStatus'] = 'modified'; } catch (_) { /* no-op */ }
      expect(mapping.migrationStatus).toBe(originalStatus);
    });
  });
});
