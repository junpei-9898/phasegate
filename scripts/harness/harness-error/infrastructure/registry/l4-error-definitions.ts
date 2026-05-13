/**
 * @layer infrastructure
 * @unit harness-error
 * @work-item-id WI-156
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
  createDefinition({
    code: 'L4-004',
    title: '設計ドキュメントの鮮度が閾値を超過した',
    category: 'consistency',
    ownerValidatorId: 'doc-freshness',
    defaultFixExample: 'const actual = "review or refresh stale design document";',
  }),
  createDefinition({
    code: 'L4-005',
    title: '設計ドキュメント内のポインタ参照が解決できない',
    category: 'consistency',
    ownerValidatorId: 'pointer-validation',
    defaultFixExample: 'const actual = "fix unresolved document pointer";',
  }),
  createDefinition({
    code: 'L4-006',
    title: 'スキルカタログ数とドキュメント宣言が一致しない',
    category: 'consistency',
    ownerValidatorId: 'skill-catalog-drift',
    defaultFixExample: 'const actual = "update skill count declarations with the skill catalog";',
  }),
]);
