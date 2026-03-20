/**
 * @layer domain
 * @unit phase2-extensions
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';
import { FreshnessThreshold } from '../value-objects/freshness-threshold.js';

export interface DocFreshnessRuleProps {
  ruleId: string;
  documentPattern: string;
  threshold: FreshnessThreshold;
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

export class DocFreshnessRule {
  readonly ruleId: string;
  readonly documentPattern: string;
  readonly threshold: FreshnessThreshold;
  readonly enabled: boolean;
  private readonly patternRegex: RegExp;

  private constructor(props: DocFreshnessRuleProps) {
    this.ruleId = props.ruleId;
    this.documentPattern = props.documentPattern;
    this.threshold = props.threshold;
    this.enabled = props.enabled;
    this.patternRegex = toPatternRegex(props.documentPattern);
    Object.freeze(this);
  }

  static create(props: DocFreshnessRuleProps): DocFreshnessRule {
    if (props.ruleId.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-211', 'ruleId は空文字不可です');
    }
    if (props.documentPattern.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-212', 'documentPattern は空文字不可です');
    }
    return new DocFreshnessRule(props);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  matchesDocument(documentPath: string): boolean {
    return this.patternRegex.test(documentPath);
  }
}
