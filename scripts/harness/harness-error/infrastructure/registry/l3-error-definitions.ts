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
    defaultSeverity: Severity.create('error'),
    adrRefRequired: true,
    defaultAdrRef: AdrRef.create('ADR-003'),
    fixExampleRequired: true,
    defaultFixExample: FixExample.create(input.defaultFixExample),
    ownerValidatorId: input.ownerValidatorId,
  });
}

export const L3_ERROR_DEFINITIONS = Object.freeze([
  createDefinition({
    code: 'L3-001',
    title: 'セキュリティ上の問題が検出された',
    category: 'security',
    ownerValidatorId: 'security',
    defaultFixExample: "const token = process.env.API_TOKEN ?? '';",
  }),
  createDefinition({
    code: 'L3-002',
    title: 'パフォーマンス上の問題が検出された',
    category: 'performance',
    ownerValidatorId: 'performance',
    defaultFixExample:
      'const actual = await Promise.all(tasks.map((task) => task()));',
  }),
  createDefinition({
    code: 'L3-003',
    title: 'カバレッジ閾値を下回っている',
    category: 'quality',
    ownerValidatorId: 'coverage',
    defaultFixExample: 'const actualCoverage = 0.95;',
  }),
  createDefinition({
    code: 'L3-004',
    title: '要件とテストのトレーサビリティが不足している',
    category: 'consistency',
    ownerValidatorId: 'nyquist',
    defaultFixExample: 'const storyId = "H06-01";',
  }),
]);
