// @layer infrastructure
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';

export class HarnessConfigQueryAdapter implements ConfigQueryPort {
  constructor(private readonly defaultThreshold: number = 90) {}

  async getCoverageThreshold(): Promise<number> {
    return this.defaultThreshold;
  }
}
