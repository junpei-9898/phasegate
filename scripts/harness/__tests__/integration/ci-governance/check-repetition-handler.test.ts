import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckRepetitionHandler } from '../../../ci-governance/presentation/handlers/check-repetition-handler.js';

target('CheckRepetitionHandler', () => {
  describe('正常系', () => {
    // IT-API-CheckRepetitionHandler-001
    describe('--error-code指定でCheckEscalationUseCaseが呼ばれること', () => {
      context('args.errorCode="L1-001"を渡した場合', () => {
        it('exitCode=0・CheckEscalationUseCase.execute()が呼ばれる', async () => {
          const checkUseCase = {
            execute: vi.fn().mockResolvedValue({ exists: true, currentCount: 1, escalated: false }),
          };
          const resetUseCase = { execute: vi.fn() };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);
          const actual = await handler.handle({ errorCode: 'L1-001' });
          expect(actual.exitCode).toBe(0);
          expect(checkUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'L1-001' }));
        });
      });
    });

    // IT-API-CheckRepetitionHandler-002
    describe('--resetフラグ付きでResetRepetitionUseCaseが呼ばれること', () => {
      context('args.reset=trueを渡した場合', () => {
        it('exitCode=0・ResetRepetitionUseCase.execute()が呼ばれる', async () => {
          const checkUseCase = { execute: vi.fn() };
          const resetUseCase = { execute: vi.fn().mockResolvedValue({ success: true, errors: [] }) };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);
          const actual = await handler.handle({ errorCode: 'L2-001', reset: true });
          expect(actual.exitCode).toBe(0);
          expect(resetUseCase.execute).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-API-CheckRepetitionHandler-003
    describe('存在しないエラーコードを--error-code指定するとexitCode=1が返ること', () => {
      context('CheckEscalationUseCase.execute()→exists=falseが返る場合', () => {
        it('exitCode=1が返る', async () => {
          const checkUseCase = {
            execute: vi.fn().mockResolvedValue({ exists: false, currentCount: null, escalated: null }),
          };
          const resetUseCase = { execute: vi.fn() };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);
          const actual = await handler.handle({ errorCode: 'L9-999' });
          expect(actual.exitCode).toBe(1);
        });
      });
    });

    // IT-API-CheckRepetitionHandler-004
    describe('--resetでINV-7違反エラーが返った場合にexitCode=1が返ること', () => {
      context('ResetRepetitionUseCase.execute()→success=false, errors=[REPETITION_RESET_FORBIDDEN]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          const checkUseCase = { execute: vi.fn() };
          const resetUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: false,
              errors: [{ code: 'REPETITION_RESET_FORBIDDEN', message: 'Cannot reset' }],
            }),
          };
          const handler = new CheckRepetitionHandler(checkUseCase as any, resetUseCase as any);
          const actual = await handler.handle({ errorCode: 'L1-001', reset: true });
          expect(actual.exitCode).toBe(1);
        });
      });
    });
  });
});
