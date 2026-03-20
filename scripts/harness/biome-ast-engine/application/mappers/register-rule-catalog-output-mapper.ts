/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { RuleDefinition } from '../../domain/value-objects/rule-definition.js';
import type { RegisterRuleCatalogOutput } from '../dto/register-rule-catalog-output.js';

export const toRegisterRuleCatalogOutput = (
  rules: readonly RuleDefinition[]
): Readonly<RegisterRuleCatalogOutput> =>
  Object.freeze({
    rules: Object.freeze([...rules]),
  });
