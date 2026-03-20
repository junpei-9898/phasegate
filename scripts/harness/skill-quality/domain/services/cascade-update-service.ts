/**
 * @layer domain
 * @unit skill-quality
 */
import { CascadeUpdateTarget } from '../value-objects/cascade-update-target.js';
import type { ValidatorIdRegistryPort } from '../ports/validator-id-registry-port.js';
import type { ConfigQueryPort } from '../ports/config-query-port.js';

export class CascadeUpdateService {
  constructor(
    private readonly validatorIdRegistryPort: ValidatorIdRegistryPort,
    private readonly configQueryPort: ConfigQueryPort,
  ) {}

  async resolve(storyId: string): Promise<readonly CascadeUpdateTarget[]> {
    const patterns = await this.configQueryPort.getCascadeUpdateTargetPatterns();
    const validatorIds = await this.validatorIdRegistryPort.list();

    // Build targets from patterns combined with validator IDs
    const targets: CascadeUpdateTarget[] = [];
    for (const pattern of patterns) {
      // For each pattern, create a target using it as a file path representative
      // The actual file expansion happens at the infrastructure level
      for (const _validatorId of validatorIds) {
        const target = CascadeUpdateTarget.create(pattern, storyId);
        // Avoid duplicate paths
        if (!targets.some((t) => t.filePath === target.filePath)) {
          targets.push(target);
        }
        break; // one target per pattern
      }
    }

    return targets;
  }
}
