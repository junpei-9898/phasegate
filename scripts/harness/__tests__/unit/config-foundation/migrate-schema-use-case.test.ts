// @unit config-foundation
// @layer test
// @story ISSUE-014

import { describe, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.ts';
import {
  InvalidConfigShapeError,
  MigrateSchemaUseCase,
  UnsupportedSchemaVersionError,
} from '../../../config-foundation/application/usecases/migrate-schema-use-case.ts';

const createRepoMock = (document: unknown, loadedPath = '/abs/phasegate.config.json') => ({
  load: vi.fn().mockResolvedValue({ path: loadedPath, document }),
  save: vi.fn().mockResolvedValue(undefined),
});

target('MigrateSchemaUseCase.execute', () => {
  describe('v2 config（architecture キー無し）を入力した場合', () => {
    context('targetVersion=v3 で実行した場合', () => {
      it('architecture: { preset: "clean" } を追記して v3 化し migrated=true を返す', async () => {
        // Arrange
        const v2Document = { project: { name: 'foo', preset: 'standard' } };
        const repo = createRepoMock(v2Document);
        const sut = new MigrateSchemaUseCase({ configRepository: repo });

        // Act
        const actual = await sut.execute({ targetVersion: 'v3' });

        // Assert
        expect(actual.migrated).toBe(true);
        expect(actual.alreadyUpToDate).toBe(false);
        expect(actual.appliedChanges).toHaveLength(1);
        expect(repo.save).toHaveBeenCalledWith('/abs/phasegate.config.json', {
          project: { name: 'foo', preset: 'standard' },
          architecture: { preset: 'clean' },
        });
      });
    });
  });

  describe('v3 config（architecture キー有り）を入力した場合', () => {
    context('targetVersion=v3 で実行した場合', () => {
      it('no-op として alreadyUpToDate=true を返し save を呼ばない', async () => {
        // Arrange
        const v3Document = {
          project: { name: 'foo', preset: 'standard' },
          architecture: { preset: 'onion' },
        };
        const repo = createRepoMock(v3Document);
        const sut = new MigrateSchemaUseCase({ configRepository: repo });

        // Act
        const actual = await sut.execute({ targetVersion: 'v3' });

        // Assert
        expect(actual.migrated).toBe(false);
        expect(actual.alreadyUpToDate).toBe(true);
        expect(repo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('document が JSON object ではない場合', () => {
    context('load 結果が array を返した場合', () => {
      it('InvalidConfigShapeError を throw する', async () => {
        // Arrange
        const repo = createRepoMock([1, 2, 3]);
        const sut = new MigrateSchemaUseCase({ configRepository: repo });

        // Act
        const act = async () => await sut.execute({ targetVersion: 'v3' });

        // Assert
        await expect(act).rejects.toThrow(InvalidConfigShapeError);
      });
    });

    context('load 結果が null を返した場合', () => {
      it('InvalidConfigShapeError を throw する', async () => {
        // Arrange
        const repo = createRepoMock(null);
        const sut = new MigrateSchemaUseCase({ configRepository: repo });

        // Act
        const act = async () => await sut.execute({ targetVersion: 'v3' });

        // Assert
        await expect(act).rejects.toThrow(InvalidConfigShapeError);
      });
    });
  });

  describe('未対応の targetVersion を指定した場合', () => {
    context('targetVersion=v2 を指定した場合', () => {
      it('UnsupportedSchemaVersionError を throw する', async () => {
        // Arrange
        const repo = createRepoMock({});
        const sut = new MigrateSchemaUseCase({ configRepository: repo });

        // Act
        const act = async () =>
          await sut.execute({
            targetVersion: 'v2' as unknown as 'v3',
          });

        // Assert
        await expect(act).rejects.toThrow(UnsupportedSchemaVersionError);
      });
    });
  });

  describe('configPath を指定した場合', () => {
    context('任意のパスを渡した場合', () => {
      it('configRepository.load に渡される', async () => {
        // Arrange
        const v2Document = { project: { name: 'foo' } };
        const repo = createRepoMock(v2Document, '/custom/phasegate.config.json');
        const sut = new MigrateSchemaUseCase({ configRepository: repo });

        // Act
        await sut.execute({ targetVersion: 'v3', configPath: '/custom/phasegate.config.json' });

        // Assert
        expect(repo.load).toHaveBeenCalledWith('/custom/phasegate.config.json');
      });
    });
  });
});
