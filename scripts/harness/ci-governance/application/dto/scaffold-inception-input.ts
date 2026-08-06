// @unit ci-governance
// @layer application
// @work-item-id WI-368

export interface ScaffoldInceptionInput {
  readonly kind: string;
  readonly dryRun?: boolean;
  readonly force?: boolean;
}
