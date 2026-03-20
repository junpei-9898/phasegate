/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { RuleDefinition } from '../../domain/value-objects/rule-definition.js';
import type { RuleName } from '../../domain/value-objects/rule-name.js';

export type ResolveEnabledRulesOutput = {
  readonly enabledRules: readonly RuleDefinition[];
  readonly skippedRules: readonly RuleName[];
};
