/**
 * @layer application
 * @unit skill-quality
 */
import { TddCycle } from '../../domain/value-objects/tdd-cycle.js';
import { CommitMessage } from '../../domain/value-objects/commit-message.js';
import type { AtomicCommitService } from '../../domain/services/atomic-commit-service.js';
import type { ExecuteTddCycleInput } from '../dto/execute-tdd-cycle-input.js';
import type { ExecuteTddCycleOutput } from '../dto/execute-tdd-cycle-output.js';

export class ExecuteTddCycleUseCase {
  constructor(private readonly atomicCommitService: AtomicCommitService) {}

  async execute(input: ExecuteTddCycleInput): Promise<ExecuteTddCycleOutput> {
    const tddCycle = TddCycle.create(input.phase, input.passed);
    const commitMessage = CommitMessage.create(input.unit, input.storyId, input.description);

    const readiness = await this.atomicCommitService.execute(tddCycle, commitMessage);

    return {
      ready: readiness.ready,
      violations: readiness.violations,
      committedMessage: readiness.ready ? commitMessage.format() : null,
    };
  }
}
