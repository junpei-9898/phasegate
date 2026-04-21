// @unit agent-integration
// @layer infrastructure

import type {
  ErrorGuidance,
  ErrorGuidanceQueryPort,
} from '../../domain/ports/error-guidance-query-port.js';

/**
 * harness-error Unit の ErrorDefinitionRegistry を lookup して
 * actionable guidance を返す adapter
 *
 * Wave 2 の CiGovernanceBaselineGrandfatherAdapter と同じ
 * infrastructure-to-infrastructure クロス Unit パターン
 */
export class HarnessErrorGuidanceAdapter implements ErrorGuidanceQueryPort {
  private readonly rootDir: string;

  constructor(options: { rootDir: string }) {
    this.rootDir = options.rootDir;
  }

  async getGuidance(errorCode: string): Promise<ErrorGuidance | null> {
    try {
      const [{ createHarnessErrorModule }, { ErrorCode }] = await Promise.all([
        import('../../../harness-error/composition-root.js'),
        import('../../../harness-error/domain/value-objects/error-code.js'),
      ]);
      const mod = createHarnessErrorModule(this.rootDir);
      const definition = mod.errorDefinitionRegistry.getDefinition(
        ErrorCode.create(errorCode),
      );
      if (
        definition.defaultSuggestedSkill === null
        && definition.defaultScaffoldCommand === null
        && definition.defaultTemplatePath === null
      ) {
        return null;
      }
      return {
        suggestedSkill: definition.defaultSuggestedSkill,
        scaffoldCommand: definition.defaultScaffoldCommand,
        templatePath: definition.defaultTemplatePath,
      };
    } catch {
      return null;
    }
  }
}
