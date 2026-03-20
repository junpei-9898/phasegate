import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { V0TestMigration } from '../../../../regression-suite/domain/aggregates/v0-test-migration.js';
import { V0TestId } from '../../../../regression-suite/domain/value-objects/v0-test-id.js';
import { V1TestPath } from '../../../../regression-suite/domain/value-objects/v1-test-path.js';
import { BiomeModificationSpec } from '../../../../regression-suite/domain/value-objects/biome-modification-spec.js';

const createV0TestId = (path = 'scripts/__tests__/unit/harness-error.test.ts') =>
  V0TestId.create(path);
const createV1TestPath = (
  path = 'scripts/harness/__tests__/unit/harness-error/harness-error.test.ts'
) => V1TestPath.create(path);
const createBiomeModificationSpec = () =>
  BiomeModificationSpec.create({
    targetApi: 'eslint-plugin-api',
    replacementApi: 'biome-lint-rule',
    modificationReason: 'ESLint固有APIをBiome対応APIに置換',
  });

target('V0TestMigration', () => {
  // UT-RS-001
  describe('create: 有効なV0TestIdで生成する場合', () => {
    context('v0TestId が有効な相対パスの場合', () => {
      it('migrationStatus=pending・v1TestPath=null・biomeModificationSpec=null・skipReason=null で生成される', () => {
        // Arrange
        const v0TestId = createV0TestId('scripts/__tests__/unit/harness-error.test.ts');

        // Act
        const actual = V0TestMigration.create(v0TestId);

        // Assert
        expect(actual.migrationStatus).toBe('pending');
        expect(actual.v1TestPath).toBeNull();
        expect(actual.biomeModificationSpec).toBeNull();
        expect(actual.skipReason).toBeNull();
        expect(actual.v0TestId.value).toBe('scripts/__tests__/unit/harness-error.test.ts');
      });
    });
  });

  // UT-RS-002
  describe('create: v0TestId が空文字列の場合', () => {
    context('空文字列が渡された場合', () => {
      it('エラーをスロー / 生成失敗', () => {
        // Arrange / Act / Assert
        expect(() => V0TestMigration.create(V0TestId.create(''))).toThrow();
      });
    });
  });

  // UT-RS-003
  describe('migrate: pending状態から正常遷移する場合', () => {
    context('pending状態のV0TestMigration に有効なV1TestPath を渡した場合', () => {
      it('migrationStatus=migrated・v1TestPath が設定される・biomeModificationSpec=null', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const v1TestPath = createV1TestPath();

        // Act
        migration.migrate(v1TestPath);
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('migrated');
        expect(actual.v1TestPath).not.toBeNull();
        expect(actual.v1TestPath?.value).toBe(v1TestPath.value);
        expect(actual.biomeModificationSpec).toBeNull();
      });
    });
  });

  // UT-RS-004
  describe('migrate: migrated状態での二重migrate呼び出し禁止（INV-1）', () => {
    context('migrated状態のV0TestMigration にmigrate を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act / Assert
        expect(() => migration.migrate(createV1TestPath())).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-005
  describe('migrate: modified状態でのmigrate呼び出し禁止（INV-1）', () => {
    context('modified状態のV0TestMigration にmigrate を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrateWithModification(createV1TestPath(), createBiomeModificationSpec());

        // Act / Assert
        expect(() => migration.migrate(createV1TestPath())).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-006
  describe('migrate: skipped状態でのmigrate呼び出し禁止（INV-1）', () => {
    context('skipped状態のV0TestMigration にmigrate を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.skip('out-of-scope');

        // Act / Assert
        expect(() => migration.migrate(createV1TestPath())).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-007
  describe('migrateWithModification: pending状態から正常遷移する場合（INV-2, INV-4, INV-5）', () => {
    context('pending状態のV0TestMigration に有効なV1TestPath と BiomeModificationSpec を渡した場合', () => {
      it('migrationStatus=modified・v1TestPath が設定される・biomeModificationSpec が設定される', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const v1TestPath = createV1TestPath();
        const biomeSpec = createBiomeModificationSpec();

        // Act
        migration.migrateWithModification(v1TestPath, biomeSpec);
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('modified');
        expect(actual.v1TestPath).not.toBeNull();
        expect(actual.biomeModificationSpec).not.toBeNull();
        expect(actual.biomeModificationSpec?.targetApi).toBe(biomeSpec.targetApi);
      });
    });
  });

  // UT-RS-008
  describe('migrateWithModification: migrated状態での呼び出し禁止（INV-2）', () => {
    context('migrated状態のV0TestMigration に migrateWithModification を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act / Assert
        expect(() =>
          migration.migrateWithModification(createV1TestPath(), createBiomeModificationSpec())
        ).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-009
  describe('migrateWithModification: modified後にbiomeModificationSpecがnullでないこと（INV-5）', () => {
    context('migrateWithModification を呼び出した後', () => {
      it('biomeModificationSpec が非null であること', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const biomeSpec = createBiomeModificationSpec();

        // Act
        migration.migrateWithModification(createV1TestPath(), biomeSpec);
        const actual = migration;

        // Assert
        expect(actual.biomeModificationSpec).not.toBeNull();
        expect(actual.biomeModificationSpec?.replacementApi).toBe(biomeSpec.replacementApi);
      });
    });
  });

  // UT-RS-010
  describe("skip: pending状態から skip('out-of-scope') は正常遷移する（INV-3）", () => {
    context("pending状態のV0TestMigration に skip('out-of-scope') を呼び出した場合", () => {
      it("migrationStatus=skipped・skipReason='out-of-scope'・v1TestPath=null", () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());

        // Act
        migration.skip('out-of-scope');
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('skipped');
        expect(actual.skipReason).toBe('out-of-scope');
        expect(actual.v1TestPath).toBeNull();
      });
    });
  });

  // UT-RS-011
  describe("skip: pending状態から skip('orchestration-migrated') は正常遷移する", () => {
    context("pending状態のV0TestMigration に skip('orchestration-migrated') を呼び出した場合", () => {
      it("migrationStatus=skipped・skipReason='orchestration-migrated'", () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());

        // Act
        migration.skip('orchestration-migrated');
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('skipped');
        expect(actual.skipReason).toBe('orchestration-migrated');
      });
    });
  });

  // UT-RS-012
  describe('skip: migrated状態での skip 呼び出し禁止（INV-3）', () => {
    context('migrated状態のV0TestMigration に skip を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act / Assert
        expect(() => migration.skip('out-of-scope')).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-013
  describe('skip: skipped状態での skip 呼び出し禁止（INV-3）', () => {
    context('skipped状態のV0TestMigration に skip を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.skip('out-of-scope');

        // Act / Assert
        expect(() => migration.skip('out-of-scope')).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-014
  describe('toMigrationMapping: migrated状態で正常返却する（INV-4）', () => {
    context('migrated状態のV0TestMigration に toMigrationMapping を呼び出した場合', () => {
      it("MigrationMapping が返される。migrationStatus='migrated'", () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act
        const actual = migration.toMigrationMapping();

        // Assert
        expect(actual.migrationStatus).toBe('migrated');
        expect(actual.v0TestId).not.toBeNull();
        expect(actual.v1TestPath).not.toBeNull();
      });
    });
  });

  // UT-RS-015
  describe('toMigrationMapping: modified状態で正常返却する（INV-4）', () => {
    context('modified状態のV0TestMigration（biomeModificationSpec付き）に toMigrationMapping を呼び出した場合', () => {
      it('MigrationMapping が返される。biomeModification が含まれる', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const biomeSpec = createBiomeModificationSpec();
        migration.migrateWithModification(createV1TestPath(), biomeSpec);

        // Act
        const actual = migration.toMigrationMapping();

        // Assert
        expect(actual.migrationStatus).toBe('modified');
        expect(actual.biomeModification).not.toBeNull();
        expect(actual.biomeModification?.targetApi).toBe(biomeSpec.targetApi);
      });
    });
  });

  // UT-RS-016
  describe('toMigrationMapping: pending状態で呼び出すとエラー', () => {
    context('pending状態のV0TestMigration に toMigrationMapping を呼び出した場合', () => {
      it('InvalidMigrationStateError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());

        // Act / Assert
        expect(() => migration.toMigrationMapping()).toThrow('InvalidMigrationStateError');
      });
    });
  });

  // UT-RS-017
  describe('toMigrationMapping: skipped状態で呼び出すとエラー', () => {
    context('skipped状態のV0TestMigration に toMigrationMapping を呼び出した場合', () => {
      it('InvalidMigrationStateError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.skip('out-of-scope');

        // Act / Assert
        expect(() => migration.toMigrationMapping()).toThrow('InvalidMigrationStateError');
      });
    });
  });
});
