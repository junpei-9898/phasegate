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
}): ErrorDefinition {
  return ErrorDefinition.create({
    code: ErrorCode.create(input.code),
    title: input.title,
    category: input.category,
    defaultSeverity: Severity.create('warning'),
    adrRefRequired: true,
    defaultAdrRef: AdrRef.create('ADR-004'),
    fixExampleRequired: true,
    defaultFixExample: FixExample.create(input.defaultFixExample),
    ownerValidatorId: input.ownerValidatorId,
  });
}

export const L4_ERROR_DEFINITIONS = Object.freeze([
  createDefinition({
    code: 'L4-001',
    title: '設計と実装の乖離が検出された',
    category: 'consistency',
    ownerValidatorId: 'drift-detect',
    defaultFixExample: 'const actual = "align implementation with design";',
  }),
  createDefinition({
    code: 'L4-002',
    title: '文書間の整合性が崩れている',
    category: 'consistency',
    ownerValidatorId: 'consistency-check',
    defaultFixExample: 'const actual = "synchronize documentation";',
  }),
  createDefinition({
    code: 'L4-003',
    title: '未使用コードが検出された',
    category: 'consistency',
    ownerValidatorId: 'dead-code',
    defaultFixExample: 'const actual = "remove unused export";',
  }),
]);
