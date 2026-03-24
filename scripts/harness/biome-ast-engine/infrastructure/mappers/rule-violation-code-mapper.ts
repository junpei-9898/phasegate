/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import type { RuleNameValue } from '../../domain/value-objects/rule-name.js';

const RULE_TO_CODE: Readonly<Record<RuleNameValue, string>> = {
  'require-unit-comment': 'L1-001',
  'require-layer-comment': 'L1-002',
  'no-layer-violation': 'L1-003',
  'enforce-folder-structure': 'L1-004',
  'no-any-abuse': 'L1-005',
  'no-ghost-file': 'L1-006',
  'no-comment-flood': 'L1-007',
  'no-code-duplication': 'L1-008',
};

export class UnknownRuleCodeMappingError extends Error {
  constructor(ruleName: string) {
    super(`No error code mapping for rule: ${ruleName}`);
    this.name = 'UnknownRuleCodeMappingError';
  }
}

/**
 * ルール名を L1-001〜L1-008 のエラーコードに変換する。
 */
export const mapRuleNameToCode = (ruleName: string): string => {
  const code = RULE_TO_CODE[ruleName as RuleNameValue];

  if (code === undefined) {
    throw new UnknownRuleCodeMappingError(ruleName);
  }

  return code;
};

/**
 * エラーコードからルール名を逆引きする。
 */
export const mapCodeToRuleName = (code: string): string => {
  for (const [name, mapped] of Object.entries(RULE_TO_CODE)) {
    if (mapped === code) {
      return name;
    }
  }

  throw new UnknownRuleCodeMappingError(code);
};
