// @unit harness-api
// @layer infrastructure
// @work-item-id WI-092
// validator-system-execution-adapter.ts — ValidatorSystemExecutionAdapter
// Wave 2完了後にリアル実装へ差し替え（旧: @stub: wave2-pending）

import type { ValidatorExecutionPort } from '../../domain/ports/validator-execution-port.js';
import type { ValidatorCheckItem } from '../../domain/value-objects/ci-check-result.js';
import type { DriftItem } from '../../domain/value-objects/drift-report-summary.js';
import { toValidatorSystemConfig } from '../../../config-foundation/application/mappers/validator-system-config-mapper.js';
import { ConfigNotFoundError } from '../../../config-foundation/infrastructure/repositories/file-system-config-repository.js';

/**
 * validator-system config（toValidatorSystemConfig の出力）から
 * L3-004 用の requirement-test-matrix.json パスを取り出す。
 * 未設定・config 不在時は undefined を返し、下流の AC coverage adapter が
 * 既定値（.harness/requirement-test-matrix.json）へフォールバックする。
 */
function extractRequirementMatrixPath(config: object | undefined): string | undefined {
  if (!config) return undefined;
  const layers = (config as { layers?: { L3?: { requirementMatrixPath?: unknown } } }).layers;
  const path = layers?.L3?.requirementMatrixPath;
  return typeof path === 'string' && path.length > 0 ? path : undefined;
}

// Override interface preserved for testing
export interface IValidatorSystemStub {
  runL3Validators(): Promise<ValidatorCheckItem[]>;
  runAllValidators(): Promise<ValidatorCheckItem[]>;
  runDriftDetection(): Promise<DriftItem[]>;
}

export class ValidatorSystemExecutionAdapter implements ValidatorExecutionPort {
  private readonly stub: IValidatorSystemStub;

  constructor(stub?: IValidatorSystemStub) {
    this.stub = stub ?? ValidatorSystemExecutionAdapter.createRealImpl();
  }

  private static createRealImpl(): IValidatorSystemStub {
    async function loadValidatorSystemConfig(): Promise<object | undefined> {
      const { createConfigFoundationModule } = await import('../../../config-foundation/composition-root.js');
      const configMod = createConfigFoundationModule();
      try {
        const resolvedConfig = await configMod.usecases.loadResolvedConfigUseCase.execute();
        return toValidatorSystemConfig(resolvedConfig.config);
      } catch (err) {
        if (err instanceof ConfigNotFoundError) return undefined;
        throw err;
      }
    }

    return {
      async runL3Validators(): Promise<ValidatorCheckItem[]> {
        const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
        const config = await loadValidatorSystemConfig();
        const mod = createValidatorSystemModule(config);
        const results = await mod.runL3ValidatorsUseCase.execute({
          targetPaths: [],
          requirementMatrixPath: extractRequirementMatrixPath(config),
        });
        return results.map((r) => ({
          validatorId: r.validatorId,
          passed: r.passed,
          skipped: r.skipped,
          errors: r.errors.map((e) => ({ code: e.code, severity: e.severity, message: e.message })),
        }));
      },

      async runAllValidators(): Promise<ValidatorCheckItem[]> {
        const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
        const config = await loadValidatorSystemConfig();
        const mod = createValidatorSystemModule(config);
        const report = await mod.runFullValidationUseCase.execute({
          targetPaths: [],
          unitName: '',
          currentPhase: '',
          requirementMatrixPath: extractRequirementMatrixPath(config),
        });
        return report.results.map((r) => ({
          validatorId: r.validatorId,
          passed: r.passed,
          skipped: r.skipped,
          errors: r.errors.map((e) => ({ code: e.code, severity: e.severity, message: e.message })),
        }));
      },

      async runDriftDetection(): Promise<DriftItem[]> {
        // ISSUE-005 P1-5: L4-001 の DriftDetectionService を直接呼び出し、
        // phasegate:detect-drift と validate --layer L4 の結果を一致させる
        const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
        const mod = createValidatorSystemModule(await loadValidatorSystemConfig());
        const reports = await mod.driftDetectionService.detect();
        return reports.map((r) => ({
          direction: r.direction,
          unit: r.unitName,
          element: r.element,
          recommendation: r.recommendation,
        }));
      },
    };
  }

  async runL3Validators(): Promise<ValidatorCheckItem[]> {
    try {
      return await this.stub.runL3Validators();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return [{ validatorId: 'L3-error', passed: false, errors: [{ code: 'VALIDATOR_SYSTEM_ERROR', severity: 'error', message }] }];
    }
  }

  async runDriftDetection(): Promise<DriftItem[]> {
    return this.stub.runDriftDetection();
  }

  async runAllValidators(): Promise<ValidatorCheckItem[]> {
    try {
      return await this.stub.runAllValidators();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return [{ validatorId: 'all-error', passed: false, errors: [{ code: 'VALIDATOR_SYSTEM_ERROR', severity: 'error', message }] }];
    }
  }
}
