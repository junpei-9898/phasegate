// @unit ci-governance
// @layer application

export interface ScaffoldDesignOutput {
  readonly targetPath: string;
  readonly templatePath: string;
  readonly unit: string;
  readonly phase: string;
  readonly written: boolean;
  readonly alreadyExists: boolean;
  readonly overwritten: boolean;
}
