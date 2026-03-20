/**
 * @layer domain
 * @unit phase2-extensions
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export interface PointerRuleProps {
  ruleId: string;
  documentPattern: string;
  failOnBroken: boolean;
}

export class PointerRule {
  readonly ruleId: string;
  readonly documentPattern: string;
  readonly failOnBroken: boolean;

  private constructor(props: PointerRuleProps) {
    this.ruleId = props.ruleId;
    this.documentPattern = props.documentPattern;
    this.failOnBroken = props.failOnBroken;
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
}
