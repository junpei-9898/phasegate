/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { RuleViolation } from '../../domain/value-objects/rule-violation.js';

export type BuildHarnessErrorPayloadInput = {
  readonly violations: readonly RuleViolation[];
};
