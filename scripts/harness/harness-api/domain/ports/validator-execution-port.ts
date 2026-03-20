// validator-execution-port.ts

import type { ValidatorCheckItem } from '../value-objects/ci-check-result.js';
import type { DriftItem } from '../value-objects/drift-report-summary.js';

export interface ValidatorExecutionPort {
  runL3Validators(): Promise<ValidatorCheckItem[]>;
  runDriftDetection(): Promise<DriftItem[]>;
  runAllValidators(): Promise<ValidatorCheckItem[]>;
}
