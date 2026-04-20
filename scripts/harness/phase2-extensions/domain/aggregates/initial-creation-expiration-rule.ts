/**
 * @layer domain
 * @unit phase2-extensions
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export type InitialCreationEvaluationMode = 'or' | 'and';

export interface InitialCreationExpirationRuleProps {
  ruleId: string;
  documentPattern: string;
  daysThreshold: number;
  commitCountThreshold: number;
  evaluationMode: InitialCreationEvaluationMode;
  enabled: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function toPatternRegex(pattern: string): RegExp {
  let regex = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];
    const afterNext = pattern[index + 2];

    if (current === '*' && next === '*') {
      if (afterNext === '/') {
        regex += '(?:.*/)?';
        index += 2;
      } else {
        regex += '.*';
        index += 1;
      }
      continue;
    }

    if (current === '*') {
      regex += '[^/]*';
      continue;
    }

    regex += escapeRegex(current);
  }

  return new RegExp(`${regex}$`);
}

export class InitialCreationExpirationRule {
  readonly ruleId: string;
  readonly documentPattern: string;
  readonly daysThreshold: number;
  readonly commitCountThreshold: number;
  readonly evaluationMode: InitialCreationEvaluationMode;
  readonly enabled: boolean;
  private readonly patternRegex: RegExp;

  private constructor(props: InitialCreationExpirationRuleProps) {
    this.ruleId = props.ruleId;
    this.documentPattern = props.documentPattern;
    this.daysThreshold = props.daysThreshold;
    this.commitCountThreshold = props.commitCountThreshold;
    this.evaluationMode = props.evaluationMode;
    this.enabled = props.enabled;
    this.patternRegex = toPatternRegex(props.documentPattern);
    Object.freeze(this);
  }

  static create(props: InitialCreationExpirationRuleProps): InitialCreationExpirationRule {
    if (props.ruleId.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-247', 'ruleId は空文字不可です');
    }

    if (props.documentPattern.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-248', 'documentPattern は空文字不可です');
    }

    if (!Number.isInteger(props.daysThreshold) || props.daysThreshold <= 0) {
      throw new Phase2ExtensionsDomainError('L4-244', 'daysThreshold は正の整数 (0 超) である必要があります');
    }

    if (!Number.isInteger(props.commitCountThreshold) || props.commitCountThreshold <= 0) {
      throw new Phase2ExtensionsDomainError('L4-245', 'commitCountThreshold は正の整数 (0 超) である必要があります');
    }

    if (props.evaluationMode !== 'or' && props.evaluationMode !== 'and') {
      throw new Phase2ExtensionsDomainError('L4-246', 'evaluationMode が不正です');
    }

    return new InitialCreationExpirationRule(props);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  matchesDocument(documentPath: string): boolean {
    return this.patternRegex.test(documentPath);
  }
}
