import type { SuiteId } from '../value-objects/suite-id.js';
import type { RegressionSuiteDefinition } from '../value-objects/regression-suite-definition.js';

export interface SuiteRegistryPort {
  getDefinition(suiteId: SuiteId): Promise<RegressionSuiteDefinition>;
}
