// @unit ci-governance
// @layer domain

import type { IntegrityManifest } from "../value-objects/integrity-manifest.js";

/**
 * phasegate.integrity.json の読み書きポート。
 */
export interface IntegrityManifestRepositoryPort {
  getPath(): string;
  exists(): Promise<boolean>;
  load(): Promise<IntegrityManifest | null>;
  save(manifest: IntegrityManifest): Promise<string>;
}
