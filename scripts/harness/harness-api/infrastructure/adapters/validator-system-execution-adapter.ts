// @layer infrastructure
// validator-system-execution-adapter.ts — ValidatorSystemExecutionAdapter
// Wave 2完了後にリアル実装へ差し替え（旧: @stub: wave2-pending）

import type { ValidatorExecutionPort } from '../../domain/ports/validator-execution-port.js';
import type { ValidatorCheckItem } from '../../domain/value-objects/ci-check-result.js';
import type { DriftItem } from '../../domain/value-objects/drift-report-summary.js';

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
    return {
      async runL3Validators(): Promise<ValidatorCheckItem[]> {
        const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
        const mod = createValidatorSystemModule();
        const results = await mod.runL3ValidatorsUseCase.execute({ targetPaths: [] });
        return results.map((r) => ({
          validatorId: r.validatorId,
          passed: r.passed,
          errors: r.errors.map((e) => ({ code: e.code, severity: e.severity, message: e.message })),
        }));
      },

      async runAllValidators(): Promise<ValidatorCheckItem[]> {
        const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
        const mod = createValidatorSystemModule();
        const report = await mod.runFullValidationUseCase.execute({ targetPaths: [], unitName: '', currentPhase: '' });
        return report.results.map((r) => ({
          validatorId: r.validatorId,
          passed: r.passed,
          errors: r.errors.map((e) => ({ code: e.code, severity: e.severity, message: e.message })),
        }));
      },

      async runDriftDetection(): Promise<DriftItem[]> {
        // validator-system does not implement drift detection
        return [];
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
