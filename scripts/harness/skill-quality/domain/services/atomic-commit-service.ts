/**
 * @layer domain
 * @unit skill-quality
 */
import type { TddCycle } from '../value-objects/tdd-cycle.js';
import type { CommitMessage } from '../value-objects/commit-message.js';
import { CommitReadiness } from '../value-objects/commit-readiness.js';
import type { CommitExecutorPort } from '../ports/commit-executor-port.js';
import type { L1ValidatorPort } from '../ports/l1-validator-port.js';
import type { L2ValidatorPort } from '../ports/l2-validator-port.js';
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class AtomicCommitService {
  constructor(
    private readonly commitExecutorPort: CommitExecutorPort,
    private readonly l1ValidatorPort: L1ValidatorPort,
    private readonly l2ValidatorPort: L2ValidatorPort,
  ) {}

  async execute(tddCycle: TddCycle, commitMessage: CommitMessage): Promise<CommitReadiness> {
    if (!tddCycle.isReadyForCommit()) {
      throw new SkillQualityError('TDD_CYCLE_INCOMPLETE', 'TDD cycle must be REFACTOR+passed=true');
    }

    const l1Violations = await this.l1ValidatorPort.validate(commitMessage);
    if (l1Violations.length > 0) {
      return CommitReadiness.noGo(l1Violations);
    }

    const l2Violations = await this.l2ValidatorPort.validate(commitMessage);
    if (l2Violations.length > 0) {
      return CommitReadiness.noGo(l2Violations);
    }

    await this.commitExecutorPort.commit(commitMessage);
    return CommitReadiness.go();
  }
}
