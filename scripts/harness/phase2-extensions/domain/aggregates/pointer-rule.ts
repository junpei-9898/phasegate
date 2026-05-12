/**
 * @layer domain
 * @unit phase2-extensions
 * @work-item-id WI-122
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export interface PointerRuleProps {
  ruleId: string;
  documentPattern: string;
  failOnBroken: boolean;
  owner?: string;
  pointerPolicies?: Record<string, 'fail' | 'warn' | 'skip'>;
}

export class PointerRule {
  readonly ruleId: string;
  readonly documentPattern: string;
  readonly failOnBroken: boolean;
  readonly owner: string;
  readonly pointerPolicies: Readonly<Record<string, 'fail' | 'warn' | 'skip'>>;

  private constructor(props: PointerRuleProps) {
    this.ruleId = props.ruleId;
    this.documentPattern = props.documentPattern;
    this.failOnBroken = props.failOnBroken;
    this.owner = props.owner ?? 'unowned';
    this.pointerPolicies = Object.freeze({ ...(props.pointerPolicies ?? {}) });
    Object.freeze(this);
  }

  static create(props: PointerRuleProps): PointerRule {
    if (props.ruleId.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-213', 'ruleId は空文字不可です');
    }
    if (props.documentPattern.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-214', 'documentPattern は空文字不可です');
    }
    return new PointerRule(props);
  }

  shouldFailOnBroken(): boolean {
    return this.failOnBroken;
  }

  policyFor(pointerType: string): 'fail' | 'warn' | 'skip' {
    if (pointerType === 'external-url' && this.pointerPolicies[pointerType] === undefined) {
      return 'skip';
    }
    return this.pointerPolicies[pointerType] ?? (this.failOnBroken ? 'fail' : 'warn');
  }
}
