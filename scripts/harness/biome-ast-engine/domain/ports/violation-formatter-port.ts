/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { RuleViolation } from '../value-objects/rule-violation.js';

export interface ViolationFormatterPort {
  format(violations: readonly RuleViolation[]): Promise<
    readonly {
      code: string;
      severity: 'error' | 'warning';
      message: string;
      suggestion: string;
      adr_ref?: string;
      fix_example?: string;
    }[]
  >;
}
