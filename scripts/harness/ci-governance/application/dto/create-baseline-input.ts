// @unit ci-governance
// @layer application

export interface CreateBaselineInput {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly dryRun?: boolean;
  readonly force?: boolean;
}
