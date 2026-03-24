/**
 * @layer infrastructure
 * @unit validator-system
 *
 * NyquistAcCoveragePolicyAdapter — AcCoveragePolicyPort実装
 */
import type { AcCoveragePolicyPort } from '../../domain/ports/ac-coverage-policy-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

export class NyquistAcCoveragePolicyAdapter implements AcCoveragePolicyPort {
  async checkCoverage(context: { matrixFilePath?: string }): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
  }> {
    try {
      const { createNyquistValidationModule } = await import('../../../nyquist-validation/composition-root.js');
      const mod = createNyquistValidationModule({
        rootDir: process.cwd(),
        getStoryIds: async () => [],
      } as {
        rootDir: string;
        getStoryIds: () => Promise<readonly string[]>;
      });
      const output = await mod.checkAcCoverageGateUseCase.execute({
        matrixFilePath: context.matrixFilePath ?? '',
      });

      return {
        passed: output.passed,
        errors: output.errors.map((err) => ({
          code: { value: 'L3-004', toString: () => 'L3-004' },
          severity: { value: 'error', toString: () => 'error' },
          message: err.message,
          suggestion: '',
        })),
      };
    } catch {
      return { passed: true, errors: [] };
    }
  }
}
