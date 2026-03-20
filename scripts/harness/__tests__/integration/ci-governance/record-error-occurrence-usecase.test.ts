import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RecordErrorOccurrenceUseCase } from '../../../ci-governance/application/usecases/record-error-occurrence-usecase.js';
import { RepetitionDetector } from '../../../ci-governance/domain/services/repetition-detector.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('RecordErrorOccurrenceUseCase', () => {
  describe('正常系', () => {
    // IT-UC-RecordErrorOccurrence-001
    describe('初回エラー発生を記録するとcurrentCount=1・escalated=falseが返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→nullが返る場合', () => {
        it('currentCount=1・escalated=false・escalationAction=nullが返る', async () => {
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn() };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          const actual = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test error' });
          expect(actual.currentCount).toBe(1);
          expect(actual.escalated).toBe(false);
          expect(actual.escalationAction).toBeNull();
        });
      });
    });

    // IT-UC-RecordErrorOccurrence-002
    describe('既存2回のエラーに対して3回目を記録するとescalated=trueとEscalationActionが返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→occurrenceCount=2のインスタンスが返る場合', () => {
        it('currentCount=3・escalated=true・escalationAction!=nullが返る', async () => {
          let er = ErrorRepetition.create('L1-001', 3);
          er = er.increment().increment();
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er), save: vi.fn().mockResolvedValue(undefined) };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn().mockResolvedValue(undefined) };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          const actual = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test error' });
          expect(actual.currentCount).toBe(3);
          expect(actual.escalated).toBe(true);
          expect(actual.escalationAction).not.toBeNull();
          expect(escalationExecutorPort.execute).toHaveBeenCalledTimes(1);
        });
      });
    });

    // IT-UC-RecordErrorOccurrence-003
    describe('異なるerrorCodeのエラーは独立して管理されること', () => {
      context('errorCode="L2-002"（別コード）でfindByCode()→nullが返る場合', () => {
        it('errorCode="L2-002"・currentCount=1・escalated=falseが返る', async () => {
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn() };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          const actual = await useCase.execute({ errorCode: 'L2-002', errorMessage: 'test' });
          expect(actual.currentCount).toBe(1);
          expect(actual.escalated).toBe(false);
          expect(repoPort.findByCode).toHaveBeenCalledWith('L2-002');
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-RecordErrorOccurrence-004
    describe('リポジトリsaveが失敗した場合にエラーがスローされること', () => {
      context('ErrorRepetitionRepositoryPort.save()がエラーをスローする場合', () => {
        it('HarnessErrorがスローされる', async () => {
          const repoPort = {
            findByCode: vi.fn().mockResolvedValue(null),
            save: vi.fn().mockRejectedValue(new Error('I/O failure')),
          };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn() };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          await expect(useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' })).rejects.toThrow();
        });
      });
    });
  });
});
