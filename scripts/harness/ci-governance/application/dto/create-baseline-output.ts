// @unit ci-governance
// @layer application

export interface CreateBaselineOutputFile {
  readonly path: string;
  readonly sha1: string;
}

export interface CreateBaselineOutput {
  readonly savedPath: string;
  readonly entryCount: number;
  readonly dryRun: boolean;
  readonly overwriteBlocked: boolean;
  readonly files: readonly CreateBaselineOutputFile[];
}
