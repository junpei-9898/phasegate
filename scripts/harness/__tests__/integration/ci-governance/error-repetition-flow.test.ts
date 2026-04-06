// @layer test
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RecordErrorOccurrenceUseCase } from '../../../ci-governance/application/usecases/record-error-occurrence-usecase.js';
import { ResetRepetitionUseCase } from '../../../ci-governance/application/usecases/reset-repetition-usecase.js';
import { RepetitionDetector } from '../../../ci-governance/domain/services/repetition-detector.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('反復エラー検出統合フロー', () => {
  describe('RecordErrorOccurrence×RepetitionDetectorのstateful統合テスト', () => {
    // IT-API-RepetitionFlow-001
    context('同一エラーコードを3回RecordErrorOccurrenceすると3回目でescalated=trueになること', () => {
      it('1回目: escalated=false, 2回目: escalated=false, 3回目: escalated=true・escalationAction!=null', async () => {
        const store = new Map<string, ErrorRepetition>();
        const repoPort = {
          findByCode: vi.fn().mockImplementation(async (code: string) => store.get(code) ?? null),
          save: vi.fn().mockImplementation(async (er: ErrorRepetition) => store.set(er.code, er)),
        };
        const detector = new RepetitionDetector(repoPort as any);
        const escalationExecutorPort = { execute: vi.fn().mockResolvedValue(undefined) };
        const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort as any);

        const result1 = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });
        expect(result1.escalated).toBe(false);

        const result2 = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });
        expect(result2.escalated).toBe(false);

        const result3 = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });
        expect(result3.escalated).toBe(true);
        expect(result3.escalationAction).not.toBeNull();
      });
    });

    // IT-API-RepetitionFlow-002
    context('RepetitionDetectorがEscalationActionを返した後・アプリケーション層がEscalationExecutorPortを呼び出すこと', () => {
      it('EscalationExecutorPort.execute()が1回呼び出される（logLevel/messageTemplateが渡される）', async () => {
        let er = ErrorRepetition.create('L1-001', 3);
        er = er.increment().increment();
        const repoPort = {
          findByCode: vi.fn().mockResolvedValue(er),
          save: vi.fn().mockResolvedValue(undefined),
        };
        const detector = new RepetitionDetector(repoPort as any);
        const escalationExecutorPort = { execute: vi.fn().mockResolvedValue(undefined) };
        const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort as any);

        await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });

        expect(escalationExecutorPort.execute).toHaveBeenCalledTimes(1);
        const execArg = escalationExecutorPort.execute.mock.calls[0][0];
        expect(execArg.logLevel).toBeDefined();
        expect(execArg.messageTemplate).toBeDefined();
      });
    });

    // IT-API-RepetitionFlow-003
    context('reset後のerrorCodeは再びoccurrenceCount=0から開始すること', () => {
      it('reset: success=true。再記録1回目: currentCount=1・escalated=false', async () => {
        let storedEr: ErrorRepetition | null = null;
        let escalatedEr = ErrorRepetition.create('L2-001', 3);
        escalatedEr = escalatedEr.increment().increment().increment();
        storedEr = escalatedEr;

        const repoPort = {
          findByCode: vi.fn().mockImplementation(async () => storedEr),
          save: vi.fn().mockImplementation(async (er: ErrorRepetition) => { storedEr = er; }),
        };

        const resetUseCase = new ResetRepetitionUseCase(repoPort as any);
        const resetResult = await resetUseCase.execute({ errorCode: 'L2-001', confirmedResolution: true });
        expect(resetResult.success).toBe(true);

        const detector = new RepetitionDetector(repoPort as any);
        const escalationExecutorPort = { execute: vi.fn() };
        const recordUseCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort as any);
        const recordResult = await recordUseCase.execute({ errorCode: 'L2-001', errorMessage: 're-test' });

        expect(recordResult.currentCount).toBe(1);
        expect(recordResult.escalated).toBe(false);
      });
    });
  });
});
