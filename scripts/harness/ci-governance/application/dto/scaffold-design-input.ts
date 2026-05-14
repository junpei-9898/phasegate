// @unit ci-governance
// @layer application
// @work-item-id WI-189

export interface ScaffoldDesignInput {
  readonly unit: string;
  readonly phase: string;
  readonly dryRun?: boolean;
  readonly force?: boolean;
}
