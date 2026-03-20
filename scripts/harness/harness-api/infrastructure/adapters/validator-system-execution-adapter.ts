// validator-system-execution-adapter.ts — ValidatorSystemExecutionAdapter
// @stub: wave2-pending - validator-system の正式インターフェース確定後に差し替え

import type { ValidatorExecutionPort } from '../../domain/ports/validator-execution-port.js';
import type { ValidatorCheckItem } from '../../domain/value-objects/ci-check-result.js';
import type { DriftItem } from '../../domain/value-objects/drift-report-summary.js';

// Stub interface for the external validator-system module (wave2-pending)
export interface IValidatorSystemStub {
  runL3Validators(): Promise<ValidatorCheckItem[]>;
  runAllValidators(): Promise<ValidatorCheckItem[]>;
  runDriftDetection(): Promise<DriftItem[]>;
}

export class ValidatorSystemExecutionAdapter implements ValidatorExecutionPort {
  private readonly stub: IValidatorSystemStub;

  constructor(stub?: IValidatorSystemStub) {
    this.stub = stub ?? {
      async runL3Validators() { return []; },
      async runAllValidators() { return []; },
      async runDriftDetection() { return []; },
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
