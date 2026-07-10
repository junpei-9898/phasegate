// @unit ci-governance
// @layer application

export interface PinIntegrityOutput {
  readonly savedPath: string;
  readonly entryCount: number;
  readonly dryRun: boolean;
  readonly files: ReadonlyArray<{ readonly path: string; readonly digest: string }>;
}
