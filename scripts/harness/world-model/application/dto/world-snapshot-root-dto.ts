// @unit world-model
// @layer application
// @work-item-id WI-306

export interface WorldSnapshotRootDto {
  readonly schemaVersion: "phasegate-world-snapshot-root/v1";
  readonly worldSnapshotRoot: string;
}
