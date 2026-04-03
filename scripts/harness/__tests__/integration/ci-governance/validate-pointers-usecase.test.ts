import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidatePointersUseCase } from '../../../ci-governance/application/usecases/validate-pointers-usecase.js';
import { PointerValidator } from '../../../ci-governance/domain/services/pointer-validator.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';
import { PointerEntry } from '../../../ci-governance/domain/value-objects/pointer-entry.js';

target('ValidatePointersUseCase', () => {
  describe('正常系', () => {
    // IT-UC-ValidatePointers-001
    describe('全PointerEntryが実在する場合にpassed=trueが返ること', () => {
      context('全ExistencePortのexists()→trueが返る場合', () => {
        it('passed=true・deadPointers=[]・errors=[]が返る', async () => {
          const pointers = [
            PointerEntry.createCommand({ key: 'cmd-1', command: 'phasegate:status', description: '...' }),
            PointerEntry.createFile({ key: 'file-1', filePath: 'docs/README.md', description: '...' }),
          ];
          const agentsMdPort = { read: vi.fn().mockResolvedValue(AgentsMdPointer.create(pointers)), write: vi.fn() };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new ValidatePointersUseCase(agentsMdPort, validator);
          const actual = await useCase.execute();
          expect(actual.passed).toBe(true);
          expect(actual.deadPointers).toHaveLength(0);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-ValidatePointers-002
    describe('PointerEntryが0件の場合もpassed=trueが返ること', () => {
      context('AgentsMdPort.read()→空AgentsMdPointerが返る場合', () => {
        it('passed=true・totalPointers=0・deadPointers=[]が返る', async () => {
          const agentsMdPort = { read: vi.fn().mockResolvedValue(AgentsMdPointer.create()), write: vi.fn() };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new ValidatePointersUseCase(agentsMdPort, validator);
          const actual = await useCase.execute();
          expect(actual.passed).toBe(true);
          expect(actual.totalPointers).toBe(0);
          expect(actual.deadPointers).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-ValidatePointers-003
    describe('Dead Pointerが1件検出されるとpassed=falseが返ること', () => {
      context('FileExistencePort.exists("missing.md")→falseが返る場合', () => {
        it('passed=false・deadPointers["missing-key"]・errors.length>=1が返る', async () => {
          const pointers = [
            PointerEntry.createFile({ key: 'missing-key', filePath: 'docs/missing.md', description: '...' }),
          ];
          const agentsMdPort = { read: vi.fn().mockResolvedValue(AgentsMdPointer.create(pointers)), write: vi.fn() };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(false) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new ValidatePointersUseCase(agentsMdPort, validator);
          const actual = await useCase.execute();
          expect(actual.passed).toBe(false);
          expect(actual.deadPointers).toContain('missing-key');
          expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        });
      });
    });
  });
});
