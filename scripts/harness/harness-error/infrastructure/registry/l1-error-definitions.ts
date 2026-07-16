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
    defaultAdrRef: AdrRef.create('ADR-001'),
    fixExampleRequired: true,
    defaultFixExample: FixExample.create(input.defaultFixExample),
    ownerValidatorId: input.ownerValidatorId,
  });
}

export const L1_ERROR_DEFINITIONS = Object.freeze([
  createDefinition({
    code: 'L1-001',
    title: '@unit コメントが不足している',
    category: 'metadata',
    ownerValidatorId: 'metadata',
    defaultFixExample: '/** @unit harness-error */\nconst actual = true;',
  }),
  createDefinition({
    code: 'L1-002',
    title: '@layer コメントが不足している',
    category: 'metadata',
    ownerValidatorId: 'metadata',
    defaultFixExample: '/** @layer infrastructure */\nconst actual = true;',
  }),
  createDefinition({
    code: 'L1-003',
    title: 'レイヤー境界を越えるimportがある',
    category: 'dependency',
    ownerValidatorId: 'dependency',
    defaultFixExample:
      "import type { DependencyPort } from '../ports/dependency-port.js';\nconst actual = true;",
  }),
  createDefinition({
    code: 'L1-004',
    title: 'フォルダ構造がアーキテクチャ規約に違反している',
    category: 'architecture',
    ownerValidatorId: 'architecture',
    defaultFixExample: "const destination = 'infrastructure/adapters';",
  }),
  createDefinition({
    code: 'L1-005',
    title: 'any型の乱用がある',
    category: 'quality',
    ownerValidatorId: 'architecture',
    defaultFixExample: 'const actual: string = "fixed";',
  }),
  createDefinition({
    code: 'L1-006',
    title: '重複コードが検出された',
    category: 'architecture',
    ownerValidatorId: 'architecture',
    defaultFixExample:
      'function buildValue(): string { return "shared"; }\nconst actual = buildValue();',
  }),
  createDefinition({
    code: 'L1-007',
    title: '参照されないファイルが残っている',
    category: 'architecture',
    ownerValidatorId: 'architecture',
    defaultFixExample: 'export const actual = "shared";',
  }),
  createDefinition({
    code: 'L1-008',
    title: 'コメント量が過剰である',
    category: 'quality',
    ownerValidatorId: 'architecture',
    defaultFixExample: 'const actual = "keep comments concise";',
  }),
]);
