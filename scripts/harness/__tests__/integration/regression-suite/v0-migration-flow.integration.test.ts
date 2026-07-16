// @unit regression-suite
// @layer infrastructure
// @story H15-01
import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { buildRegressionSuite } from '../../../regression-suite/composition-root.js';

target('v0 移行フロー統合（実配線・実 FS）', () => {
  // IT-FLOW-V0Mig-001
  describe('AnalyzeV0MigrationUseCase→MigrationAnalyzer→V0SpecReader が実 FS を読み分析サマリーを返すこと', () => {
    context('baseDir に .test.ts を 3 件配置して dryRun 分析する場合', () => {
      it('AnalyzeMigrationOutput.totalCount=3（実ファイル走査に基づく件数）', async () => {
        // Arrange
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-v0-analyze-'));
        try {
          await writeFile(path.join(baseDir, 'a.test.ts'), 'export {};', 'utf-8');
          await writeFile(path.join(baseDir, 'b.test.ts'), 'export {};', 'utf-8');
          await writeFile(path.join(baseDir, 'c.test.ts'), 'export {};', 'utf-8');
          const suite = buildRegressionSuite(baseDir);

          // Act
          const actual = await suite.analyzeV0MigrationUseCase.execute({ dryRun: true });

          // Assert
          expect(actual.totalCount).toBe(3);
          expect(actual.migratedCount).toBe(3);
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-FLOW-V0Mig-002
  describe('MigrateV0TestsUseCase(confirmExecute=true) が実 Markdown リポジトリへ永続化すること', () => {
    context('baseDir に .test.ts を 2 件配置して confirmExecute=true で実行する場合', () => {
      it('migration-mappings.md が実 FS に生成され両ファイルの行が含まれること', async () => {
        // Arrange
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-v0-migrate-'));
        try {
          await writeFile(path.join(baseDir, 'alpha.test.ts'), 'export {};', 'utf-8');
          await writeFile(path.join(baseDir, 'beta.test.ts'), 'export {};', 'utf-8');
          const suite = buildRegressionSuite(baseDir);

          // Act
          const actual = await suite.migrateV0TestsUseCase.execute({ confirmExecute: true });

          // Assert
          expect(actual.mappings.length).toBe(2);
          const mappingPath = path.join(baseDir, 'migration-mappings.md');
          const content = await readFile(mappingPath, 'utf-8');
          expect(content).toContain('alpha.test.ts');
          expect(content).toContain('beta.test.ts');
          expect(content).toContain('| migrated |');
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-FLOW-V0Mig-003
  describe('MigrateV0TestsUseCase(confirmExecute=false) はドライランで永続化しないこと', () => {
    context('baseDir に .test.ts を配置して confirmExecute=false で実行する場合', () => {
      it('migration-mappings.md が生成されないこと（実 FS 上に不在）', async () => {
        // Arrange
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-v0-dryrun-'));
        try {
          await writeFile(path.join(baseDir, 'gamma.test.ts'), 'export {};', 'utf-8');
          const suite = buildRegressionSuite(baseDir);

          // Act
          await suite.migrateV0TestsUseCase.execute({ confirmExecute: false });

          // Assert
          await expect(access(path.join(baseDir, 'migration-mappings.md'))).rejects.toThrow();
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    });
  });
});
