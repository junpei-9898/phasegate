// @layer infrastructure
import { SuiteId } from '../../domain/value-objects/suite-id.js';
import { RegressionSuiteDefinition } from '../../domain/value-objects/regression-suite-definition.js';
import { AgentIndependenceTest } from '../../domain/value-objects/agent-independence-test.js';

export class AgentIndependenceSuiteDefinition {
  static get(): RegressionSuiteDefinition {
    const testCases = [
      AgentIndependenceTest.create({
        targetModule: 'scripts/harness/regression-suite/domain/services/regression-runner.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: ['infrastructure/adapters/'],
      }),
      AgentIndependenceTest.create({
        targetModule: 'scripts/harness/regression-suite/domain/services/migration-analyzer.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: ['infrastructure/adapters/'],
      }),
      AgentIndependenceTest.create({
        targetModule: 'scripts/harness/regression-suite/domain/services/import-guard-service.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: ['infrastructure/adapters/'],
      }),
    ];

    return RegressionSuiteDefinition.create({
      suiteId: SuiteId.create('agent-independence'),
      testCases,
      description: 'エージェント非依存性テストスイート（K14/K15非交渉要件）',
    });
  }
}
