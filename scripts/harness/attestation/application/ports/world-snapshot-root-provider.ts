// @unit attestation
// @layer application
// @work-item-id WI-306

/**
 * attestationが所有するconsumer port。providerのWorld domain型を公開しない。
 */
export interface WorldSnapshotRootProvider {
  getWorldSnapshotRoot(): Promise<string>;
}
