// @unit ci-governance
// @layer application
// @work-item-id WI-368

export interface ScaffoldInceptionOutput {
  readonly targetPath: string;
  readonly templatePath: string;
  readonly kind: string;
  readonly dryRun: boolean;
  readonly written: boolean;
  readonly alreadyExists: boolean;
  readonly overwritten: boolean;
}
