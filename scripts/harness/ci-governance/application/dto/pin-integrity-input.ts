// @unit ci-governance
// @layer application

export interface PinIntegrityInput {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly dryRun?: boolean;
}
