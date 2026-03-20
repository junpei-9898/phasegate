/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { RuleDefinition } from '../../domain/value-objects/rule-definition.js';

export type RegisterRuleCatalogOutput = {
  readonly rules: readonly RuleDefinition[];
};
