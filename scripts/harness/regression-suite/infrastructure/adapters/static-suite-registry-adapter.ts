import type { SuiteId } from '../../domain/value-objects/suite-id.js';
import type { RegressionSuiteDefinition } from '../../domain/value-objects/regression-suite-definition.js';
import type { SuiteRegistryPort } from '../../domain/ports/suite-registry-port.js';
import { KRequirementsSuiteDefinition } from '../registry/k-requirements-suite-definition.js';
import { GngGateSuiteDefinition } from '../registry/gng-gate-suite-definition.js';
import { AgentIndependenceSuiteDefinition } from '../registry/agent-independence-suite-definition.js';
import { V0MigrationSuiteDefinition } from '../registry/v0-migration-suite-definition.js';

export class StaticSuiteRegistryAdapter implements SuiteRegistryPort {
  async getDefinition(suiteId: SuiteId): Promise<RegressionSuiteDefinition> {
    switch (suiteId.value) {
      case 'k-requirements':
        return KRequirementsSuiteDefinition.get();
      case 'gng-gate':
        return GngGateSuiteDefinition.get();
      case 'agent-independence':
        return AgentIndependenceSuiteDefinition.get();
      case 'v0-migration':
        return V0MigrationSuiteDefinition.get();
      default:
        throw new Error(`SuiteDefinitionNotFoundError: No suite definition for '${suiteId.value}'`);
    }
  }
}
