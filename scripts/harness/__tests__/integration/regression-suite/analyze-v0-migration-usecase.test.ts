// @layer test
// @unit regression-suite
// @story H15-01
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { AnalyzeV0MigrationUseCase } from '../../../regression-suite/application/usecases/analyze-v0-migration-usecase.js';
import { V0TestId } from '../../../regression-suite/domain/value-objects/v0-test-id.js';
import type { V0SpecReaderPort } from '../../../regression-suite/domain/ports/v0-spec-reader-port.js';
import type { MigrationMappingRepositoryPort } from '../../../regression-suite/domain/ports/migration-mapping-repository-port.js';

const createV0TestId = (value = 'scripts/__tests__/unit/test.test.ts') => V0TestId.create(value);

target('AnalyzeV0MigrationUseCase', () => {
  let v0SpecReaderPort: V0SpecReaderPort;
  let migrationMappingRepositoryPort: MigrationMappingRepositoryPort;
  let useCase: AnalyzeV0MigrationUseCase;

  beforeEach(() => {
    v0SpecReaderPort = { readAll: vi.fn() };
    migrationMappingRepositoryPort = {
      save: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
    };
    useCase = new AnalyzeV0MigrationUseCase(v0SpecReaderPort, migrationMappingRepositoryPort);
  });

  // IT-UC-AnalyzeMig-001
  describe('execute: v0テスト仕様の分析結果サマリーを返すこと', () => {
    context('V0SpecReaderPort が V0TestId[] 5件を返す場合', () => {
      it('AnalyzeMigrationOutput.totalCount=5・migratedCount+modifiedCount+skippedCount=5', async () => {
        // Arrange
        const ids = Array.from({ length: 5 }, (_, i) =>
          createV0TestId(`scripts/__tests__/unit/test-${i}.test.ts`)
        );
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);

        // Act
        const actual = await useCase.execute({ dryRun: true });

        // Assert
        expect(actual.totalCount).toBe(5);
        expect(actual.migratedCount + actual.modifiedCount + actual.skippedCount).toBe(5);
      });
    });
  });

  // IT-UC-AnalyzeMig-002
  describe('execute: dryRun=trueのときMigrationMappingRepositoryPortが呼ばれないこと', () => {
    context('V0SpecReaderPort が V0TestId[] 3件を返す場合', () => {
      it('MigrationMappingRepositoryPort.save() が0回呼ばれる', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([
          createV0TestId('scripts/__tests__/a.test.ts'),
          createV0TestId('scripts/__tests__/b.test.ts'),
          createV0TestId('scripts/__tests__/c.test.ts'),
        ]);

        // Act
        await useCase.execute({ dryRun: true });

        // Assert
        expect(migrationMappingRepositoryPort.save).not.toHaveBeenCalled();
      });
    });
  });

  // IT-UC-AnalyzeMig-003
  describe('execute: 全件がskippedになる場合にmigratedCount=0を返すこと', () => {
    context('全件がv1スコープ外と判定される場合', () => {
      it('AnalyzeMigrationOutput.migratedCount=0・modifiedCount=0・skippedCount=全件数', async () => {
        // Arrange
        const outOfScopeIds = [
          createV0TestId('scripts/__tests__/out-of-scope-a.test.ts'),
          createV0TestId('scripts/__tests__/out-of-scope-b.test.ts'),
        ];
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(outOfScopeIds);

        // Act
        const actual = await useCase.execute({ dryRun: true, outOfScopePattern: ['out-of-scope'] });

        // Assert
        expect(actual.migratedCount).toBe(0);
        expect(actual.modifiedCount).toBe(0);
        expect(actual.skippedCount).toBe(2);
      });
    });
  });

  // IT-UC-AnalyzeMig-004
  describe('execute: V0SpecReaderPortが失敗した場合にエラーが伝播すること', () => {
    context('V0SpecReaderPort.readAll が Error をスローする場合', () => {
      it('V0SpecReadError がスロー', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockRejectedValue(new Error('read error'));

        // Act / Assert
        await expect(useCase.execute({ dryRun: true }))
          .rejects.toThrow('V0SpecReadError');
      });
    });
  });
});
