import type { SuiteIdValue } from '../../domain/value-objects/suite-id.js';
import type { ExecutionMode } from '../../domain/value-objects/ci-gate-config.js';

export interface ConfigureCiGateInput {
  requiredSuiteIds: SuiteIdValue[];
  coverageThreshold?: number;
  executionMode: ExecutionMode;
}
