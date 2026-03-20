/**
 * @layer domain
 * @unit validator-system
 *
 * ValidationRule 値オブジェクト
 * バリデータが適用する個々のルールの不変定義
 */

export interface ValidationRuleErrorTemplate {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly messageTemplate: string;
  readonly suggestionTemplate?: string;
}

export interface ValidationRuleProps {
  readonly ruleName: string;
  readonly description?: string;
  readonly errorTemplate: ValidationRuleErrorTemplate;
  readonly fixExample: string | null;
}

export class ValidationRule {
  readonly ruleName: string;
  readonly description: string;
  readonly errorTemplate: ValidationRuleErrorTemplate;
  readonly fixExample: string | null;

  private constructor(props: ValidationRuleProps) {
    this.ruleName = props.ruleName;
    this.description = props.description ?? '';
    this.errorTemplate = Object.freeze({ ...props.errorTemplate });
    this.fixExample = props.fixExample;
    Object.freeze(this);
  }

  static create(props: ValidationRuleProps): ValidationRule {
    return new ValidationRule(props);
  }

  buildErrorCode(): string {
    return this.errorTemplate.code;
  }

  equals(other: ValidationRule): boolean {
    return this.ruleName === other.ruleName;
  }
}
