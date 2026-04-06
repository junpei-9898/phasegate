// @layer test
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckEscalationUseCase } from '../../../ci-governance/application/usecases/check-escalation-usecase.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('CheckEscalationUseCase', () => {
  describe('正常系', () => {
    // IT-UC-CheckEscalation-001
    describe('既存エラーコードのエスカレーション状況を確認できること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→occurrenceCount=3・escalated=trueが返る場合', () => {
        it('exists=true・currentCount=3・escalated=trueが返る', async () => {
          let er = ErrorRepetition.create('L2-001', 3);
          er = er.increment().increment().increment();
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er), save: vi.fn() };
          const useCase = new CheckEscalationUseCase(repoPort);
          const actual = await useCase.execute({ errorCode: 'L2-001' });
          expect(actual.exists).toBe(true);
          expect(actual.currentCount).toBe(3);
          expect(actual.escalated).toBe(true);
        });
      });
    });

    // IT-UC-CheckEscalation-002
    describe('存在しないエラーコードはexists=falseで返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→nullが返る場合', () => {
        it('exists=false・currentCount=null・escalated=nullが返る', async () => {
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null), save: vi.fn() };
          const useCase = new CheckEscalationUseCase(repoPort);
          const actual = await useCase.execute({ errorCode: 'L9-999' });
          expect(actual.exists).toBe(false);
          expect(actual.currentCount).toBeNull();
          expect(actual.escalated).toBeNull();
        });
      });
    });
  });
});
