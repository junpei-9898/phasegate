/**
 * @layer infrastructure
 * @unit skill-quality
 */
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';

export class HarnessConfigQueryAdapter implements ConfigQueryPort {
  async getCoverageThreshold(): Promise<{ requirement: number; code: number }> {
    return { requirement: 100, code: 80 };
  }

  async isAgentLessonCollectionEnabled(): Promise<boolean> {
    return true;
  }

  async getCascadeUpdateTargetPatterns(): Promise<readonly string[]> {
    return ['scripts/**/*.ts', 'docs/**/*.md'];
  }
}
