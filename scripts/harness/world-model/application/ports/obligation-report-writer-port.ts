// @unit world-model
// @layer application
// @work-item-id WI-295, WI-296

export interface ObligationReportWriterPort {
  write(bytes: Uint8Array, reportPath?: string): Promise<void>;
}
