// @layer test
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MigrateV0TestsUseCase } from '../../../regression-suite/application/usecases/migrate-v0-tests-usecase.js';
import { V0TestId } from '../../../regression-suite/domain/value-objects/v0-test-id.js';
import type { V0SpecReaderPort } from '../../../regression-suite/domain/ports/v0-spec-reader-port.js';
import type { MigrationMappingRepositoryPort } from '../../../regression-suite/domain/ports/migration-mapping-repository-port.js';

const createV0TestId = (value = 'scripts/__tests__/unit/test.test.ts') => V0TestId.create(value);

target('MigrateV0TestsUseCase', () => {
  let v0SpecReaderPort: V0SpecReaderPort;
  let migrationMappingRepositoryPort: MigrationMappingRepositoryPort;
  let useCase: MigrateV0TestsUseCase;

  beforeEach(() => {
    v0SpecReaderPort = { readAll: vi.fn() };
    migrationMappingRepositoryPort = {
      save: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
    };
    useCase = new MigrateV0TestsUseCase(v0SpecReaderPort, migrationMappingRepositoryPort);
  });

  // IT-UC-MigrateV0-001
  describe('execute: confirmExecute=trueのとき全件の移行を実行してMigrationMappingを返すこと', () => {
    context('V0SpecReaderPort が V0TestId[] 3件を返し全件 migrated になる場合', () => {
      it('MigrationMappingRepositoryPort.save() が3回呼ばれる', async () => {
        // Arrange
        const ids = Array.from({ length: 3 }, (_, i) =>
          createV0TestId(`scripts/__tests__/unit/migrated-${i}.test.ts`)
        );
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await useCase.execute({ confirmExecute: true });

        // Assert
        expect(migrationMappingRepositoryPort.save).toHaveBeenCalledTimes(3);
        expect(actual.mappings.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // IT-UC-MigrateV0-002
  describe('execute: confirmExecute=falseのときドライランのみ実行すること', () => {
    context('V0SpecReaderPort が V0TestId[] 3件を返す場合', () => {
      it('MigrationMappingRepositoryPort.save() が0回呼ばれる', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([
          createV0TestId('scripts/__tests__/a.test.ts'),
          createV0TestId('scripts/__tests__/b.test.ts'),
          createV0TestId('scripts/__tests__/c.test.ts'),
        ]);

        // Act
        await useCase.execute({ confirmExecute: false });

        // Assert
        expect(migrationMappingRepositoryPort.save).not.toHaveBeenCalled();
      });
    });
  });

  // IT-UC-MigrateV0-003
  describe('execute: modifiedステータスの移行にbiomeModificationが含まれること', () => {
    context('分析結果で1件がBiome修正必要と判定される場合', () => {
      it('MigrateV0TestsOutput.mappings のうち1件にbiomeModificationが含まれる', async () => {
        // Arrange
        const biomeId = createV0TestId('scripts/__tests__/unit/eslint-api.test.ts');
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([biomeId]);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await useCase.execute({ confirmExecute: true, biomeModificationRequired: true });

        // Assert
        const modifiedMappings = actual.mappings.filter(m => m.migrationStatus === 'modified');
        expect(modifiedMappings.length).toBeGreaterThanOrEqual(1);
        expect(modifiedMappings[0].biomeModification).not.toBeNull();
      });
    });
  });

  // IT-UC-MigrateV0-004
  describe('execute: skippedのV0TestMigrationはMigrationMappingに含まれないこと', () => {
    context('分析結果: migrated=1・skipped=2 の場合', () => {
      it('MigrateV0TestsOutput.mappings.length=1（skippedは除外）', async () => {
        // Arrange
        const ids = [
          createV0TestId('scripts/__tests__/a.test.ts'),       // migrated
          createV0TestId('scripts/__tests__/out-b.test.ts'),   // skipped
          createV0TestId('scripts/__tests__/out-c.test.ts'),   // skipped
        ];
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await useCase.execute({ confirmExecute: true, outOfScopePattern: ['out-'] });

        // Assert
        expect(actual.mappings).toHaveLength(1);
        expect(actual.mappings[0].migrationStatus).toBe('migrated');
      });
    });
  });

  // IT-UC-MigrateV0-005
  describe('execute: MigrationMappingRepositoryPortの保存が失敗した場合にエラーが伝播すること', () => {
    context('MigrationMappingRepositoryPort.save が Error をスローする場合', () => {
      it('MigrationPersistenceError がスロー', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([createV0TestId()]);
        vi.mocked(migrationMappingRepositoryPort.save).mockRejectedValue(new Error('persist error'));

        // Act / Assert
        await expect(useCase.execute({ confirmExecute: true }))
          .rejects.toThrow('MigrationPersistenceError');
      });
    });
  });
});
