/**
 * @layer domain
 * @unit harness-error
 *
 * HarnessError 中心モデル（不変値オブジェクト）
 * 集約を持たず、全属性を不変で保持する値オブジェクトとして設計
 */
import type { AdrRef } from './adr-ref.js';
import type { ErrorCode } from './error-code.js';
import type { FixExample } from './fix-example.js';
import type { Severity } from './severity.js';

export interface HarnessErrorContract {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly adr_ref?: string;
  readonly fix_example?: string;
  readonly suggested_skill?: string;
  readonly scaffold_command?: string;
  readonly template_path?: string;
}

export interface HarnessErrorProps {
  readonly code: ErrorCode;
  readonly severity: Severity;
  readonly message: string;
  readonly suggestion: string;
  readonly adrRef: AdrRef | null;
  readonly fixExample: FixExample | null;
  readonly suggestedSkill?: string | null;
  readonly scaffoldCommand?: string | null;
  readonly templatePath?: string | null;
}

export class HarnessError {
  readonly code: ErrorCode;
  readonly severity: Severity;
  readonly message: string;
  readonly suggestion: string;
  readonly adrRef: AdrRef | null;
  readonly fixExample: FixExample | null;
  readonly suggestedSkill: string | null;
  readonly scaffoldCommand: string | null;
  readonly templatePath: string | null;

  constructor(props: HarnessErrorProps) {
    this.code = props.code;
    this.severity = props.severity;
    this.message = props.message;
    this.suggestion = props.suggestion;
    this.adrRef = props.adrRef;
    this.fixExample = props.fixExample;
    this.suggestedSkill = props.suggestedSkill ?? null;
    this.scaffoldCommand = props.scaffoldCommand ?? null;
    this.templatePath = props.templatePath ?? null;
  }

  equals(other: HarnessError): boolean {
    const adrRefEqual =
      this.adrRef === null && other.adrRef === null
        ? true
        : this.adrRef !== null && other.adrRef !== null
          ? this.adrRef.equals(other.adrRef)
          : false;

    const fixExampleEqual =
      this.fixExample === null && other.fixExample === null
        ? true
        : this.fixExample !== null && other.fixExample !== null
          ? this.fixExample.equals(other.fixExample)
          : false;

    return (
      this.code.equals(other.code) &&
      this.severity.equals(other.severity) &&
      this.message === other.message &&
      this.suggestion === other.suggestion &&
      adrRefEqual &&
      fixExampleEqual &&
      this.suggestedSkill === other.suggestedSkill &&
      this.scaffoldCommand === other.scaffoldCommand &&
      this.templatePath === other.templatePath
    );
  }

  hasAdrRef(): boolean {
    return this.adrRef !== null;
  }

  hasFixExample(): boolean {
    return this.fixExample !== null;
  }

  hasSuggestedSkill(): boolean {
    return this.suggestedSkill !== null;
  }

  hasScaffoldCommand(): boolean {
    return this.scaffoldCommand !== null;
  }

  hasTemplatePath(): boolean {
    return this.templatePath !== null;
  }

  toContract(): Readonly<HarnessErrorContract> {
    const contract: HarnessErrorContract = {
      code: this.code.toString(),
      severity: this.severity.value,
      message: this.message,
      suggestion: this.suggestion,
      ...(this.adrRef !== null ? { adr_ref: this.adrRef.toString() } : {}),
      ...(this.fixExample !== null
        ? { fix_example: this.fixExample.toString() }
        : {}),
      ...(this.suggestedSkill !== null ? { suggested_skill: this.suggestedSkill } : {}),
      ...(this.scaffoldCommand !== null ? { scaffold_command: this.scaffoldCommand } : {}),
      ...(this.templatePath !== null ? { template_path: this.templatePath } : {}),
    };
    return Object.freeze(contract);
  }
}
