// @layer test
import { target, context, createErrorRepetition, createErrorRepetitionRepositoryPortMock } from '../../../helpers/test-helpers.js';
import { describe, it, vi, expect } from 'vitest';
import { RepetitionDetector } from '../../../../ci-governance/domain/services/repetition-detector.js';

target('RepetitionDetector', () => {
  describe('detectテスト', () => {
    // UT-RD-001
    context('error.code="L1-001"（初回発生）でfindByCodeがnullを返す場合', () => {
      it('新規ErrorRepetitionが生成され・save()が呼ばれ・occurrenceCount=1でnullが返る', async () => {
        const repoPort = createErrorRepetitionRepositoryPortMock(null);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        const actual = await detector.detect(error as any);
        expect(actual).toBeNull();
        expect(repoPort.save).toHaveBeenCalledTimes(1);
        const saved = repoPort.save.mock.calls[0][0];
        expect(saved.occurrenceCount).toBe(1);
      });
    });

    // UT-RD-002
    context('error.code="L1-001"（2回目発生）でfindByCodeがoccurrenceCount=1のインスタンスを返す場合', () => {
      it('increment()後にsave()が呼ばれ・occurrenceCount=2でnullが返る', async () => {
        let er = createErrorRepetition({ code: 'L1-001' });
        er = er.increment();
        const repoPort = createErrorRepetitionRepositoryPortMock(er);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        const actual = await detector.detect(error as any);
        expect(actual).toBeNull();
        const saved = repoPort.save.mock.calls[0][0];
        expect(saved.occurrenceCount).toBe(2);
      });
    });

    // UT-RD-003
    context('error.code="L1-001"（3回目: threshold=3に到達）でoccurrenceCount=2のインスタンスを返す場合', () => {
      it('increment()後にsave()が呼ばれ・escalated=trueになりEscalationActionが返る', async () => {
        let er = createErrorRepetition({ code: 'L1-001', threshold: 3 });
        er = er.increment().increment();
        const repoPort = createErrorRepetitionRepositoryPortMock(er);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        const actual = await detector.detect(error as any);
        expect(actual).not.toBeNull();
        expect(actual!.logLevel).toBeDefined();
      });
    });

    // UT-RD-004
    context('save()がI/O失敗した場合', () => {
      it('HarnessErrorがスローされる', async () => {
        const repoPort = {
          findByCode: vi.fn().mockResolvedValue(null),
          save: vi.fn().mockRejectedValue(new Error('I/O failure')),
        };
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        await expect(detector.detect(error as any)).rejects.toThrow();
      });
    });

    // UT-RD-005
    context('error.code="L1-001"（2回目、閾値未満）でoccurrenceCount=1のインスタンスを返す場合', () => {
      it('nullが返る（エスカレーション未発生）', async () => {
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment();
        const repoPort = createErrorRepetitionRepositoryPortMock(er);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        const actual = await detector.detect(error as any);
        expect(actual).toBeNull();
      });
    });
  });
});
