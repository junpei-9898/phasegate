/**
 * @layer domain
 * @unit harness-error
 *
 * エラー定義値オブジェクト
 * エラーコードごとの正規定義（タイトル、カテゴリ、severity、ADR/fix_example要否）を不変で保持する
 */
import { InvalidErrorDefinitionError } from "../errors/invalid-error-definition-error.js";
import type { AdrRef } from "./adr-ref.js";
import type { ErrorCode } from "./error-code.js";
import type { FixExample } from "./fix-example.js";
import type { RemediationType } from "./remediation-type.js";
import type { Severity } from "./severity.js";

export type ErrorDefinitionCategory =
  | "phase_gate"
  | "architecture"
  | "dependency"
  | "quality"
  | "security"
  | "performance"
  | "consistency"
  | "metadata";

export interface ErrorDefinitionProps {
  readonly code: ErrorCode;
  readonly title: string;
  readonly category: string;
  readonly defaultSeverity: Severity;
  readonly adrRefRequired: boolean;
  readonly defaultAdrRef: AdrRef | null;
  readonly fixExampleRequired: boolean;
  readonly defaultFixExample: FixExample | null;
  readonly ownerValidatorId: string;
  readonly defaultSuggestedSkill?: string | null;
  readonly defaultScaffoldCommand?: string | null;
  readonly defaultTemplatePath?: string | null;
  /** WI-335: このエラーコードの既定修復方式。未設定（null）は 'manual' 扱い（後方互換）。 */
  readonly defaultRemediationType?: RemediationType | null;
}

export class ErrorDefinition {
  readonly code: ErrorCode;
  readonly title: string;
  readonly category: string;
  readonly defaultSeverity: Severity;
  readonly adrRefRequired: boolean;
  readonly defaultAdrRef: AdrRef | null;
  readonly fixExampleRequired: boolean;
  readonly defaultFixExample: FixExample | null;
  readonly ownerValidatorId: string;
  readonly defaultSuggestedSkill: string | null;
  readonly defaultScaffoldCommand: string | null;
  readonly defaultTemplatePath: string | null;
  readonly defaultRemediationType: RemediationType | null;

  private constructor(props: ErrorDefinitionProps) {
    this.code = props.code;
    this.title = props.title;
    this.category = props.category;
    this.defaultSeverity = props.defaultSeverity;
    this.adrRefRequired = props.adrRefRequired;
    this.defaultAdrRef = props.defaultAdrRef;
    this.fixExampleRequired = props.fixExampleRequired;
    this.defaultFixExample = props.defaultFixExample;
    this.ownerValidatorId = props.ownerValidatorId;
    this.defaultSuggestedSkill = props.defaultSuggestedSkill ?? null;
    this.defaultScaffoldCommand = props.defaultScaffoldCommand ?? null;
    this.defaultTemplatePath = props.defaultTemplatePath ?? null;
    this.defaultRemediationType = props.defaultRemediationType ?? null;
    Object.freeze(this);
  }

  static create(props: ErrorDefinitionProps): ErrorDefinition {
    if (!props.ownerValidatorId || props.ownerValidatorId.trim().length === 0) {
      throw new InvalidErrorDefinitionError("ownerValidatorId は空文字であってはなりません。");
    }

    if (props.defaultAdrRef !== null && !props.adrRefRequired) {
      throw new InvalidErrorDefinitionError(
        "defaultAdrRef を持つ場合は adrRefRequired を true にしなければなりません。",
      );
    }

    // fixExampleRequired=true かつ defaultFixExample=null は許容する
    // （呼び出し側が明示的に fixExample を提供する前提）

    return new ErrorDefinition(props);
  }

  requiresAdrRef(): boolean {
    return this.adrRefRequired;
  }

  requiresFixExample(): boolean {
    return this.fixExampleRequired;
  }

  resolveAdrRef(explicitAdrRef?: AdrRef | null): AdrRef | null {
    if (explicitAdrRef) {
      return explicitAdrRef;
    }
    return this.defaultAdrRef;
  }

  resolveFixExample(explicitFixExample?: FixExample | null): FixExample | null {
    if (explicitFixExample) {
      return explicitFixExample;
    }
    return this.defaultFixExample;
  }

  resolveSuggestedSkill(explicit?: string | null): string | null {
    if (explicit) {
      return explicit;
    }
    return this.defaultSuggestedSkill;
  }

  resolveScaffoldCommand(explicit?: string | null): string | null {
    if (explicit) {
      return explicit;
    }
    return this.defaultScaffoldCommand;
  }

  resolveTemplatePath(explicit?: string | null): string | null {
    if (explicit) {
      return explicit;
    }
    return this.defaultTemplatePath;
  }

  /** WI-335: 明示指定を優先し、なければ定義既定の修復方式を返す（未定義は null = 'manual' 扱い）。 */
  resolveRemediationType(explicit?: RemediationType | null): RemediationType | null {
    if (explicit) {
      return explicit;
    }
    return this.defaultRemediationType;
  }

  equals(other: ErrorDefinition): boolean {
    const adrRefEqual =
      this.defaultAdrRef === null && other.defaultAdrRef === null
        ? true
        : this.defaultAdrRef !== null && other.defaultAdrRef !== null
          ? this.defaultAdrRef.equals(other.defaultAdrRef)
          : false;

    const fixExampleEqual =
      this.defaultFixExample === null && other.defaultFixExample === null
        ? true
        : this.defaultFixExample !== null && other.defaultFixExample !== null
          ? this.defaultFixExample.equals(other.defaultFixExample)
          : false;

    return (
      this.code.equals(other.code) &&
      this.title === other.title &&
      this.category === other.category &&
      this.defaultSeverity.equals(other.defaultSeverity) &&
      this.adrRefRequired === other.adrRefRequired &&
      adrRefEqual &&
      this.fixExampleRequired === other.fixExampleRequired &&
      fixExampleEqual &&
      this.ownerValidatorId === other.ownerValidatorId
    );
  }
}
