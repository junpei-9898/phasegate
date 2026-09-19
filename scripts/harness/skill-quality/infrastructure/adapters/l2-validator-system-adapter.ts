/**
 * @layer infrastructure
 * @unit skill-quality
 */
import type { L2ValidatorPort } from '../../domain/ports/l2-validator-port.js';
import type { CommitMessage } from '../../domain/value-objects/commit-message.js';
import type { ValidationViolation } from '../../domain/types/validation-violation.js';
import { isEffectivelyPassed } from '../../../validator-system/domain/services/effective-severity-policy.js';

export interface L2ValidatorSystemOptions {
  config?: object;
  failOnWarning?: boolean;
}

export class L2ValidatorSystemAdapter implements L2ValidatorPort {
  constructor(private readonly options: L2ValidatorSystemOptions = {}) {}

  async validate(_commitMessage: CommitMessage): Promise<readonly ValidationViolation[]> {
    try {
      const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
      const mod = createValidatorSystemModule(this.options.config);
      // Direct legacy callers keep warning-as-blocking unless explicitly configured.
      const failOnWarning = this.options.failOnWarning ?? true;
      const report = await mod.runFullValidationUseCase.execute({
        targetPaths: [],
        unitName: '',
        currentPhase: '',
        includeL4: false,
        failOnWarning,
      });

      const blockingErrors = report.allErrors.filter((error) => {
        const advisory = isEffectivelyPassed({ passed: false, errors: [error] }, failOnWarning);
        if (advisory) console.warn(`[skill-quality] [${error.code}] ${error.message}`);
        return !advisory;
      });
      return blockingErrors.map((error) => ({
        ruleId: error.code.toString(),
        message: error.message,
        location: '',
      }));
    } catch (err) {
      // Fail-closed: a validator failure must NOT be treated as "合格".
      // Surface the error as a blocking violation so the commit gate stays closed.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[skill-quality] L2 validator-system failed: ${message}`);
      return [
        {
          ruleId: 'L2-VALIDATOR-ERROR',
          message: `L2 validator-system failed to run; treating as NOT compliant (fail-closed): ${message}`,
          location: '',
        },
      ];
    }
  }
}
