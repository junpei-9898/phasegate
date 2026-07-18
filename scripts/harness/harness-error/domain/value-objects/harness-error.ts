/**
 * @layer domain
 * @unit harness-error
 *
 * HarnessError 中心モデル（不変値オブジェクト）
 * 集約を持たず、全属性を不変で保持する値オブジェクトとして設計
 */
import type { AdrRef } from "./adr-ref.js";
import type { ErrorCode } from "./error-code.js";
import type { FixExample } from "./fix-example.js";
import { DEFAULT_REMEDIATION_TYPE, type RemediationType } from "./remediation-type.js";
import type { Severity } from "./severity.js";

export interface HarnessErrorContract {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly suggestion: string;
  readonly adr_ref?: string;
  readonly fix_example?: string;
  readonly suggested_skill?: string;
  readonly scaffold_command?: string;
  readonly template_path?: string;
  readonly remediation_type?: RemediationType;
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
  /** WI-335: suggestion の修復方式分類。未設定（null）は 'manual' 扱い（後方互換）。 */
  readonly remediationType?: RemediationType | null;
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
  readonly remediationType: RemediationType | null;

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
    this.remediationType = props.remediationType ?? null;
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
      this.templatePath === other.templatePath &&
      this.remediationType === other.remediationType
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

  /**
   * WI-335: 実効修復方式。未分類は安全側の 'manual' 扱い（機械適用可能と過剰宣言しない）。
   */
  effectiveRemediationType(): RemediationType {
    return this.remediationType ?? DEFAULT_REMEDIATION_TYPE;
  }

  /**
   * WI-335: suggestion を機械適用すれば必ず解消すると宣言されたエラーか。
   * true のエラーは remediation-round-trip テストで「案内 → 機械適用 → 再実行 → pass」が保証される。
   */
  isMechanicallyRemediable(): boolean {
    return this.effectiveRemediationType() === "mechanical";
  }

  toContract(): Readonly<HarnessErrorContract> {
    const contract: HarnessErrorContract = {
      code: this.code.toString(),
      severity: this.severity.value,
      message: this.message,
      suggestion: this.suggestion,
      ...(this.adrRef !== null ? { adr_ref: this.adrRef.toString() } : {}),
      ...(this.fixExample !== null ? { fix_example: this.fixExample.toString() } : {}),
      ...(this.suggestedSkill !== null ? { suggested_skill: this.suggestedSkill } : {}),
      ...(this.scaffoldCommand !== null ? { scaffold_command: this.scaffoldCommand } : {}),
      ...(this.templatePath !== null ? { template_path: this.templatePath } : {}),
      ...(this.remediationType !== null ? { remediation_type: this.remediationType } : {}),
    };
    return Object.freeze(contract);
  }
}
