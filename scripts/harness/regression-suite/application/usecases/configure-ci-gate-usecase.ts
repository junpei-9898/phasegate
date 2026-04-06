// @layer application
import { SuiteId } from '../../domain/value-objects/suite-id.js';
import { CiGateConfig } from '../../domain/value-objects/ci-gate-config.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { ConfigureCiGateInput } from '../dto/configure-ci-gate-input.js';
import type { ConfigureCiGateOutput } from '../dto/configure-ci-gate-output.js';
import type { SuiteIdValue } from '../../domain/value-objects/suite-id.js';

export class ConfigureCiGateUseCase {
  constructor(private readonly configQueryPort: ConfigQueryPort) {}

  async execute(input: ConfigureCiGateInput): Promise<ConfigureCiGateOutput> {
    const threshold =
      input.coverageThreshold ?? (await this.configQueryPort.getCoverageThreshold());

    const suiteIds = input.requiredSuiteIds.map((id) => SuiteId.create(id));

    const config = CiGateConfig.create({
      requiredSuiteIds: suiteIds,
      coverageThreshold: threshold,
      executionMode: input.executionMode,
    });

    return {
      requiredSuiteIds: config.requiredSuiteIds.map((id) => id.value) as SuiteIdValue[],
      coverageThreshold: config.coverageThreshold,
      executionMode: config.executionMode,
    };
  }
}
