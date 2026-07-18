// @unit harness-error
// @layer application

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
  /** WI-335: 修復方式分類（mechanical / ai-assisted / manual）。未設定は manual 扱い。 */
  readonly remediation_type?: "mechanical" | "ai-assisted" | "manual";
}
