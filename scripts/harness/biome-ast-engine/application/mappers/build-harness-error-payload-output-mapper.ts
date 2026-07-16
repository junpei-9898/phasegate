/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { RuleViolation } from '../../domain/value-objects/rule-violation.js';
import type {
  BuildHarnessErrorPayloadOutput,
  HarnessErrorPayloadItem,
} from '../dto/build-harness-error-payload-output.js';

type FormattedViolation = {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly adr_ref?: string;
  readonly fix_example?: string;
};

const RULE_CODE_BY_NAME: Readonly<Record<string, string>> = Object.freeze({
  'require-unit-comment': 'L1-001',
  'require-layer-comment': 'L1-002',
  'no-layer-violation': 'L1-003',
  'enforce-folder-structure': 'L1-004',
  'no-any-abuse': 'L1-005',
  'no-code-duplication': 'L1-006',
  'no-ghost-file': 'L1-007',
  'no-comment-flood': 'L1-008',
});

const toHarnessErrorPayloadItem = (
  violation: RuleViolation,
  formatted: FormattedViolation
): Readonly<HarnessErrorPayloadItem> =>
  Object.freeze({
    code: RULE_CODE_BY_NAME[violation.ruleName.toString()],
    severity: formatted.severity,
    message: formatted.message,
    suggestion: formatted.suggestion,
    ...(formatted.adr_ref !== undefined ? { adr_ref: formatted.adr_ref } : {}),
    ...(formatted.fix_example !== undefined ? { fix_example: formatted.fix_example } : {}),
  });

export const toBuildHarnessErrorPayloadOutput = (
  violations: readonly RuleViolation[],
  formattedErrors: readonly FormattedViolation[]
): Readonly<BuildHarnessErrorPayloadOutput> =>
  Object.freeze({
    errors: Object.freeze(
      violations.map((violation, index) =>
        toHarnessErrorPayloadItem(violation, formattedErrors[index]!)
      )
    ),
  });
