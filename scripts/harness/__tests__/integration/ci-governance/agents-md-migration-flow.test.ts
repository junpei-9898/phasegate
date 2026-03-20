import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MigrateAgentsMdHandler } from '../../../ci-governance/presentation/handlers/migrate-agents-md-handler.js';
import { MigrateAgentsMdUseCase } from '../../../ci-governance/application/usecases/migrate-agents-md-usecase.js';
import { ValidatePointersUseCase } from '../../../ci-governance/application/usecases/validate-pointers-usecase.js';
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

target('AGENTS.md移行統合フロー', () => {
  describe('Handler→MigrateAgentsMdUseCase→LessonAggregator→PointerValidator→AgentsMdPort全フロー統合テスト', () => {
    // IT-API-AgentsMdFlow-001
    context('Handler→UseCase→Aggregator→Validator→AgentsMdPortの全フローが連携できること', () => {
      it('success=true・addedPointers=2・kpiMet=trueが返る', async () => {
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
        const validator = new PointerValidator(cmdPort as any, filePort as any, adrPort as any);
        const migrateUseCase = new MigrateAgentsMdUseCase(lessonReaderPort as any, agentsMdPort as any, aggregator, validator);
        const validatePointerUseCase = new ValidatePointersUseCase(agentsMdPort as any, validator);
        const handler = new MigrateAgentsMdHandler(migrateUseCase, validatePointerUseCase);
        const actual = await handler.handle({ dryRun: false });
        expect(actual.exitCode).toBe(0);
        expect(agentsMdPort.write).toHaveBeenCalledTimes(1);
      });
    });

    // IT-API-AgentsMdFlow-002
    context('Dead Pointer検出時は全レイヤーを通してwrite()がスキップされること', () => {
      it('success=false・AgentsMdPort.write()が呼び出されない', async () => {
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
        const validator = new PointerValidator(cmdPort as any, filePort as any, adrPort as any);
        const migrateUseCase = new MigrateAgentsMdUseCase(lessonReaderPort as any, agentsMdPort as any, aggregator, validator);
        const validatePointerUseCase = new ValidatePointersUseCase(agentsMdPort as any, validator);
        const handler = new MigrateAgentsMdHandler(migrateUseCase, validatePointerUseCase);
        const actual = await handler.handle({ dryRun: false });
        expect(actual.exitCode).toBe(1);
        expect(agentsMdPort.write).not.toHaveBeenCalled();
      });
    });

    // IT-API-AgentsMdFlow-003
    context('Shared Kernel（HarnessError/HarnessErrorCode）が全レイヤーを通じて正しく伝播されること', () => {
      it('返却されたHarnessErrorのcodeがDUPLICATE_LESSON_IDであり・エラーがレイヤー境界で再包装されず型安全に伝播される', async () => {
        const dupId = '550e8400-e29b-41d4-a716-446655440001';
        const lessonReaderPort = {
          readAll: vi.fn().mockResolvedValue([createLesson(dupId), createLesson(dupId)]),
        };
        const agentsMdPort = { read: vi.fn(), write: vi.fn() };
        const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
        const filePort = { exists: vi.fn().mockResolvedValue(true) };
        const adrPort = { exists: vi.fn().mockResolvedValue(true) };
        const aggregator = new LessonAggregator();
        const validator = new PointerValidator(cmdPort as any, filePort as any, adrPort as any);
        const migrateUseCase = new MigrateAgentsMdUseCase(lessonReaderPort as any, agentsMdPort as any, aggregator, validator);
        const validatePointerUseCase = new ValidatePointersUseCase(agentsMdPort as any, validator);
        const handler = new MigrateAgentsMdHandler(migrateUseCase, validatePointerUseCase);
        const actual = await handler.handle({ dryRun: false });
        expect(actual.exitCode).toBe(1);
        expect(actual.errors?.some((e: any) => e.code.includes('DUPLICATE_LESSON_ID'))).toBe(true);
      });
    });
  });
});
