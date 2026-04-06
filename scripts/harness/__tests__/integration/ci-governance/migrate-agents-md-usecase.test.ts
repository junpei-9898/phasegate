// @layer test
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MigrateAgentsMdUseCase } from '../../../ci-governance/application/usecases/migrate-agents-md-usecase.js';
import { LessonAggregator } from '../../../ci-governance/domain/services/lesson-aggregator.js';
import { PointerValidator } from '../../../ci-governance/domain/services/pointer-validator.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';

const createLesson = (lessonId: string) => ({
  lessonId,
  source: 'story-implementor',
  content: 'テストlesson',
  tags: ['best-practice'] as any[],
  timestamp: '2026-03-20T00:00:00Z',
});

target('MigrateAgentsMdUseCase', () => {
  describe('正常系', () => {
    // IT-UC-MigrateAgentsMd-001
    describe('lesson artifactを読み取りAGENTS.mdへの移行が成功すること', () => {
      context('dryRun=falseで全ポートが正常に動作する場合', () => {
        it('success=true・addedPointers=2・linesBefore=20・linesAfter=8・kpiMet=trueが返る', async () => {
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([
              createLesson('550e8400-e29b-41d4-a716-446655440001'),
              createLesson('550e8400-e29b-41d4-a716-446655440002'),
            ]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn().mockResolvedValue({ before: 20, after: 8 }),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          const actual = await useCase.execute({ dryRun: false });
          expect(actual.success).toBe(true);
          expect(actual.addedPointers).toBe(2);
          expect(actual.linesBefore).toBe(20);
          expect(actual.linesAfter).toBe(8);
          expect(actual.kpiMet).toBe(true);
        });
      });
    });

    // IT-UC-MigrateAgentsMd-002
    describe('dryRun=trueの場合はAgentsMdPort.write()を呼び出さないこと', () => {
      context('dryRun=trueを渡した場合', () => {
        it('success=true・linesAfter=null・kpiMet=null。AgentsMdPort.write()が呼び出されない', async () => {
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn(),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          const actual = await useCase.execute({ dryRun: true });
          expect(actual.success).toBe(true);
          expect(actual.linesAfter).toBeNull();
          expect(actual.kpiMet).toBeNull();
          expect(agentsMdPort.write).not.toHaveBeenCalled();
        });
      });
    });

    // IT-UC-MigrateAgentsMd-003
    describe('移行後行数が移行前の50%以下でkpiMet=trueになること', () => {
      context('AgentsMdPort.write()が{before:100, after:49}を返す場合', () => {
        it('kpiMet=trueが返る', async () => {
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn().mockResolvedValue({ before: 100, after: 49 }),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          const actual = await useCase.execute({ dryRun: false });
          expect(actual.kpiMet).toBe(true);
        });
      });
    });

    // IT-UC-MigrateAgentsMd-004
    describe('移行後行数が移行前の50%超でkpiMet=falseになること', () => {
      context('AgentsMdPort.write()が{before:100, after:51}を返す場合', () => {
        it('kpiMet=falseが返る', async () => {
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn().mockResolvedValue({ before: 100, after: 51 }),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          const actual = await useCase.execute({ dryRun: false });
          expect(actual.kpiMet).toBe(false);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-MigrateAgentsMd-005
    describe('同一バッチ内に重複lessonIdがある場合は移行が中断されること', () => {
      context('LessonArtifactReaderPort.readAll()→同一lessonIdを持つ2件が返る場合', () => {
        it('success=false・errorsにDUPLICATE_LESSON_ID。AgentsMdPort.write()が呼ばれない', async () => {
          const dupId = '550e8400-e29b-41d4-a716-446655440001';
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson(dupId), createLesson(dupId)]),
          };
          const agentsMdPort = { read: vi.fn(), write: vi.fn() };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          const actual = await useCase.execute({ dryRun: false });
          expect(actual.success).toBe(false);
          expect(actual.errors.some((e: any) => e.code.includes('DUPLICATE_LESSON_ID'))).toBe(true);
          expect(agentsMdPort.write).not.toHaveBeenCalled();
        });
      });
    });

    // IT-UC-MigrateAgentsMd-006
    describe('Dead Pointerが検出された場合は移行が中断されること', () => {
      context('FileExistencePort.exists("nonexistent.md")→falseが返る場合', () => {
        it('success=false・errorsにAGENTS_MD_DEAD_POINTERが含まれる', async () => {
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn(),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(false) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          const actual = await useCase.execute({ dryRun: false });
          expect(actual.success).toBe(false);
          expect(actual.errors.some((e: any) => e.code.includes('DEAD_POINTER'))).toBe(true);
        });
      });
    });
  });
});
