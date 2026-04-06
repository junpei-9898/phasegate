// @layer application
import type { SuiteIdValue } from '../../domain/value-objects/suite-id.js';

export interface RunRegressionSuiteInput {
  suiteId?: SuiteIdValue;
  kNumberFilter?: string[];
  coverageThreshold?: number;
}
