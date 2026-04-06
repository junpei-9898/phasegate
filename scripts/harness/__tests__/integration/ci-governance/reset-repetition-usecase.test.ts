// @layer test
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ResetRepetitionUseCase } from '../../../ci-governance/application/usecases/reset-repetition-usecase.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('ResetRepetitionUseCase', () => {
  describe('正常系', () => {
    // IT-UC-ResetRepetition-001
    describe('escalated=trueのエラーをconfirmedResolution=trueでリセットできること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→escalated=trueが返る場合', () => {
        it('success=true・errors=[]が返る', async () => {
          let er = ErrorRepetition.create('L2-001', 3);
          er = er.increment().increment().increment();
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er), save: vi.fn().mockResolvedValue(undefined) };
          const useCase = new ResetRepetitionUseCase(repoPort);
          const actual = await useCase.execute({ errorCode: 'L2-001', confirmedResolution: true });
          expect(actual.success).toBe(true);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-ResetRepetition-002
    describe('存在しないエラーコードをリセットしようとするとエラーが返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→nullが返る場合', () => {
        it('success=false・errors[]に"未登録"エラーが含まれる', async () => {
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null), save: vi.fn() };
          const useCase = new ResetRepetitionUseCase(repoPort);
          const actual = await useCase.execute({ errorCode: 'L9-999', confirmedResolution: true });
          expect(actual.success).toBe(false);
          expect(actual.errors.length).toBeGreaterThan(0);
        });
      });
    });

    // IT-UC-ResetRepetition-003
    describe('confirmedResolution=falseの場合にINV-7違反エラーが返ること', () => {
      context('escalated=trueのインスタンスでconfirmedResolution=falseを渡した場合', () => {
        it('success=false・errors[]にREPETITION_RESET_FORBIDDENが含まれる', async () => {
          let er = ErrorRepetition.create('L2-001', 3);
          er = er.increment().increment().increment();
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er), save: vi.fn() };
          const useCase = new ResetRepetitionUseCase(repoPort);
          const actual = await useCase.execute({ errorCode: 'L2-001', confirmedResolution: false });
          expect(actual.success).toBe(false);
          expect(actual.errors.some((e: any) => e.code.includes('RESET_FORBIDDEN'))).toBe(true);
        });
      });
    });

    // IT-UC-ResetRepetition-004
    describe('escalated=falseのエラーをリセットしようとするとエラーが返ること', () => {
      context('escalated=falseのインスタンスでconfirmedResolution=trueを渡した場合', () => {
        it('success=false・errors[]にINV-7違反エラーが含まれる', async () => {
          const er = ErrorRepetition.create('L1-001');
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er), save: vi.fn() };
          const useCase = new ResetRepetitionUseCase(repoPort);
          const actual = await useCase.execute({ errorCode: 'L1-001', confirmedResolution: true });
          expect(actual.success).toBe(false);
          expect(actual.errors.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
