// @unit config-foundation
// @layer test
// @story ISSUE-014

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.ts';
import { MigrateSchemaUseCase } from '../../../config-foundation/application/usecases/migrate-schema-use-case.ts';
import { FileSystemConfigRepository } from '../../../config-foundation/infrastructure/repositories/file-system-config-repository.ts';
import { withTempDir, writeJsonFile } from './config-foundation-test-fixtures.ts';

target('MigrateSchemaUseCase + FileSystemConfigRepository round-trip', () => {
  describe('v2 config を tmp dir に書き込んで migrate した場合', () => {
    context('architecture キーが無い document を対象にした場合', () => {
      it('IT-CF-MIG-001: architecture: { preset: "clean" } が永続化され、再読込で v3 として見える', async () => {
        await withTempDir(async (tmpDir) => {
          // Arrange
          const configPath = path.join(tmpDir, 'phasegate.config.json');
          const v2Document = {
            project: { name: 'legacy', preset: 'standard' },
            layers: { L1: { enabled: true } },
          };
          writeJsonFile(configPath, v2Document);
          const repository = new FileSystemConfigRepository();
          const sut = new MigrateSchemaUseCase({ configRepository: repository });

          // Act
          const actual = await sut.execute({ targetVersion: 'v3', configPath });

          // Assert
          expect(actual.migrated).toBe(true);
          expect(actual.alreadyUpToDate).toBe(false);
          const persisted = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          expect(persisted).toEqual({
            project: { name: 'legacy', preset: 'standard' },
            layers: { L1: { enabled: true } },
            architecture: { preset: 'clean' },
          });
        });
      });
    });

    context('既に architecture を持つ v3 document を対象にした場合', () => {
      it('IT-CF-MIG-002: ファイルは書き換えられず alreadyUpToDate=true が返る', async () => {
        await withTempDir(async (tmpDir) => {
          // Arrange
          const configPath = path.join(tmpDir, 'phasegate.config.json');
          const v3Document = {
            project: { name: 'modern', preset: 'standard' },
            architecture: { preset: 'hexagonal' },
          };
          writeJsonFile(configPath, v3Document);
          const originalMtime = fs.statSync(configPath).mtimeMs;
          const repository = new FileSystemConfigRepository();
          const sut = new MigrateSchemaUseCase({ configRepository: repository });

          // Act
          const actual = await sut.execute({ targetVersion: 'v3', configPath });

          // Assert
          expect(actual.alreadyUpToDate).toBe(true);
          expect(actual.migrated).toBe(false);
          const afterMtime = fs.statSync(configPath).mtimeMs;
          expect(afterMtime).toBe(originalMtime);
        });
      });
    });
  });
});
