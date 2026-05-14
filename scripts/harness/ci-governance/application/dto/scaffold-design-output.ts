// @unit ci-governance
// @layer application
// @work-item-id WI-189

export interface ScaffoldDesignOutput {
  readonly targetPath: string;
  readonly templatePath: string;
  readonly unit: string;
  readonly phase: string;
  readonly dryRun: boolean;
  readonly written: boolean;
  readonly alreadyExists: boolean;
  readonly overwritten: boolean;
}
