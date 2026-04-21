/**
 * @layer infrastructure
 * @unit harness-error
 */
import { AdrRef } from '../../domain/value-objects/adr-ref.js';
import { ErrorCode } from '../../domain/value-objects/error-code.js';
import { ErrorDefinition } from '../../domain/value-objects/error-definition.js';
import { FixExample } from '../../domain/value-objects/fix-example.js';
import { Severity } from '../../domain/value-objects/severity.js';

function createDefinition(input: {
  code: string;
  title: string;
  category: 'phase_gate' | 'architecture' | 'dependency' | 'quality' | 'security' | 'performance' | 'consistency' | 'metadata';
  ownerValidatorId: string;
  defaultFixExample: string;
  defaultSuggestedSkill?: string;
  defaultScaffoldCommand?: string;
  defaultTemplatePath?: string;
}): ErrorDefinition {
  return ErrorDefinition.create({
    code: ErrorCode.create(input.code),
    title: input.title,
    category: input.category,
    defaultSeverity: Severity.create('error'),
    adrRefRequired: true,
    defaultAdrRef: AdrRef.create('ADR-002'),
    fixExampleRequired: true,
    defaultFixExample: FixExample.create(input.defaultFixExample),
    ownerValidatorId: input.ownerValidatorId,
    defaultSuggestedSkill: input.defaultSuggestedSkill ?? null,
    defaultScaffoldCommand: input.defaultScaffoldCommand ?? null,
    defaultTemplatePath: input.defaultTemplatePath ?? null,
  });
}

export const L2_ERROR_DEFINITIONS = Object.freeze([
  createDefinition({
    code: 'L2-001',
    title: 'Phase Gate の前提条件に違反している',
    category: 'phase_gate',
    ownerValidatorId: 'phase-gate',
    defaultFixExample:
      "const requiredPlanPath = 'docs/inception/harness-error/it_test_logic_plan.md';",
    defaultSuggestedSkill: '/story-implementor',
    defaultScaffoldCommand: 'npx phasegate scaffold-design --unit <unit-id> --phase logical',
    defaultTemplatePath: 'docs/templates/logical_design.template.md',
  }),
  createDefinition({
    code: 'L2-002',
    title: 'メタデータが不足している',
    category: 'metadata',
    ownerValidatorId: 'metadata',
    defaultFixExample:
      '/**\n * @unit harness-error\n * @layer infrastructure\n */\nconst actual = true;',
  }),
  createDefinition({
    code: 'L2-003',
    title: 'テスト品質規約に違反している',
    category: 'quality',
    ownerValidatorId: 'test-quality',
    defaultFixExample:
      "const actual = sut.execute();\nexpect(actual).toBeDefined();",
  }),
]);
