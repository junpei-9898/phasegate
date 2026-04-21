// @unit agent-integration
// @layer infrastructure

import type {
  BaselineGrandfatherQueryPort,
  BaselineGrandfatherCheckResult,
} from '../../domain/ports/baseline-grandfather-query-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { BaselineRepositoryPort } from '../../../ci-governance/domain/ports/baseline-repository-port.js';
import { BaselineJsonRepositoryAdapter } from '../../../ci-governance/infrastructure/adapters/baseline-json-repository-adapter.js';

export interface CiGovernanceBaselineGrandfatherAdapterDeps {
  readonly baseDir: string;
  readonly configQueryPort: ConfigQueryPort;
  readonly baselineRepositoryFactory?: (
    baseDir: string,
    relativePath: string,
  ) => BaselineRepositoryPort;
}

export class CiGovernanceBaselineGrandfatherAdapter
  implements BaselineGrandfatherQueryPort
{
  constructor(private readonly deps: CiGovernanceBaselineGrandfatherAdapterDeps) {}

  async check(
    targetFilePaths: readonly string[],
  ): Promise<BaselineGrandfatherCheckResult> {
    try {
      const baselineConfig = await this.deps.configQueryPort.getBaselineConfig();

      if (!baselineConfig.enabled) {
        return {
          allGrandfathered: false,
          baselineEnabled: false,
          grandfatheredPaths: [],
        };
      }

      if (targetFilePaths.length === 0) {
        return {
          allGrandfathered: false,
          baselineEnabled: true,
          grandfatheredPaths: [],
        };
      }

      const factory =
        this.deps.baselineRepositoryFactory ??
        ((baseDir, relativePath) =>
          new BaselineJsonRepositoryAdapter(baseDir, relativePath));
      const repository = factory(this.deps.baseDir, baselineConfig.path);

      if (!(await repository.exists())) {
        return {
          allGrandfathered: false,
          baselineEnabled: true,
          grandfatheredPaths: [],
        };
      }

      const snapshot = await repository.load();
      if (snapshot === null) {
        return {
          allGrandfathered: false,
          baselineEnabled: true,
          grandfatheredPaths: [],
        };
      }

      const grandfathered: string[] = [];
      for (const p of targetFilePaths) {
        if (snapshot.contains(p)) grandfathered.push(p);
      }
      const allGrandfathered = grandfathered.length === targetFilePaths.length;

      return {
        allGrandfathered,
        baselineEnabled: true,
        grandfatheredPaths: grandfathered,
      };
    } catch {
      return {
        allGrandfathered: false,
        baselineEnabled: false,
        grandfatheredPaths: [],
      };
    }
  }
}
