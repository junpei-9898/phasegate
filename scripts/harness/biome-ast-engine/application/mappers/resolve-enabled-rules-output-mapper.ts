/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { RuleDefinition } from '../../domain/value-objects/rule-definition.js';
import type { RuleName } from '../../domain/value-objects/rule-name.js';
import type { ResolveEnabledRulesOutput } from '../dto/resolve-enabled-rules-output.js';

export const toResolveEnabledRulesOutput = (
  enabledRules: readonly RuleDefinition[],
  skippedRules: readonly RuleName[]
): Readonly<ResolveEnabledRulesOutput> =>
  Object.freeze({
    enabledRules: Object.freeze([...enabledRules]),
    skippedRules: Object.freeze([...skippedRules]),
  });
