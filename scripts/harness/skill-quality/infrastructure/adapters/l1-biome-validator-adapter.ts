/**
 * @layer infrastructure
 * @unit skill-quality
 */
import type { L1ValidatorPort } from '../../domain/ports/l1-validator-port.js';
import type { CommitMessage } from '../../domain/value-objects/commit-message.js';
import type { ValidationViolation } from '../../domain/types/validation-violation.js';

export class L1BiomeValidatorAdapter implements L1ValidatorPort {
  async validate(_commitMessage: CommitMessage): Promise<readonly ValidationViolation[]> {
    try {
      const { createBiomeAstEngineModule } = await import('../../../biome-ast-engine/composition-root.js');
      const mod = createBiomeAstEngineModule(process.cwd());
      const output = await mod.executeLintUseCase.execute({ targets: [] });

      return output.report.violations.map((violation) => ({
        ruleId: violation.ruleName.toString(),
        message: violation.message,
        location: `${violation.filePath.toString()}:${violation.line}:${violation.column}`,
      }));
    } catch (err) {
      // Fail-closed: a validator failure must NOT be treated as "合格".
      // Surface the error as a blocking violation so the commit gate stays closed.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[skill-quality] L1 Biome validator failed: ${message}`);
      return [
        {
          ruleId: 'L1-VALIDATOR-ERROR',
          message: `L1 Biome validator failed to run; treating as NOT compliant (fail-closed): ${message}`,
          location: '',
        },
      ];
    }
  }
}
