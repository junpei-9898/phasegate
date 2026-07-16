// @unit world-model
// @layer application
// @work-item-id WI-295

export interface ObligationReportWriterPort {
  write(bytes: Uint8Array): Promise<void>;
}
