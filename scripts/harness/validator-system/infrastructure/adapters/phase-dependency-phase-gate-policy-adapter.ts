/**
 * @layer infrastructure
 * @unit validator-system
 *
 * PhaseDependencyPhaseGatePolicyAdapter — PhaseGatePolicyPort実装
 */
import type { PhaseGatePolicyPort } from '../../domain/ports/phase-gate-policy-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

export class PhaseDependencyPhaseGatePolicyAdapter implements PhaseGatePolicyPort {
  async checkPrerequisites(context: { unitName: string; currentPhase: string }): Promise<{
    satisfied: boolean;
    violations: readonly HarnessErrorLike[];
  }> {
    if (context.unitName.trim().length === 0) {
      return { satisfied: true, violations: [] };
    }

    try {
      // WI-085: paths config を phase-dependency-model に流入させる
      const { createConfigFoundationModule } = await import('../../../config-foundation/composition-root.js');
      const { toPhaseConfigSection } = await import('../../../config-foundation/application/mappers/phase-config-section-mapper.js');
      const configModule = createConfigFoundationModule();
      const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute();
      const { createPhaseDependencyModelModule } = await import('../../../phase-dependency-model/composition-root.js');
      const mod = createPhaseDependencyModelModule({
        rootDir: process.cwd(),
        phaseConfig: toPhaseConfigSection(resolvedConfig.config),
        reportOutputDir: resolvedConfig.config.reporting.outputDir,
      });
      const result = await mod.checkPhaseGateCommandHandler.execute({
        targetLevel: 2,
        unitId: context.unitName,
      });

      if (result.exitCode === 0) {
        return { satisfied: true, violations: [] };
      }

      if (result.exitCode === 1) {
        return {
          satisfied: false,
          violations: [
            {
              code: { value: 'L2-001', toString: () => 'L2-001' },
              severity: { value: 'error', toString: () => 'error' },
              message: result.text,
              suggestion: 'phase gate prerequisites are not met',
            },
          ],
        };
      }

      // Fail-closed: an unexpected exit code means prerequisites could not be confirmed.
      console.error(`[validator-system] phase gate check returned unexpected exit code ${result.exitCode}`);
      return {
        satisfied: false,
        violations: [
          {
            code: { value: 'L2-002', toString: () => 'L2-002' },
            severity: { value: 'error', toString: () => 'error' },
            message: `phase gate check returned unexpected exit code ${result.exitCode}; prerequisites cannot be confirmed`,
            suggestion: 'phase gate prerequisites could not be evaluated; treating as NOT satisfied (fail-closed)',
          },
        ],
      };
    } catch (err) {
      // Fail-closed: if the phase-dependency-model could not be loaded/executed we cannot
      // confirm prerequisites are met, so treat them as NOT satisfied rather than opening the gate.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[validator-system] phase gate prerequisite check failed to run: ${message}`);
      return {
        satisfied: false,
        violations: [
          {
            code: { value: 'L2-002', toString: () => 'L2-002' },
            severity: { value: 'error', toString: () => 'error' },
            message: `phase gate prerequisite check could not be evaluated: ${message}`,
            suggestion: 'phase gate prerequisites could not be evaluated; treating as NOT satisfied (fail-closed)',
          },
        ],
      };
    }
  }
}
