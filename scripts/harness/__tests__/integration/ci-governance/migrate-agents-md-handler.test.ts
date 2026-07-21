// @layer test
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { buildCiGovernance } from '../../../ci-governance/composition-root.js';
import { MigrateAgentsMdHandler } from '../../../ci-governance/presentation/handlers/migrate-agents-md-handler.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

target('MigrateAgentsMdHandler', () => {
  describe('正常系', () => {
    describe('composition root経由でvalidate-onlyを実行する場合', () => {
      it('composition root経由のvalidate-onlyは一時AGENTS.mdを書き換えない', async () => {
        // Arrange
        const baseDir = await mkdtemp(join(tmpdir(), 'phasegate-migrate-handler-'));
        temporaryDirectories.push(baseDir);
        const agentsMdPath = join(baseDir, 'AGENTS.md');
        const expected = '# Temporary AGENTS.md\n\nValidation must not modify this file.\n';
        await writeFile(agentsMdPath, expected, 'utf-8');
        const compositionRoot = buildCiGovernance(baseDir);

        // Act
        const actual = await compositionRoot.migrateAgentsMdHandler.handle({ validateOnly: true });

        // Assert
        const actualAgentsMd = await readFile(agentsMdPath, 'utf-8');
        expect(actual.exitCode).toBe(0);
        expect(actualAgentsMd).toBe(expected);
      });
    });

    // IT-API-MigrateAgentsMdHandler-001
    describe('dryRun=trueでMigrateAgentsMdUseCaseがdryRun=trueで呼ばれること', () => {
      context('args.dryRun=trueを渡した場合', () => {
        it('exitCode=0・MigrateAgentsMdUseCase.execute({dryRun:true})が呼ばれる', async () => {
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({ success: true, errors: [], kpiMet: null, addedPointers: 0, linesBefore: null, linesAfter: null }),
          };
          const handler = new MigrateAgentsMdHandler(migrateUseCase as any);
          const actual = await handler.handle({ dryRun: true });
          expect(actual.exitCode).toBe(0);
          expect(migrateUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
        });
      });
    });

    // IT-API-MigrateAgentsMdHandler-002
    describe('KPI達成時（kpiMet=true）にexitCode=0が返ること', () => {
      context('MigrateAgentsMdUseCase.execute()→success=true, kpiMet=trueが返る場合', () => {
        it('exitCode=0が返る', async () => {
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: true,
              errors: [],
              kpiMet: true,
              addedPointers: 2,
              linesBefore: 100,
              linesAfter: 40,
            }),
          };
          const handler = new MigrateAgentsMdHandler(migrateUseCase as any);
          const actual = await handler.handle({ dryRun: false });
          expect(actual.exitCode).toBe(0);
        });
      });
    });

    // IT-API-MigrateAgentsMdHandler-003
    describe('format=jsonで出力がJSON形式になること', () => {
      context('args.format="json"を渡した場合', () => {
        it('output がJSONパース可能な文字列になる', async () => {
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: true,
              errors: [],
              kpiMet: true,
              addedPointers: 1,
              linesBefore: 20,
              linesAfter: 8,
            }),
          };
          const handler = new MigrateAgentsMdHandler(migrateUseCase as any);
          const actual = await handler.handle({ dryRun: false, format: 'json' });
          expect(() => JSON.parse(actual.output)).not.toThrow();
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-API-MigrateAgentsMdHandler-004
    describe('Dead Pointer検出時にexitCode=1が返ること', () => {
      context('MigrateAgentsMdUseCase.execute()→success=false, errors=[DEAD_POINTER]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: false,
              errors: [{ code: 'AGENTS_MD_DEAD_POINTER', message: 'dead pointer detected' }],
              kpiMet: null,
              addedPointers: 0,
              linesBefore: null,
              linesAfter: null,
            }),
          };
          const handler = new MigrateAgentsMdHandler(migrateUseCase as any);
          const actual = await handler.handle({ dryRun: false });
          expect(actual.exitCode).toBe(1);
        });
      });
    });

    // IT-API-MigrateAgentsMdHandler-005
    describe('KPI未達（kpiMet=false）でexitCode=1が返ること', () => {
      context('MigrateAgentsMdUseCase.execute()→success=true, kpiMet=falseが返る場合', () => {
        it('exitCode=1が返る', async () => {
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: true,
              errors: [],
              kpiMet: false,
              addedPointers: 1,
              linesBefore: 100,
              linesAfter: 60,
            }),
          };
          const handler = new MigrateAgentsMdHandler(migrateUseCase as any);
          const actual = await handler.handle({ dryRun: false });
          expect(actual.exitCode).toBe(1);
        });
      });
    });
  });
});
