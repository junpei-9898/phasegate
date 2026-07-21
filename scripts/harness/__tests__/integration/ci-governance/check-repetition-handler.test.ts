// @layer test
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { buildCiGovernance } from '../../../ci-governance/composition-root.js';
import { CheckRepetitionHandler } from '../../../ci-governance/presentation/handlers/check-repetition-handler.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

target('CheckRepetitionHandler', () => {
  describe('正常系', () => {
    describe('composition root経由でresetを実行する場合', () => {
      it('composition root経由のresetは反復記録を初期状態へ戻す', async () => {
        // Arrange
        const baseDir = await mkdtemp(join(tmpdir(), 'phasegate-repetition-handler-'));
        temporaryDirectories.push(baseDir);
        const harnessDir = join(baseDir, '.harness');
        const historyPath = join(harnessDir, 'error-history.json');
        await mkdir(harnessDir, { recursive: true });
        await writeFile(historyPath, JSON.stringify({
          version: '1.0',
          entries: [{ code: 'L2-001', occurrenceCount: 3, escalated: true, threshold: 3 }],
        }), 'utf-8');
        const compositionRoot = buildCiGovernance(baseDir);

        // Act
        const actual = await compositionRoot.checkRepetitionHandler.handle({ errorCode: 'L2-001', reset: true });

        // Assert
        const persisted = JSON.parse(await readFile(historyPath, 'utf-8')) as {
          entries: Array<{ code: string; occurrenceCount: number; escalated: boolean }>;
        };
        const actualEntry = persisted.entries.find((entry) => entry.code === 'L2-001');
        expect(actual.exitCode).toBe(0);
        expect(actualEntry).toEqual(expect.objectContaining({ occurrenceCount: 0, escalated: false }));
      });
    });

    // IT-API-CheckRepetitionHandler-001
    describe('--error-code指定でCheckEscalationUseCaseが呼ばれること', () => {
      context('args.errorCode="L1-001"を渡した場合', () => {
        it('エスカレーション対象でない反復記録はexitCode=0を返す', async () => {
          // Arrange
          const checkUseCase = {
            execute: vi.fn().mockResolvedValue({ exists: true, currentCount: 1, escalated: false }),
          };
          const resetUseCase = { execute: vi.fn() };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);

          // Act
          const actual = await handler.handle({ errorCode: 'L1-001' });

          // Assert
          expect(actual.exitCode).toBe(0);
          expect(checkUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'L1-001' }));
        });
      });
    });

    // IT-API-CheckRepetitionHandler-002
    describe('--resetフラグ付きでResetRepetitionUseCaseが呼ばれること', () => {
      context('args.reset=trueを渡した場合', () => {
        it('exitCode=0・ResetRepetitionUseCase.execute()が呼ばれる', async () => {
          // Arrange
          const checkUseCase = { execute: vi.fn() };
          const resetUseCase = { execute: vi.fn().mockResolvedValue({ success: true, errors: [] }) };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);

          // Act
          const actual = await handler.handle({ errorCode: 'L2-001', reset: true });

          // Assert
          expect(actual.exitCode).toBe(0);
          expect(resetUseCase.execute).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('異常系', () => {
    describe('エスカレーション対象の反復記録がある場合', () => {
      it('反復記録がある場合は検出としてexitCode=1を返す', async () => {
        // Arrange
        const checkUseCase = {
          execute: vi.fn().mockResolvedValue({ exists: true, currentCount: 3, escalated: true }),
        };
        const resetUseCase = { execute: vi.fn() };
        const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);

        // Act
        const actual = await handler.handle({ errorCode: 'L1-001' });

        // Assert
        expect(actual.exitCode).toBe(1);
      });
    });

    // IT-API-CheckRepetitionHandler-003
    describe('存在しないエラーコードを--error-code指定するとexitCode=0が返ること', () => {
      context('CheckEscalationUseCase.execute()→exists=falseが返る場合', () => {
        it('反復記録がない場合は成功としてexitCode=0を返す', async () => {
          // Arrange
          const checkUseCase = {
            execute: vi.fn().mockResolvedValue({ exists: false, currentCount: null, escalated: null }),
          };
          const resetUseCase = { execute: vi.fn() };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);

          // Act
          const actual = await handler.handle({ errorCode: 'L9-999' });

          // Assert
          expect(actual.exitCode).toBe(0);
        });
      });
    });

    describe('--codeを指定しない場合', () => {
      it('--codeが未指定の場合はusageを表示して失敗する', async () => {
        // Arrange
        const checkUseCase = { execute: vi.fn() };
        const resetUseCase = { execute: vi.fn() };
        const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);

        // Act
        const actual = await handler.handle({ errorCode: '' });

        // Assert
        expect(actual.exitCode).not.toBe(0);
        expect(actual.output).toContain('Usage:');
        expect(checkUseCase.execute).not.toHaveBeenCalled();
        expect(resetUseCase.execute).not.toHaveBeenCalled();
      });
    });

    // IT-API-CheckRepetitionHandler-004
    describe('--resetでINV-7違反エラーが返った場合にexitCode=1が返ること', () => {
      context('ResetRepetitionUseCase.execute()→success=false, errors=[REPETITION_RESET_FORBIDDEN]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          // Arrange
          const checkUseCase = { execute: vi.fn() };
          const resetUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: false,
              errors: [{ code: 'REPETITION_RESET_FORBIDDEN', message: 'Cannot reset' }],
            }),
          };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);

          // Act
          const actual = await handler.handle({ errorCode: 'L1-001', reset: true });

          // Assert
          expect(actual.exitCode).toBe(1);
        });
      });
    });
  });
});
