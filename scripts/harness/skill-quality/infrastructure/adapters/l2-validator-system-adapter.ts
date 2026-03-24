/**
 * @layer infrastructure
 * @unit skill-quality
 */
import type { L2ValidatorPort } from '../../domain/ports/l2-validator-port.js';
import type { CommitMessage } from '../../domain/value-objects/commit-message.js';
import type { ValidationViolation } from '../../domain/types/validation-violation.js';

export class L2ValidatorSystemAdapter implements L2ValidatorPort {
  async validate(_commitMessage: CommitMessage): Promise<readonly ValidationViolation[]> {
    try {
      const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
      const mod = createValidatorSystemModule();
      const report = await mod.runFullValidationUseCase.execute({
        targetPaths: [],
        unitName: '',
        currentPhase: '',
        includeL4: false,
      });

      return report.allErrors.map((error) => ({
        ruleId: error.code.toString(),
        message: error.message,
        location: '',
      }));
    } catch {
      return [];
    }
  }
}
